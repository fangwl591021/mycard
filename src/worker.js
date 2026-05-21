const TEXT_ENCODER = new TextEncoder();
const CARD_REWARD_POINTS = 10;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      if (url.pathname === "/api/health") {
        return json({
          ok: true,
          service: "mycard",
          storage: "wasabi-json",
          cloudflare_storage: { kv: false, d1: false, r2: false },
          liff_id: env.LIFF_ID || null
        });
      }

      if (url.pathname === "/api/config") {
        return json({
          app: "名片王",
          liff_id: env.LIFF_ID || "1660923784-EcoH8aMs",
          liff_url: env.LIFF_URL || "https://liff.line.me/1660923784-EcoH8aMs",
          plans: ["free", "PRO", "enterprise"],
          roles: ["admin", "rent_owner", "rent_admin", "rent_member", "user"],
          card_upload_reward_points: CARD_REWARD_POINTS,
          storage_note: "資料以 Wasabi JSON / 圖片保存；Worker 不使用 KV、D1、R2。"
        });
      }

      if (url.pathname.startsWith("/r/") && request.method === "GET") {
        return handleReferralLanding(request, env);
      }

      if (url.pathname.startsWith("/card/") && request.method === "GET") {
        return handlePublicCard(request, env);
      }

      if (url.pathname === "/api/auth/line" && request.method === "POST") {
        return handleLineAuth(request, env);
      }

      if (url.pathname === "/api/me" && request.method === "GET") {
        const user = await requireUser(request, env);
        const profile = await getJson(env, userPath(user.user_id, "profile.json"));
        const balance = await getJson(env, userPath(user.user_id, "points/balance.json"));
        return json({ ok: true, user: profile || user, points: balance || defaultBalance(user.user_id) });
      }

      if (url.pathname === "/api/cards" && request.method === "GET") {
        return handleListCards(request, env);
      }

      if (url.pathname === "/api/cards" && request.method === "POST") {
        return handleUpsertManualCard(request, env);
      }

      const cardRoute = url.pathname.match(/^\/api\/cards\/([^/]+)$/);
      if (cardRoute && request.method === "PUT") {
        return handleUpsertManualCard(request, env, cardRoute[1]);
      }

      if (cardRoute && request.method === "DELETE") {
        return handleDeleteCard(request, env, cardRoute[1]);
      }

      const publishRoute = url.pathname.match(/^\/api\/cards\/([^/]+)\/publish$/);
      if (publishRoute && request.method === "POST") {
        return handlePublishCard(request, env, publishRoute[1]);
      }

      if (url.pathname === "/api/cards/scan" && request.method === "POST") {
        return handleCardScan(request, env);
      }

      if (url.pathname === "/api/rents" && request.method === "GET") {
        return handleListRents(request, env);
      }

      if (url.pathname === "/api/rents" && request.method === "POST") {
        return handleCreateRentDraft(request, env);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ ok: false, code: error.code, message: error.message }, { status: error.status });
      }
      return json({
        ok: false,
        code: "internal_error",
        message: error?.message || "Unexpected error"
      }, { status: 500 });
    }
  }
};

async function handleLineAuth(request, env) {
  const body = await request.json().catch(() => ({}));
  if (!body.idToken) throw new HttpError(400, "missing_id_token", "缺少 LIFF idToken");

  const user = await verifyLineIdToken(body.idToken, env);
  const referralCode = sanitizeRefCode(body.refCode || readCookie(request, "mycard_ref") || "");
  const referral = referralCode ? await getReferralOwner(env, referralCode) : null;
  const profileKey = userPath(user.user_id, "profile.json");
  const existing = await getJson(env, profileKey);
  const now = new Date().toISOString();
  const refCode = existing?.ref_code || createRefCode(user.user_id);
  const referredBy = existing?.referred_by_user_id ? {
    referred_by_user_id: existing.referred_by_user_id,
    referred_by_code: existing.referred_by_code,
    referred_at: existing.referred_at
  } : buildReferralFields(user.user_id, referral, now);
  const profile = {
    user_id: user.user_id,
    login_provider: "line",
    line_user_id: user.line_user_id,
    line_display_name: user.name,
    line_picture_url: user.picture_url,
    name: existing?.name || user.name,
    ref_code: refCode,
    referral_url: `${appBaseUrl(env)}/r/${refCode}`,
    ...referredBy,
    plan: existing?.plan || "free",
    created_at: existing?.created_at || now,
    updated_at: now
  };

  await putJson(env, profileKey, profile);
  await putJson(env, referralCodePath(refCode), {
    ref_code: refCode,
    owner_user_id: user.user_id,
    status: "active",
    created_at: existing?.created_at || now,
    updated_at: now
  });
  await ensureJson(env, userPath(user.user_id, "indexes/card-fingerprints.json"), { fingerprints: {} });
  await ensureJson(env, userPath(user.user_id, "indexes/cards.json"), { cards: [] });
  await ensureJson(env, userPath(user.user_id, "indexes/rents.json"), { rents: [] });
  await ensureJson(env, userPath(user.user_id, "points/balance.json"), defaultBalance(user.user_id));

  return json({ ok: true, user: profile });
}

