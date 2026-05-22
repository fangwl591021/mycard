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

      if (url.pathname === "/api/admin/import/line-users" && request.method === "POST") {
        return await handleImportLineUsers(request, env);
      }

      if (url.pathname === "/api/admin/import/line-cards" && request.method === "POST") {
        return await handleImportLineCards(request, env);
      }

      if (url.pathname === "/api/admin/import/status" && request.method === "GET") {
        return await handleImportStatus(request, env);
      }

      if (url.pathname === "/api/admin/import/users" && request.method === "GET") {
        return await handleImportUsers(request, env);
      }

      if (url.pathname === "/api/admin/import/owner" && request.method === "GET") {
        return await handleImportOwner(request, env);
      }

      if (url.pathname.startsWith("/r/") && request.method === "GET") {
        return handleReferralLanding(request, env);
      }

      if (url.pathname.startsWith("/card/") && request.method === "GET") {
        return handlePublicCard(request, env);
      }

      if (url.pathname === "/api/auth/line" && request.method === "POST") {
        return await handleLineAuth(request, env);
      }

      if (url.pathname === "/api/me" && request.method === "GET") {
        const user = await requireUser(request, env);
        const profile = await getJson(env, userPath(user.user_id, "profile.json"));
        const balance = await getJson(env, userPath(user.user_id, "points/balance.json"));
        return json({ ok: true, user: profile || user, points: balance || defaultBalance(user.user_id) });
      }

      if (url.pathname === "/api/cards" && request.method === "GET") {
        return await handleListCards(request, env);
      }

      if (url.pathname === "/api/cards" && request.method === "POST") {
        return await handleUpsertManualCard(request, env);
      }

      const cardRoute = url.pathname.match(/^\/api\/cards\/([^/]+)$/);
      if (cardRoute && request.method === "PUT") {
        return await handleUpsertManualCard(request, env, cardRoute[1]);
      }

      if (cardRoute && request.method === "DELETE") {
        return await handleDeleteCard(request, env, cardRoute[1]);
      }

      const publishRoute = url.pathname.match(/^\/api\/cards\/([^/]+)\/publish$/);
      if (publishRoute && request.method === "POST") {
        return await handlePublishCard(request, env, publishRoute[1]);
      }

      if (url.pathname === "/api/cards/scan" && request.method === "POST") {
        return await handleCardScan(request, env);
      }

      if (url.pathname === "/api/rents" && request.method === "GET") {
        return await handleListRents(request, env);
      }

      if (url.pathname === "/api/rents" && request.method === "POST") {
        return await handleCreateRentDraft(request, env);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      if (error && typeof error.status === "number") {
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
    ...(existing || {}),
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

async function handleImportLineUsers(request, env) {
  const token = request.headers.get("x-admin-migration-token") || "";
  if (!env.MIGRATION_ADMIN_TOKEN) {
    throw new HttpError(503, "migration_disabled", "MIGRATION_ADMIN_TOKEN is not configured");
  }
  if (!token || token !== env.MIGRATION_ADMIN_TOKEN) {
    throw new HttpError(401, "migration_unauthorized", "Invalid migration token");
  }

  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.users) ? body.users : [];
  if (!rows.length) throw new HttpError(400, "missing_users", "users must be a non-empty array");
  if (rows.length > 500) throw new HttpError(400, "too_many_users", "import at most 500 users per request");

  const now = new Date().toISOString();
  const imported = [];
  const skipped = [];

  for (const row of rows) {
    const legacy = normalizeLegacyLineUser(row);
    if (!legacy.line_user_id) {
      skipped.push({ legacy_row_id: legacy.legacy_row_id, reason: "missing_line_user_id" });
      continue;
    }

    const userId = `line_${sanitizeId(legacy.line_user_id)}`;
    const profileKey = userPath(userId, "profile.json");
    const existing = await getJson(env, profileKey);
    const refCode = existing?.ref_code || createRefCode(userId);
    const profile = {
      ...(existing || {}),
      user_id: userId,
      login_provider: existing?.login_provider || "line",
      line_user_id: legacy.line_user_id,
      line_display_name: existing?.line_display_name || legacy.name,
      name: existing?.name || legacy.name || legacy.line_user_id,
      phone: existing?.phone || legacy.phone,
      industry: existing?.industry || legacy.industry,
      plan: existing?.plan || "free",
      roles: existing?.roles || ["user"],
      ref_code: refCode,
      referral_url: `${appBaseUrl(env)}/r/${refCode}`,
      referred_by_user_id: existing?.referred_by_user_id || legacy.referrer_user_id,
      referred_by_code: existing?.referred_by_code || "",
      source: existing?.source || "line_engine_migration",
      legacy: {
        ...(existing?.legacy || {}),
        line_engine: legacy
      },
      migrated_at: existing?.migrated_at || now,
      created_at: existing?.created_at || legacy.created_at || now,
      updated_at: now
    };

    await putJson(env, profileKey, profile);
    await putJson(env, referralCodePath(refCode), {
      ref_code: refCode,
      owner_user_id: userId,
      status: "active",
      created_at: existing?.created_at || legacy.created_at || now,
      updated_at: now
    });
    await ensureJson(env, userPath(userId, "indexes/card-fingerprints.json"), { fingerprints: {} });
    await ensureJson(env, userPath(userId, "indexes/cards.json"), { cards: [] });
    await ensureJson(env, userPath(userId, "indexes/rents.json"), { rents: [] });
    await ensureJson(env, userPath(userId, "points/balance.json"), defaultBalance(userId));
    const profileCard = buildLegacyUserProfileCard(userId, legacy, now);
    await putJson(env, userPath(userId, `cards/${profileCard.card_id}.json`), profileCard);
    await upsertCardIndex(env, userId, profileCard);

    imported.push({
      user_id: userId,
      line_user_id: legacy.line_user_id,
      legacy_row_id: legacy.legacy_row_id,
      status: existing ? "updated" : "created"
    });
  }

  await putJson(env, appPath(env, `imports/line-engine/users-${Date.now()}.json`), {
    imported_at: now,
    source: "line-engine.actmaster_db.users",
    total_rows: rows.length,
    imported_count: imported.length,
    skipped_count: skipped.length,
    imported,
    skipped
  });

  return json({ ok: true, imported_count: imported.length, skipped_count: skipped.length, imported, skipped });
}

async function handleImportLineCards(request, env) {
  requireMigrationToken(request, env);

  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.cards) ? body.cards : [];
  if (!rows.length) throw new HttpError(400, "missing_cards", "cards must be a non-empty array");
  if (rows.length > 100) throw new HttpError(400, "too_many_cards", "import at most 100 cards per request");

  const now = new Date().toISOString();
  const imported = [];
  const skipped = [];

  for (const row of rows) {
    const legacy = normalizeLegacyCardContact(row);
    if (!legacy.owner_line_user_id || !legacy.legacy_row_id) {
      skipped.push({ legacy_row_id: legacy.legacy_row_id, reason: "missing_owner_or_row_id" });
      continue;
    }

    const userId = `line_${sanitizeId(legacy.owner_line_user_id)}`;
    await ensureLegacyOwnerProfile(env, userId, legacy, now);

    const card = buildLegacyContactCard(userId, legacy, now);
    await putJson(env, userPath(userId, `cards/${card.card_id}.json`), card);
    await upsertCardIndex(env, userId, card);

    imported.push({
      card_id: card.card_id,
      owner_user_id: userId,
      legacy_row_id: legacy.legacy_row_id,
      name: card.fields.name,
      status: "upserted"
    });
  }

  await putJson(env, appPath(env, `imports/line-engine/cards-${Date.now()}.json`), {
    imported_at: now,
    source: "line-engine.actmaster_db.card_contacts",
    total_rows: rows.length,
    imported_count: imported.length,
    skipped_count: skipped.length,
    imported,
    skipped
  });

  return json({ ok: true, imported_count: imported.length, skipped_count: skipped.length, imported, skipped });
}