function handleReferralLanding(request, env) {
  const url = new URL(request.url);
  const refCode = sanitizeRefCode(url.pathname.replace(/^\/r\//, ""));
  if (!refCode) throw new HttpError(404, "referral_not_found", "推廣連結不存在");
  const target = env.LIFF_URL || "https://liff.line.me/1660923784-EcoH8aMs";
  return new Response(null, {
    status: 302,
    headers: {
      location: target,
      "set-cookie": [
        `mycard_ref=${refCode}`,
        "Path=/",
        "Max-Age=2592000",
        "SameSite=Lax",
        "Secure",
        "HttpOnly"
      ].join("; ")
    }
  });
}

async function getReferralOwner(env, refCode) {
  const code = await getJson(env, referralCodePath(refCode));
  if (!code || code.status !== "active") return null;
  return code;
}

function buildReferralFields(currentUserId, referral, now) {
  if (!referral || referral.owner_user_id === currentUserId) return {};
  return {
    referred_by_user_id: referral.owner_user_id,
    referred_by_code: referral.ref_code,
    referred_at: now
  };
}

async function handleListCards(request, env) {
  const user = await requireUser(request, env);
  const index = await getJson(env, userPath(user.user_id, "indexes/cards.json")) || { cards: [] };
  const cards = [];
  for (const item of index.cards || []) {
    const card = await getJson(env, userPath(user.user_id, `cards/${sanitizeId(item.card_id)}.json`));
    if (card) cards.push(card);
  }
  return json({ ok: true, cards, index });
}

async function handleUpsertManualCard(request, env, routeCardId = "") {
  const user = await requireUser(request, env);
  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();
  const cardId = sanitizeId(routeCardId || body.card_id || `card_${Date.now()}_${randomString(8)}`);
  const existing = await getJson(env, userPath(user.user_id, `cards/${cardId}.json`));
  const card = {
    ...(existing || {}),
    card_id: cardId,
    owner_user_id: user.user_id,
    visibility: existing?.visibility || body.visibility || "private",
    public_slug: existing?.public_slug || body.public_slug || "",
    source: existing?.source || "manual",
    fields: normalizeManualFields(body.fields || body),
    reward_status: existing?.reward_status || "not_eligible",
    reward_points: existing?.reward_points || 0,
    created_at: existing?.created_at || now,
    updated_at: now
  };

  await putJson(env, userPath(user.user_id, `cards/${cardId}.json`), card);
  await upsertCardIndex(env, user.user_id, card);
  if (card.visibility === "public" && card.public_slug) {
    await putJson(env, publicCardPath(card.public_slug), buildPublicCard(card));
  }
  return json({ ok: true, card });
}

async function handleDeleteCard(request, env, cardId) {
  const user = await requireUser(request, env);
  const safeCardId = sanitizeId(cardId);
  const cardKey = userPath(user.user_id, `cards/${safeCardId}.json`);
  const card = await getJson(env, cardKey);
  if (!card) throw new HttpError(404, "card_not_found", "找不到名片");
  if (card.public_slug) {
    await deleteObject(env, publicCardPath(card.public_slug));
  }
  await deleteObject(env, cardKey);
  await removeCardFromIndex(env, user.user_id, safeCardId);
  return json({ ok: true, code: "card_deleted", card_id: safeCardId });
}

async function handlePublishCard(request, env, cardId) {
  const user = await requireUser(request, env);
  const body = await request.json().catch(() => ({}));
  const safeCardId = sanitizeId(cardId);
  const cardKey = userPath(user.user_id, `cards/${safeCardId}.json`);
  const card = await getJson(env, cardKey);
  if (!card) throw new HttpError(404, "card_not_found", "找不到名片");
  const publish = body.publish !== false;
  const oldSlug = card.public_slug;
  if (!publish) {
    if (oldSlug) await deleteObject(env, publicCardPath(oldSlug));
    card.visibility = "private";
    card.public_slug = "";
  } else {
    const slug = sanitizeSlug(body.slug || oldSlug || `${slugify(card.fields?.name || "card")}-${safeCardId.slice(-6)}`);
    card.visibility = "public";
    card.public_slug = slug;
    await putJson(env, publicCardPath(slug), buildPublicCard(card));
  }
  card.updated_at = new Date().toISOString();
  await putJson(env, cardKey, card);
  await upsertCardIndex(env, user.user_id, card);
  return json({
    ok: true,
    card,
    public_url: card.public_slug ? `${appBaseUrl(env)}/card/${card.public_slug}` : ""
  });
}

async function handlePublicCard(request, env) {
  const url = new URL(request.url);
  const slug = sanitizeSlug(url.pathname.replace(/^\/card\//, ""));
  if (!slug) throw new HttpError(404, "public_card_not_found", "公開名片不存在");
  const card = await getJson(env, publicCardPath(slug));
  if (!card) throw new HttpError(404, "public_card_not_found", "公開名片不存在");
  return new Response(renderPublicCardHtml(card), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120"
    }
  });
}

async function handleListRents(request, env) {
  const user = await requireUser(request, env);
  const index = await getJson(env, userPath(user.user_id, "indexes/rents.json")) || { rents: [] };
  const rents = [];
  for (const item of index.rents || []) {
    const rent = await getJson(env, rentPath(item.rent_id, "profile.json"));
    if (rent) rents.push(rent);
  }
  return json({ ok: true, rents, index });
}

async function handleCreateRentDraft(request, env) {
  const user = await requireUser(request, env);
  const body = await request.json().catch(() => ({}));
  const type = body.type === "organization" ? "organization" : "personal";
  const plan = body.plan === "enterprise" ? "enterprise" : "PRO";
  if (plan === "enterprise" && type !== "organization") {
    throw new HttpError(400, "invalid_rent_type", "enterprise 必須建立 organization rent");
  }
  const now = new Date().toISOString();
  const rentId = `rent_${Date.now()}_${randomString(8)}`;
  const displayName = cleanText(body.display_name) || (type === "personal" ? "個人 PRO 空間" : "企業團隊空間");
  const rent = {
    rent_id: rentId,
    type,
    plan,
    status: "pending_payment",
    owner_user_id: user.user_id,
    display_name: displayName,
    created_at: now,
    updated_at: now
  };

  await putJson(env, rentPath(rentId, "profile.json"), rent);
  await putJson(env, rentPath(rentId, `members/${sanitizeId(user.user_id)}.json`), {
    rent_id: rentId,
    user_id: user.user_id,
    rent_role: "owner",
    status: "pending_payment",
    created_at: now,
    updated_at: now
  });
  await ensureJson(env, rentPath(rentId, "indexes/cards.json"), { cards: [] });
  await upsertUserRentIndex(env, user.user_id, rent);

  return json({ ok: true, rent });
}

async function handleCardScan(request, env) {
  const user = await requireUser(request, env);
  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File)) throw new HttpError(400, "missing_image", "請上傳名片圖片");
  if (!image.type.startsWith("image/")) throw new HttpError(400, "invalid_file_type", "只接受圖片檔");
  if (image.size > MAX_IMAGE_BYTES) throw new HttpError(400, "file_too_large", "圖片大小不可超過 8MB");

  const now = new Date();
  const ids = createIds();
  const ext = extensionFromType(image.type);
  const imageKey = userPath(
    user.user_id,
    `images/business-cards/${now.getUTCFullYear()}/${pad2(now.getUTCMonth() + 1)}/img-${ids.short}.${ext}`
  );
  const jobKey = userPath(user.user_id, `ocr-jobs/${ids.job_id}.json`);
  const imageBytes = await image.arrayBuffer();
  const parsed = await recognizeBusinessCard(env, imageBytes, image.type);
  const fingerprint = createCardFingerprint(parsed);
  if (!fingerprint) {
    throw new HttpError(422, "ocr_not_enough_fields", "OCR 欄位不足，請手動補齊姓名、電話或 Email");
  }

  const indexKey = userPath(user.user_id, "indexes/card-fingerprints.json");
  const index = await getJson(env, indexKey) || { fingerprints: {} };
  const duplicate = index.fingerprints?.[fingerprint];
  if (duplicate) {
    return json({
      ok: false,
      code: "duplicate_card",
      message: "這張名片已存在，未建立新資料，也未贈送點數。",
      existing_card_id: duplicate.card_id,
      parsed_json: normalizeParsedCard(parsed)
    }, { status: 409 });
  }

  const cardId = ids.card_id;
  const cardKey = userPath(user.user_id, `cards/${cardId}.json`);
  await putObject(env, imageKey, imageBytes, image.type);
  const card = {
    card_id: cardId,
    owner_user_id: user.user_id,
    visibility: "private",
    source: "ocr",
    source_image_key: imageKey,
    source_ocr_job_id: ids.job_id,
    card_fingerprint: fingerprint,
    reward_status: "granted",
    reward_points: CARD_REWARD_POINTS,
    fields: normalizeParsedCard(parsed),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await putJson(env, cardKey, card);
  await upsertCardIndex(env, user.user_id, card);
  index.fingerprints = index.fingerprints || {};
  index.fingerprints[fingerprint] = {
    card_id: cardId,
    name: card.fields.name || "",
    company: card.fields.company || "",
    created_at: card.created_at
  };
  await putJson(env, indexKey, index);
  await grantPoints(env, user.user_id, CARD_REWARD_POINTS, cardId);

  const completedJob = {
    job_id: ids.job_id,
    user_id: user.user_id,
    status: "applied",
    source_image_key: imageKey,
    card_id: cardId,
    card_fingerprint: fingerprint,
    parsed_json: parsed,
    completed_at: new Date().toISOString()
  };
  await putJson(env, jobKey, completedJob);

  return json({
    ok: true,
    code: "card_created",
    card,
    points_awarded: CARD_REWARD_POINTS,
    ocr_job: completedJob
  });
}

async function upsertCardIndex(env, userId, card) {
  const key = userPath(userId, "indexes/cards.json");
  const index = await getJson(env, key) || { cards: [] };
  const summary = {
    card_id: card.card_id,
    name: card.fields.name || "",
    company: card.fields.company || "",
    visibility: card.visibility,
    public_slug: card.public_slug || "",
    created_at: card.created_at,
    updated_at: card.updated_at
  };
  index.cards = [summary, ...(index.cards || []).filter((item) => item.card_id !== card.card_id)];
  await putJson(env, key, index);
  return index;
}

async function removeCardFromIndex(env, userId, cardId) {
  const key = userPath(userId, "indexes/cards.json");
  const index = await getJson(env, key) || { cards: [] };
  index.cards = (index.cards || []).filter((item) => item.card_id !== cardId);
  await putJson(env, key, index);
}

async function upsertUserRentIndex(env, userId, rent) {
  const key = userPath(userId, "indexes/rents.json");
  const index = await getJson(env, key) || { rents: [] };
  const summary = {
    rent_id: rent.rent_id,
    type: rent.type,
    plan: rent.plan,
    status: rent.status,
    display_name: rent.display_name,
    updated_at: rent.updated_at
  };
  index.rents = [summary, ...(index.rents || []).filter((item) => item.rent_id !== rent.rent_id)];
  await putJson(env, key, index);
  return index;
}

async function requireUser(request, env) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "unauthorized", "請先透過 LIFF 登入");
  return verifyLineIdToken(token, env);
}