async function handleImportStatus(request, env) {
  requireMigrationToken(request, env);
  const status = await getImportStatus(env);
  return json({ ok: true, ...status });
}

async function handleImportUsers(request, env) {
  requireMigrationToken(request, env);
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 50)));
  const usersPrefix = appPath(env, "users/");
  const userObjects = await listObjects(env, usersPrefix, 1000);
  const profileObjects = userObjects.filter((item) => item.key.endsWith("/profile.json")).slice(0, limit);
  const users = [];

  for (const item of profileObjects) {
    const profile = await getJson(env, item.key);
    const legacy = profile?.legacy?.line_engine || {};
    users.push({
      user_id: profile?.user_id || "",
      name: profile?.name || "",
      phone: profile?.phone || "",
      industry: profile?.industry || "",
      plan: profile?.plan || "free",
      ref_code: profile?.ref_code || "",
      line_user_id: profile?.line_user_id || "",
      legacy_role: legacy.legacy_role || "",
      legacy_network_id: legacy.legacy_network_id || "",
      legacy_row_id: legacy.legacy_row_id || "",
      profile_key: item.key,
      card_key: profile?.legacy?.line_engine?.legacy_row_id
        ? `${usersPrefix}${sanitizeId(profile.user_id).replace(/^line_/, "line_")}/cards/legacy_profile_${sanitizeId(profile.legacy.line_engine.legacy_row_id)}.json`
        : ""
    });
  }

  const status = await getImportStatus(env);
  return json({ ok: true, ...status, users });
}

async function handleImportOwner(request, env) {
  requireMigrationToken(request, env);
  const url = new URL(request.url);
  const userId = sanitizeId(url.searchParams.get("user_id") || "");
  if (!userId) throw new HttpError(400, "missing_user_id", "user_id is required");

  const index = await getJson(env, userPath(userId, "indexes/cards.json")) || { cards: [] };
  const cards = [];
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 20)));
  for (const item of (index.cards || []).slice(0, limit)) {
    const card = await getJson(env, userPath(userId, `cards/${sanitizeId(item.card_id)}.json`));
    if (card) {
      cards.push({
        card_id: card.card_id,
        name: card.fields?.name || "",
        company: card.fields?.company || "",
        title: card.fields?.title || "",
        source: card.source || "",
        visibility: card.visibility || "",
        legacy_row_id: card.legacy_source?.row_id || ""
      });
    }
  }
  return json({ ok: true, user_id: userId, index_count: index.cards?.length || 0, card_count: cards.length, limit, index: index.cards || [], cards });
}

function requireMigrationToken(request, env) {
  const token = request.headers.get("x-admin-migration-token") || "";
  if (!env.MIGRATION_ADMIN_TOKEN) {
    throw new HttpError(503, "migration_disabled", "MIGRATION_ADMIN_TOKEN is not configured");
  }
  if (!token || token !== env.MIGRATION_ADMIN_TOKEN) {
    throw new HttpError(401, "migration_unauthorized", "Invalid migration token");
  }
}

async function getImportStatus(env) {
  const usersPrefix = appPath(env, "users/");
  const importsPrefix = appPath(env, "imports/line-engine/");
  const userObjects = await listObjects(env, usersPrefix, 1000);
  const importObjects = await listObjects(env, importsPrefix, 100);
  const profileObjects = userObjects.filter((item) => item.key.endsWith("/profile.json"));
  const cardObjects = userObjects.filter((item) => item.key.includes("/cards/") && item.key.endsWith(".json"));
  return {
    bucket: env.WASABI_BUCKET,
    base_prefix: env.WASABI_BASE_PREFIX || "tonyuse",
    users_prefix: usersPrefix,
    imports_prefix: importsPrefix,
    profiles: profileObjects.length,
    cards: cardObjects.length,
    import_logs: importObjects.length,
    sample_profiles: profileObjects.slice(0, 5).map((item) => item.key),
    sample_cards: cardObjects.slice(0, 5).map((item) => item.key),
    latest_import_logs: importObjects.slice(0, 5).map((item) => item.key)
  };
}