async function verifyLineIdToken(idToken, env) {
  const clientId = env.LINE_LOGIN_CHANNEL_ID || (env.LIFF_ID || "").split("-")[0];
  if (!clientId) throw new HttpError(500, "missing_line_channel_id", "Worker 缺少 LINE_LOGIN_CHANNEL_ID 或 LIFF_ID");

  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: clientId })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(401, "line_token_invalid", payload.error_description || "LINE idToken 驗證失敗");
  }

  return {
    user_id: `line_${sanitizeId(payload.sub)}`,
    line_user_id: payload.sub,
    name: payload.name || "LINE 使用者",
    picture_url: payload.picture || ""
  };
}

async function recognizeBusinessCard(env, bytes, contentType) {
  if (!env.OPENAI_API_KEY) throw new HttpError(500, "missing_openai_api_key", "Worker 缺少 OPENAI_API_KEY");

  const imageBase64 = arrayBufferToBase64(bytes);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_OCR_MODEL || "gpt-4.1-mini",
      input: [{
        role: "user",
        content: [
          {
            type: "input_text",
            text: "請辨識這張紙本名片，僅回傳 JSON。欄位包含 name,title,company,phone,email,line_id,website,address,raw_text。無法辨識的欄位用空字串。"
          },
          {
            type: "input_image",
            image_url: `data:${contentType};base64,${imageBase64}`
          }
        ]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "business_card_ocr",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              title: { type: "string" },
              company: { type: "string" },
              phone: { type: "string" },
              email: { type: "string" },
              line_id: { type: "string" },
              website: { type: "string" },
              address: { type: "string" },
              raw_text: { type: "string" }
            },
            required: ["name", "title", "company", "phone", "email", "line_id", "website", "address", "raw_text"]
          }
        }
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, "openai_ocr_failed", data.error?.message || "GPT OCR 呼叫失敗");
  }
  const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
  if (!outputText) throw new HttpError(502, "openai_empty_output", "GPT OCR 沒有回傳可解析內容");
  return JSON.parse(outputText);
}

async function grantPoints(env, userId, points, cardId) {
  const now = new Date();
  const eventId = `pt_${now.getTime()}_${randomString(6)}`;
  const ledgerKey = userPath(userId, `points/ledger/${now.getUTCFullYear()}/${pad2(now.getUTCMonth() + 1)}/${eventId}.json`);
  const balanceKey = userPath(userId, "points/balance.json");
  const balance = await getJson(env, balanceKey) || defaultBalance(userId);

  await putJson(env, ledgerKey, {
    event_id: eventId,
    user_id: userId,
    type: "card_upload_reward",
    points,
    source_card_id: cardId,
    created_at: now.toISOString()
  });

  balance.balance = Number(balance.balance || 0) + points;
  balance.lifetime_earned = Number(balance.lifetime_earned || 0) + points;
  balance.updated_at = now.toISOString();
  await putJson(env, balanceKey, balance);
}

function normalizeParsedCard(parsed) {
  return {
    name: cleanText(parsed.name),
    title: cleanText(parsed.title),
    company: cleanText(parsed.company),
    phone: cleanText(parsed.phone),
    email: cleanText(parsed.email).toLowerCase(),
    line_id: cleanText(parsed.line_id),
    website: cleanText(parsed.website),
    address: cleanText(parsed.address),
    raw_text: cleanText(parsed.raw_text)
  };
}