function normalizeLegacyLineUser(row) {
  return {
    legacy_row_id: cleanText(row.row_id || row.rowId || row.userId),
    line_user_id: cleanText(row.line_id || row.lineId || row.userId),
    name: cleanText(row.name || row.displayName),
    industry: cleanText(row.industry || row.title),
    gender: cleanText(row.gender),
    phone: cleanText(row.phone || row.mobile),
    birthday: cleanText(row.birthday),
    region: cleanText(row.region),
    address: cleanText(row.address),
    legacy_role: cleanText(row.role || "user"),
    store_id: cleanText(row.store_id || row.storeId),
    referrer_user_id: row.referrer_id ? `line_${sanitizeId(row.referrer_id)}` : "",
    legacy_referrer_id: cleanText(row.referrer_id || row.referrerId),
    legacy_network_id: cleanText(row.network_id || row.networkId),
    point_line_id: cleanText(row.point_line_id || row.pointLineId),
    legacy_line_id: cleanText(row.legacy_line_id || row.legacyLineId),
    identity_source: cleanText(row.identity_source || row.identitySource),
    points: Number(row.points || 0),
    socials: safeJsonValue(row.socials),
    created_at: cleanText(row.created_at || row.createdAt),
    migrated_at: cleanText(row.migrated_at || row.migratedAt),
    raw: row
  };
}

function normalizeLegacyCardContact(row) {
  const owner = cleanText(row.owner_user_id || row.creator_id || row.profile_user_id || row.line_id);
  const contactLineId = cleanText(row.line_id || row.profile_user_id);
  return {
    legacy_row_id: cleanText(row.row_id || row.rowId),
    owner_line_user_id: owner || "legacy_orphan_imports",
    owner_was_missing: !owner,
    contact_line_user_id: contactLineId,
    creator_line_user_id: cleanText(row.creator_id),
    profile_line_user_id: cleanText(row.profile_user_id),
    name: cleanText(row.name),
    english_name: cleanText(row.english_name),
    company: cleanText(row.company_name),
    title: cleanText(row.title),
    department: cleanText(row.department),
    tax_id: cleanText(row.tax_id),
    phone: cleanText(row.mobile),
    company_phone: cleanText(row.office_phone),
    extension: cleanText(row.extension),
    fax: cleanText(row.fax),
    email: cleanText(row.email).toLowerCase(),
    website: cleanText(row.website),
    line_id: cleanText(row.socials || contactLineId),
    address: cleanText(row.address),
    birthday: cleanText(row.birthday),
    services: cleanText(row.services),
    notes: cleanText(row.notes),
    tags: cleanText(row.tags),
    personality: cleanText(row.personality),
    hobbies: cleanText(row.hobbies),
    wealth: cleanText(row.wealth),
    health: cleanText(row.health),
    career: cleanText(row.career),
    image_url: cleanText(row.image_url),
    custom_config: safeJsonValue(row.custom_config),
    network_id: cleanText(row.network_id),
    visibility: cleanText(row.visibility) || "private",
    source_type: cleanText(row.source_type),
    ai_review_status: cleanText(row.ai_review_status),
    pool_eligible: Number(row.pool_eligible || 0),
    crm_status: cleanText(row.crm_status),
    crm_type: cleanText(row.crm_type),
    crm_next_action: cleanText(row.crm_next_action),
    crm_next_followup_at: cleanText(row.crm_next_followup_at),
    crm_ai_suggestion: cleanText(row.crm_ai_suggestion),
    created_at: cleanText(row.created_at),
    updated_at: cleanText(row.updated_at),
    raw: row
  };
}

async function ensureLegacyOwnerProfile(env, userId, legacy, now) {
  const key = userPath(userId, "profile.json");
  const existing = await getJson(env, key);
  if (existing) return existing;
  const refCode = createRefCode(userId);
  const profile = {
    user_id: userId,
    login_provider: "line",
    line_user_id: legacy.owner_line_user_id,
    line_display_name: legacy.name || legacy.owner_line_user_id,
    name: legacy.name || legacy.owner_line_user_id,
    phone: legacy.phone || "",
    industry: legacy.title || legacy.company || "",
    plan: "free",
    roles: ["user"],
    ref_code: refCode,
    referral_url: `${appBaseUrl(env)}/r/${refCode}`,
    source: "line_engine_card_owner_migration",
    legacy: {
      line_engine_owner_from_card: {
        owner_line_user_id: legacy.owner_line_user_id,
        first_card_row_id: legacy.legacy_row_id
      }
    },
    migrated_at: now,
    created_at: legacy.created_at || now,
    updated_at: now
  };
  await putJson(env, key, profile);
  await ensureJson(env, userPath(userId, "indexes/card-fingerprints.json"), { fingerprints: {} });
  await ensureJson(env, userPath(userId, "indexes/cards.json"), { cards: [] });
  await ensureJson(env, userPath(userId, "indexes/rents.json"), { rents: [] });
  await ensureJson(env, userPath(userId, "points/balance.json"), defaultBalance(userId));
  return profile;
}

function buildLegacyContactCard(userId, legacy, now) {
  const cardId = `legacy_card_${sanitizeId(legacy.legacy_row_id)}`;
  const fields = {
    name: legacy.name || "",
    english_name: legacy.english_name || "",
    title: legacy.title || "",
    department: legacy.department || "",
    company: legacy.company || "",
    tax_id: legacy.tax_id || "",
    phone: legacy.phone || "",
    company_phone: legacy.company_phone || "",
    extension: legacy.extension || "",
    fax: legacy.fax || "",
    email: legacy.email || "",
    line_id: legacy.line_id || "",
    website: legacy.website || "",
    address: legacy.address || "",
    service: legacy.services || "",
    raw_text: legacy.services || legacy.notes || legacy.personality || "",
    tags: legacy.tags || ""
  };
  const ecardConfig = normalizeLegacyCardConfig(legacy.custom_config, legacy, fields);
  return {
    card_id: cardId,
    owner_user_id: userId,
    visibility: legacy.visibility === "public" ? "public" : "private",
    public_slug: "",
    source: "line_engine_card_contacts",
    source_image_url: legacy.image_url || "",
    fields,
    ecard_config: ecardConfig,
    line_card: mergeLineCardRecord(buildLineCardRecord(fields, {
      cardId,
      userId,
      source: "legacy_card_contacts"
    }), {
      rowId: legacy.legacy_row_id,
      card_id: cardId,
      "姓名": fields.name,
      "英文名": fields.english_name,
      "職稱": fields.title,
      "部門": fields.department,
      "公司名稱": fields.company,
      "統一編號": fields.tax_id,
      "手機號碼": fields.phone,
      "公司電話": fields.company_phone,
      "分機": fields.extension,
      "傳真": fields.fax,
      "電子郵件": fields.email,
      "公司網址": fields.website,
      "社群帳號": fields.line_id,
      "公司地址": fields.address,
      "服務項目": fields.service,
      "標籤": fields.tags,
      "圖片網址": legacy.image_url || "",
      "自訂名片設定": JSON.stringify(ecardConfig)
    }),
    reward_status: "not_eligible",
    reward_points: 0,
    crm: {
      status: legacy.crm_status,
      type: legacy.crm_type,
      next_action: legacy.crm_next_action,
      next_followup_at: legacy.crm_next_followup_at,
      ai_suggestion: legacy.crm_ai_suggestion
    },
    legacy_source: {
      system: "line-engine",
      table: "card_contacts",
      row_id: legacy.legacy_row_id,
      owner_user_id: legacy.owner_line_user_id,
      owner_was_missing: legacy.owner_was_missing,
      source_type: legacy.source_type,
      network_id: legacy.network_id,
      ai_review_status: legacy.ai_review_status,
      pool_eligible: legacy.pool_eligible
    },
    created_at: legacy.created_at || now,
    updated_at: legacy.updated_at || now
  };
}

function normalizeLegacyCardConfig(config, legacy, fields) {
  const cfg = config && typeof config === "object" && !Array.isArray(config) ? config : {};
  return {
    layoutStyle: cfg.layoutStyle || "landscape",
    imgUrl: cfg.imgUrl || legacy.image_url || "",
    imgUrlPortrait: cfg.imgUrlPortrait || "",
    imgUrlSquare: cfg.imgUrlSquare || "",
    imgRatioLandscape: cfg.imgRatioLandscape || "20:13",
    imgRatioPortrait: cfg.imgRatioPortrait || "2:3",
    imgRatioSquare: cfg.imgRatioSquare || "1:1",
    desc: cfg.desc || fields.service || fields.raw_text || "",
    descAlign: cfg.descAlign || "center",
    descColor: cfg.descColor || "#666666",
    buttons: Array.isArray(cfg.buttons) ? cfg.buttons : buildDefaultEcardConfig(fields).buttons,
    migratedFrom: "line-engine.card_contacts"
  };
}