function normalizeManualFields(fields) {
  return {
    name: cleanText(fields.name),
    title: cleanText(fields.title),
    company: cleanText(fields.company),
    phone: cleanText(fields.phone),
    email: cleanText(fields.email).toLowerCase(),
    line_id: cleanText(fields.line_id || fields.social),
    website: cleanText(fields.website),
    address: cleanText(fields.address),
    raw_text: cleanText(fields.raw_text || fields.bio)
  };
}

function buildPublicCard(card) {
  return {
    card_id: card.card_id,
    public_slug: card.public_slug,
    fields: card.fields,
    published_at: new Date().toISOString(),
    updated_at: card.updated_at
  };
}

function renderPublicCardHtml(card) {
  const fields = card.fields || {};
  const name = escapeHtml(fields.name || "未命名");
  const title = escapeHtml(fields.title || "");
  const company = escapeHtml(fields.company || "");
  const phone = escapeHtml(fields.phone || "");
  const email = escapeHtml(fields.email || "");
  const lineId = escapeHtml(fields.line_id || "");
  const bio = escapeHtml(fields.raw_text || "");
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${name}｜名片王</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f7f4;font-family:"Segoe UI","Microsoft JhengHei",Arial,sans-serif;color:#14211e;padding:20px}
    .card{width:min(420px,100%);min-height:560px;border-radius:28px;padding:30px;background:linear-gradient(160deg,#e9f4eb 0%,#fff 52%,#d5efe6 100%);box-shadow:0 18px 45px rgba(33,48,42,.14);display:flex;flex-direction:column;justify-content:space-between}
    .avatar{width:68px;height:68px;border-radius:18px;background:#1d7a5f;color:#fff;display:grid;place-items:center;font-size:32px;font-weight:800}
    h1{font-size:34px;margin:28px 0 8px}.role{color:#60706a;margin:0 0 20px;line-height:1.6}.bio{line-height:1.7;white-space:pre-wrap}.links{display:grid;gap:10px}.links a{min-height:44px;border-radius:8px;background:rgba(29,122,95,.1);display:grid;place-items:center;color:#145f4a;text-decoration:none;font-weight:700}.brand{color:#60706a;font-size:13px;text-align:center;margin-top:20px}
  </style>
</head>
<body>
  <main>
    <article class="card">
      <div>
        <div class="avatar">${name.slice(0, 1)}</div>
        <h1>${name}</h1>
        <p class="role">${title}${title && company ? " · " : ""}${company}</p>
        <p class="bio">${bio}</p>
      </div>
      <div class="links">
        ${phone ? `<a href="tel:${phone}">撥打電話</a>` : ""}
        ${email ? `<a href="mailto:${email}">寄送 Email</a>` : ""}
        ${lineId ? `<a href="https://line.me/R/ti/p/${encodeURIComponent(lineId)}">加入 LINE</a>` : ""}
      </div>
    </article>
    <p class="brand">名片王 MyCard</p>
  </main>
</body>
</html>`;
}

function createCardFingerprint(parsed) {
  const card = normalizeParsedCard(parsed);
  const important = [
    normalizeForFingerprint(card.name),
    normalizeForFingerprint(card.company),
    normalizePhone(card.phone),
    card.email
  ];
  if (!card.email && !normalizePhone(card.phone)) return "";
  return `fp_${simpleHash(important.join("|"))}`;
}

function normalizeForFingerprint(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, "");
}

function normalizePhone(value) {
  return cleanText(value).replace(/[^\d+]/g, "");
}

function cleanText(value) {
  return String(value || "").trim();
}

async function getJson(env, key) {
  const response = await getObject(env, key);
  if (response.status === 404) return null;
  if (!response.ok) throw await wasabiError(response, "wasabi_get_failed");
  return response.json();
}

async function ensureJson(env, key, value) {
  const existing = await getJson(env, key);
  if (existing) return existing;
  await putJson(env, key, value);
  return value;
}

function putJson(env, key, value) {
  return putObject(env, key, JSON.stringify(value, null, 2), "application/json; charset=utf-8");
}

async function getObject(env, key) {
  return signedWasabiFetch(env, "GET", key);
}

async function putObject(env, key, body, contentType) {
  const response = await signedWasabiFetch(env, "PUT", key, body, contentType);
  if (!response.ok) throw await wasabiError(response, "wasabi_put_failed");
  return response;
}

async function deleteObject(env, key) {
  const response = await signedWasabiFetch(env, "DELETE", key);
  if (!response.ok && response.status !== 404) throw await wasabiError(response, "wasabi_delete_failed");
  return response;
}

async function signedWasabiFetch(env, method, key, body, contentType = "") {
  const config = wasabiConfig(env);
  const url = new URL(`${config.endpoint.replace(/\/$/, "")}/${config.bucket}/${encodeS3Key(key)}`);
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const bodyHash = await sha256Hex(body || "");
  const headers = {
    host: url.host,
    "x-amz-content-sha256": bodyHash,
    "x-amz-date": amzDate
  };
  if (contentType) headers["content-type"] = contentType;

  const signedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderKeys.map((name) => `${name}:${headers[name]}\n`).join("");
  const signedHeaders = signedHeaderKeys.join(";");
  const canonicalRequest = [
    method,
    url.pathname,
    url.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    bodyHash
  ].join("\n");
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join("\n");
  const signingKey = await getSignatureKey(config.secretAccessKey, dateStamp, config.region, "s3");
  const signature = await hmacHex(signingKey, stringToSign);
  headers.authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(", ");

  return fetch(url.toString(), { method, headers, body: method === "GET" ? undefined : body });
}

function wasabiConfig(env) {
  const required = ["WASABI_BUCKET", "WASABI_REGION", "WASABI_ENDPOINT", "WASABI_ACCESS_KEY_ID", "WASABI_SECRET_ACCESS_KEY"];
  for (const name of required) {
    if (!env[name]) throw new HttpError(500, "missing_wasabi_config", `Worker 缺少 ${name}`);
  }
  return {
    bucket: env.WASABI_BUCKET,
    region: env.WASABI_REGION,
    endpoint: env.WASABI_ENDPOINT,
    accessKeyId: env.WASABI_ACCESS_KEY_ID,
    secretAccessKey: env.WASABI_SECRET_ACCESS_KEY
  };
}

async function wasabiError(response, code) {
  const message = await response.text().catch(() => "");
  return new HttpError(response.status, code, message || `Wasabi request failed: ${response.status}`);
}

function userPath(userId, path) {
  return `users/${sanitizeId(userId)}/${path.replace(/^\/+/, "")}`;
}

function rentPath(rentId, path) {
  return `rents/${sanitizeId(rentId)}/${path.replace(/^\/+/, "")}`;
}

function referralCodePath(refCode) {
  return `referrals/codes/${sanitizeRefCode(refCode)}.json`;
}

function publicCardPath(slug) {
  return `public/cards/${sanitizeSlug(slug)}.json`;
}

function sanitizeRefCode(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
}

function sanitizeSlug(value) {
  return String(value || "").trim().toLowerCase().replace(/[^\w\u4e00-\u9fa5-]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function slugify(value) {
  return sanitizeSlug(value) || "card";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function appBaseUrl(env) {
  return (env.APP_BASE_URL || "https://myvard.fangwl591021.workers.dev").replace(/\/$/, "");
}

function readCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}

function defaultBalance(userId) {
  return { user_id: userId, balance: 0, lifetime_earned: 0, lifetime_spent: 0, updated_at: null };
}

function createIds() {
  const stamp = Date.now();
  const short = `${stamp}-${randomString(8)}`;
  return {
    short,
    job_id: `job_${short}`,
    card_id: `card_${short}`
  };
}

function createRefCode(userId) {
  return simpleHash(userId).slice(0, 10).toUpperCase();
}

function extensionFromType(type) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function sanitizeId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function randomString(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join("");
}

function simpleHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function encodeS3Key(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

async function sha256Hex(value) {
  const bytes = typeof value === "string" ? TEXT_ENCODER.encode(value) : value;
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return hex(hash);
}

async function hmac(key, value) {
  return crypto.subtle.sign("HMAC", key, TEXT_ENCODER.encode(value));
}

async function hmacHex(key, value) {
  return hex(await hmac(key, value));
}

async function getSignatureKey(secret, dateStamp, region, service) {
  const kDate = await importHmacKey(`AWS4${secret}`).then((key) => hmac(key, dateStamp)).then(importRawHmacKey);
  const kRegion = await hmac(kDate, region).then(importRawHmacKey);
  const kService = await hmac(kRegion, service).then(importRawHmacKey);
  return hmac(kService, "aws4_request").then(importRawHmacKey);
}

function importHmacKey(secret) {
  return importRawHmacKey(TEXT_ENCODER.encode(secret));
}

function importRawHmacKey(bytes) {
  return crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function hex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      ...corsHeaders(),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {})
    }
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type"
  };
}

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