function buildLegacyUserProfileCard(userId, legacy, now) {
  const cardId = `legacy_profile_${sanitizeId(legacy.legacy_row_id || legacy.line_user_id)}`;
  const fields = {
    name: legacy.name || legacy.line_user_id,
    title: legacy.industry || "",
    company: "",
    phone: legacy.phone || "",
    email: "",
    line_id: legacy.line_user_id,
    website: "",
    address: legacy.address || "",
    service: legacy.industry || "",
    raw_text: [legacy.industry, legacy.phone].filter(Boolean).join(" / ")
  };
  return {
    card_id: cardId,
    owner_user_id: userId,
    visibility: "private",
    public_slug: "",
    source: "line_engine_user_profile",
    fields,
    line_card: buildLineCardRecord(fields, {
      cardId,
      userId,
      source: "legacy_user_profile"
    }),
    reward_status: "not_eligible",
    reward_points: 0,
    legacy_source: {
      system: "line-engine",
      table: "users",
      row_id: legacy.legacy_row_id,
      line_user_id: legacy.line_user_id
    },
    created_at: legacy.created_at || now,
    updated_at: now
  };
}

function safeJsonValue(value) {
  if (!value) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
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
  const url = new URL(request.url);
  if (url.searchParams.get("summary") === "1") {
    return json({ ok: true, cards: index.cards || [], index, summary: true });
  }
  const cards = [];
  const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit") || 20)));
  for (const item of (index.cards || []).slice(0, limit)) {
    const card = await getJson(env, userPath(user.user_id, `cards/${sanitizeId(item.card_id)}.json`));
    if (card) cards.push(card);
  }
  return json({ ok: true, cards, index, limited: true, limit });
}

async function handleUpsertManualCard(request, env, routeCardId = "") {
  const user = await requireUser(request, env);
  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();
  const cardId = sanitizeId(routeCardId || body.card_id || `card_${Date.now()}_${randomString(8)}`);
  const existing = await getJson(env, userPath(user.user_id, `cards/${cardId}.json`));
  const normalizedFields = normalizeManualFields(body.fields || body);
  const card = {
    ...(existing || {}),
    card_id: cardId,
    owner_user_id: user.user_id,
    visibility: existing?.visibility || body.visibility || "private",
    public_slug: existing?.public_slug || body.public_slug || "",
    source: existing?.source || "manual",
    fields: normalizedFields,
    line_card: mergeLineCardRecord(buildLineCardRecord(normalizedFields, {
      cardId,
      userId: user.user_id,
      source: existing?.source || "manual",
      existing
    }), body.line_card),
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
    line_card: buildLineCardRecord(normalizeParsedCard(parsed), {
      cardId,
      userId: user.user_id,
      source: "ocr",
      imageKey
    }),
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
    title: card.fields.title || "",
    phone: card.fields.phone || "",
    email: card.fields.email || "",
    visibility: card.visibility,
    public_slug: card.public_slug || "",
    source: card.source || "",
    crm_status: card.crm?.status || "",
    crm_type: card.crm?.type || "",
    crm_next_action: card.crm?.next_action || "",
    crm_next_followup_at: card.crm?.next_followup_at || "",
    crm_ai_suggestion: card.crm?.ai_suggestion || "",
    source_image_url: card.source_image_url || "",
    legacy_row_id: card.legacy_source?.row_id || "",
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

function buildLineCardRecord(fields, options = {}) {
  const cfg = buildDefaultEcardConfig(fields, options);
  const now = new Date().toISOString();
  const existing = options.existing?.line_card || {};
  return {
    ...existing,
    rowId: options.cardId,
    card_id: options.cardId,
    userId: options.userId,
    creatorId: options.userId,
    "LINE ID": options.userId,
    "User ID": options.userId,
    "建檔者ID": options.userId,
    "姓名": fields.name || "",
    "英文名": fields.english_name || "",
    "職稱": fields.title || "",
    "部門": fields.department || "",
    "公司名稱": fields.company || "",
    "統一編號": fields.tax_id || "",
    "手機號碼": fields.phone || "",
    "公司電話": fields.company_phone || "",
    "分機": fields.extension || "",
    "傳真": fields.fax || "",
    "電子郵件": fields.email || "",
    "公司網址": fields.website || "",
    "社群帳號": fields.line_id || "",
    "公司地址": fields.address || "",
    "服務項目": fields.raw_text || fields.service || fields.title || fields.company || "",
    "標籤": fields.tags || "",
    "建檔人/備註": options.source === "ocr" ? "由 mycard GPT OCR 建立" : "由 mycard 手動建立",
    "名片圖檔": cfg.imgUrl || "",
    "自訂名片設定": JSON.stringify(cfg),
    "歸屬網": "personal",
    "建立時間": existing["建立時間"] || now,
    "更新時間": now
  };
}

function mergeLineCardRecord(base, override = {}) {
  if (!override || typeof override !== "object") return base;
  return {
    ...base,
    ...Object.fromEntries(Object.entries(override).filter(([, value]) => value !== undefined && value !== null))
  };
}

function buildDefaultEcardConfig(fields, options = {}) {
  const cleanPhone = normalizePhone(fields.phone);
  const buttons = [
    { l: "加LINE好友", u: fields.line_id ? `https://line.me/R/ti/p/${fields.line_id}` : "https://lin.ee/y7h8BUF", c: "#06C755" },
    { l: "行動電話", u: cleanPhone ? `tel:${cleanPhone}` : "tel:XXXXXXXXXX", c: "#3b82f6" },
    { l: "店家地址", u: fields.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fields.address)}` : "https://www.google.com/maps", c: "#1e293b" }
  ];
  return {
    layoutStyle: "landscape",
    imgUrl: "",
    imgUrlPortrait: "",
    imgUrlSquare: "",
    imgRatioLandscape: "20:13",
    imgRatioPortrait: "2:3",
    imgRatioSquare: "1:1",
    desc: fields.raw_text || fields.service || fields.title || fields.company || "",
    descAlign: "center",
    descColor: "#666666",
    buttons,
    isPrivate: true,
    templateDraft: options.source !== "ocr",
    templateVersion: "mycard-line-v1"
  };
}

function buildPublicCard(card) {
  return {
    card_id: card.card_id,
    public_slug: card.public_slug,
    fields: card.fields,
    line_card: card.line_card || buildLineCardRecord(card.fields || {}, {
      cardId: card.card_id,
      userId: card.owner_user_id,
      source: card.source
    }),
    published_at: new Date().toISOString(),
    updated_at: card.updated_at
  };
}

function renderPublicCardHtml(card) {
  const lineCard = card.line_card || buildLineCardRecord(card.fields || {}, { cardId: card.card_id });
  const cfg = parseCardConfig(lineCard);
  const name = escapeHtml(lineCard["姓名"] || "未命名");
  const title = escapeHtml(lineCard["職稱"] || "");
  const company = escapeHtml(lineCard["公司名稱"] || "");
  const desc = escapeHtml(cfg.desc || lineCard["服務項目"] || lineCard["職稱"] || lineCard["公司名稱"] || "");
  const imgUrl = escapeHtml(cfg.imgUrl || lineCard["名片圖檔"] || "https://images.unsplash.com/photo-1616628188550-808682f3926d?w=800&q=80");
  const color = escapeHtml(cfg.descColor || "#666666");
  const align = escapeHtml(cfg.descAlign || "center");
  const buttons = Array.isArray(cfg.buttons) ? cfg.buttons : [];
  const buttonHtml = buttons.map((button) => {
    const label = escapeHtml(button.l || "按鈕");
    const href = escapeHtml(button.u || "#");
    const bg = escapeHtml(button.c || "#06C755");
    return `<a href="${href}" class="cta" style="background:${bg}">${label}</a>`;
  }).join("");
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${name}｜名片王</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#e8f0f5;font-family:"Segoe UI","Microsoft JhengHei",Arial,sans-serif;color:#1e293b;padding:20px}
    .phone{width:min(420px,100%);background:#fff;border-radius:24px;box-shadow:0 20px 54px rgba(15,23,42,.18);overflow:hidden}
    .hero{position:relative;aspect-ratio:20/13;background:#f1f5f9 center/cover no-repeat}
    .badge{position:absolute;right:14px;top:14px;background:#ef4444;color:#fff;font-size:12px;font-weight:800;padding:7px 18px;border-radius:999px;box-shadow:0 4px 12px rgba(0,0,0,.12)}
    .body{padding:26px;text-align:center}.name{font-size:24px;font-weight:900;margin:0 0 8px}.role{font-size:14px;color:#64748b;margin:0 0 14px}.desc{font-size:14px;line-height:1.75;white-space:pre-wrap;margin:0}.actions{padding:0 26px 26px}.cta{display:block;text-align:center;text-decoration:none;color:#fff;border-radius:14px;padding:13px 16px;font-size:14px;font-weight:900;margin-bottom:10px;box-shadow:0 3px 10px rgba(15,23,42,.1)}.brand{color:#64748b;font-size:12px;text-align:center;margin-top:16px}
  </style>
</head>
<body>
  <main>
    <article class="phone">
      <div class="hero" style="background-image:url('${imgUrl}')"><div class="badge">分享</div></div>
      <div class="body">
        <h1 class="name">${name}</h1>
        <p class="role">${title}${title && company ? " · " : ""}${company}</p>
        <p class="desc" style="color:${color};text-align:${align}">${desc}</p>
      </div>
      ${buttonHtml ? `<div class="actions">${buttonHtml}</div>` : ""}
    </article>
    <p class="brand">名片王 MyCard</p>
  </main>
</body>
</html>`;
}

function parseCardConfig(card) {
  try {
    const raw = card?.["自訂名片設定"] || "{}";
    const cfg = typeof raw === "object" ? raw : JSON.parse(String(raw));
    return cfg && typeof cfg === "object" ? cfg : {};
  } catch {
    return {};
  }
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

async function listObjects(env, prefix, maxKeys = 1000) {
  const query = new URLSearchParams({
    "list-type": "2",
    prefix,
    "max-keys": String(maxKeys)
  });
  const response = await signedWasabiFetch(env, "GET", "", undefined, "", query);
  if (!response.ok) throw await wasabiError(response, "wasabi_list_failed");
  const xml = await response.text();
  return Array.from(xml.matchAll(/<Contents>[\s\S]*?<Key>([\s\S]*?)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>[\s\S]*?<\/Contents>/g))
    .map((match) => ({
      key: decodeXml(match[1]),
      size: Number(match[2] || 0)
    }));
}

async function signedWasabiFetch(env, method, key, body, contentType = "", query = null) {
  const config = wasabiConfig(env);
  const encodedKey = key ? `/${encodeS3Key(key)}` : "";
  const url = new URL(`${config.endpoint.replace(/\/$/, "")}/${config.bucket}${encodedKey}`);
  if (query) {
    const params = query instanceof URLSearchParams ? query : new URLSearchParams(query);
    params.sort();
    url.search = params.toString();
  }
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
    canonicalQueryString(url.searchParams),
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

function canonicalQueryString(params) {
  const pairs = [];
  for (const [key, value] of params.entries()) {
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  return pairs.sort().join("&");
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
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
  return appPath(null, `users/${sanitizeId(userId)}/${path.replace(/^\/+/, "")}`);
}

function rentPath(rentId, path) {
  return appPath(null, `rents/${sanitizeId(rentId)}/${path.replace(/^\/+/, "")}`);
}

function referralCodePath(refCode) {
  return appPath(null, `referrals/codes/${sanitizeRefCode(refCode)}.json`);
}

function publicCardPath(slug) {
  return appPath(null, `public/cards/${sanitizeSlug(slug)}.json`);
}

function appPath(env, path) {
  const rawPrefix = env?.WASABI_BASE_PREFIX || "tonyuse";
  const prefix = String(rawPrefix || "").replace(/^\/+|\/+$/g, "");
  const cleanPath = String(path || "").replace(/^\/+/, "");
  return prefix ? `${prefix}/${cleanPath}` : cleanPath;
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
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-admin-migration-token"
  };
}

class HttpError {
  constructor(status, code, message) {
    this.status = status;
    this.code = code;
    this.message = message;
  }
}
