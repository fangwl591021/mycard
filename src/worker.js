const TEXT_ENCODER = new TextEncoder();
const CARD_REWARD_POINTS = 10;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const CONTENT_HUB_VERSION = "0.1.0";

const HUB_MODULES = [
  {
    id: "rich-menu",
    name: "Rich Menu Tool",
    type: "tool",
    status: "active",
    description: "Reusable LINE Rich Menu schema, area validation, action normalization, and publish flow."
  },
  {
    id: "voom",
    name: "LINE VOOM Extractor",
    type: "tool",
    status: "active",
    description: "Extract VOOM media URLs and preserve real media dimensions for previews and Flex generation."
  },
  {
    id: "ecard",
    name: "E-card Template Library",
    type: "template-library",
    status: "active",
    description: "Reusable Flex templates and sample data for digital business cards."
  }
];

const V2_SOCIAL_ICONS = {
  YT: "https://aiwe.cc/wp-content/uploads/2026/02/87e6f8054bd3672f2885e38bddb112e2.png",
  FB: "https://aiwe.cc/wp-content/uploads/2026/02/3986d1fd62384c8cdaa0e7c82f2740d1.png",
  LINE: "https://aiwe.cc/wp-content/uploads/2026/02/b75a5831fd553c7130aeafbb9783cf79.png",
  TEL: "https://aiwe.cc/wp-content/uploads/2026/02/7254567388850a6b4d77b75208ebd4b8.png"
};

const BUILTIN_TEMPLATE_SAMPLE_DATA = {
  "ecard-v1-video-guide": {
    title: "Video guide sample",
    description: "A video-first Flex card with social icons and three CTA buttons.",
    video_url: "https://obs.line-scdn.net/h9B3GDtq9emxVUmlibAR9FXJqcUNxVSB-WgQhQ3s9MF5IeHN9YC5OU1BhRFVzUVE5SQdJA3hcU11Ca1U4YANWUkNhUBtIRVZ5WRNZV3tbORs/mp4",
    preview_url: "https://upload.cc/i1/2022/07/29/ygc1lF.png",
    aspect_ratio: "1040:748",
    bubble_size: "giga",
    background_color: "#FFFFFF",
    socials: [
      { type: "TEL", uri: "tel:0912345678" },
      { type: "FB", uri: "https://www.facebook.com" },
      { type: "IG", uri: "https://www.instagram.com" },
      { type: "YT", uri: "https://www.youtube.com" }
    ],
    buttons: [
      { label: "Join LINE", uri: "https://line.me", color: "#111111" },
      { label: "Booking", uri: "https://line.me", color: "#111111" },
      { label: "More info", uri: "https://line.me", color: "#111111" }
    ]
  },
  "ecard-v2-business-card": {
    logo: "https://aiwe.cc/wp-content/uploads/2026/02/6e1716a9965b002e6c25ab6f9d383e60.jpg",
    title: "請輸入姓名或公司名稱",
    desc: "✨ 一行建議16個字\n✨ 可以簡介公司或是活動內容\n✨ 四到六排的高度較為適中，不建議太長\n✨ 多分享、多收穫",
    title_align: "start",
    background: { type: "linearGradient", angle: "88deg", startColor: "#57142b", endColor: "#46250c" },
    socials: [
      { type: "YT", u: "https://youtube.com" },
      { type: "FB", u: "https://facebook.com" },
      { type: "LINE", u: "https://line.me" },
      { type: "TEL", u: "tel:0912345678" }
    ],
    buttons: [
      { t: "New Button", u: "https://line.me" },
      { t: "New Button", u: "https://line.me" },
      { t: "New Button", u: "https://line.me" }
    ]
  },
  "ecard-v3-catalog": {
    title: "Product catalog sample",
    hero_url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png",
    button_color: "#0000FF",
    button_text_color: "#FFFFFF",
    bubble_size: "mega",
    items: [
      { title: "Sample product A", price: "390", image_url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png", button_text: "Buy", uri: "https://line.me" },
      { title: "Sample product B", price: "590", image_url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_2_restaurant.png", button_text: "Buy", uri: "https://line.me" }
    ],
    socials: [
      { type: "LINE", uri: "https://line.me" },
      { type: "FB", uri: "https://facebook.com" },
      { type: "IG", uri: "https://instagram.com" }
    ]
  },
  "ecard-v4-video-rich-menu": {
    header_text: "Click the video to open full media",
    header_color: "#eb5a09",
    video_url: "https://example.com/video.mp4",
    preview_url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png",
    video_ratio: "800:450",
    base_image: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png",
    base_ratio: "2500:1686",
    design_width: 2500,
    zones: [
      { label: "Official site", uri: "https://line.me", x: 120, y: 160, w: 620, h: 280 },
      { label: "Contact", uri: "https://line.me", x: 900, y: 780, w: 700, h: 360 }
    ]
  },
  "rich-menu-basic-2500": {
    name: "MyCard Rich Menu",
    chatBarText: "Menu",
    selected: true,
    size: { width: 2500, height: 1686 },
    areas: [
      { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: "uri", uri: "https://myvard.fangwl591021.workers.dev/hub.html" } },
      { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: "message", text: "mycard" } },
      { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: { type: "uri", uri: "https://line.me" } },
      { bounds: { x: 833, y: 843, width: 834, height: 843 }, action: { type: "message", text: "catalog" } },
      { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: { type: "richmenuswitch", richMenuAliasId: "MENU_SAMPLE", data: "switch-menu" } }
    ]
  }
};

const BUILTIN_TEMPLATES = [
  {
    template_id: "ecard-v1-video-guide",
    module: "ecard",
    kind: "flex",
    name: "Video Guide V1",
    source: "mylittlesys",
    version: "1.0.0",
    status: "builtin",
    description: "Video-first Flex template with preview image, social icons, and CTA buttons.",
    fields: ["title", "description", "video_url", "preview_url", "buttons", "socials"]
  },
  {
    template_id: "ecard-v2-business-card",
    module: "ecard",
    kind: "flex",
    name: "Business Card V2",
    source: "mylittlesys",
    version: "1.0.0",
    status: "builtin",
    description: "Digital business card with avatar, gradient background, social icons, contact buttons, and share badge.",
    fields: ["name", "title", "company", "description", "logo_url", "background", "socials", "buttons"]
  },
  {
    template_id: "ecard-v3-catalog",
    module: "ecard",
    kind: "flex",
    name: "Product Catalog V3",
    source: "mylittlesys",
    version: "1.0.0",
    status: "builtin",
    description: "Product list template with hero image, catalog items, prices, buttons, and social links.",
    fields: ["title", "hero_url", "items", "socials", "button_color"]
  },
  {
    template_id: "ecard-v4-video-rich-menu",
    module: "ecard",
    kind: "flex",
    name: "Video Rich Menu V4",
    source: "mylittlesys",
    version: "1.0.0",
    status: "builtin",
    description: "Video and image-map style template with base image, design width, and clickable zones.",
    fields: ["header_text", "video_url", "preview_url", "base_image", "zones"]
  },
  {
    template_id: "rich-menu-basic-2500",
    module: "rich-menu",
    kind: "rich-menu",
    name: "Basic Rich Menu 2500",
    source: "mylittlesys",
    version: "1.0.0",
    status: "builtin",
    description: "LINE Rich Menu template with size, chatBarText, areas, and URI/message/richmenuswitch actions.",
    fields: ["size", "chatBarText", "areas"]
  }
];

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
          app: "MyCard",
          liff_id: env.LIFF_ID || "1660923784-EcoH8aMs",
          liff_url: env.LIFF_URL || "https://liff.line.me/1660923784-EcoH8aMs",
          plans: ["free", "PRO", "enterprise"],
          roles: ["admin", "rent_owner", "rent_admin", "rent_member", "user"],
          card_upload_reward_points: CARD_REWARD_POINTS,
          storage_note: "Data is stored in Wasabi JSON/Object Storage. Worker does not use KV, D1, or R2."
        });
      }

      if (url.pathname === "/api/hub/modules" && request.method === "GET") {
        return await handleHubModules(request, env);
      }

      if (url.pathname === "/api/hub/templates" && request.method === "GET") {
        return await handleHubTemplates(request, env);
      }

      if (url.pathname === "/api/hub/templates" && request.method === "POST") {
        return await handleHubTemplateSave(request, env);
      }

      if (url.pathname === "/api/hub/seed" && request.method === "POST") {
        return await handleHubSeed(request, env);
      }

      const hubTemplateRoute = url.pathname.match(/^\/api\/hub\/templates\/([^/]+)$/);
      if (hubTemplateRoute && request.method === "GET") {
        return await handleHubTemplate(request, env, hubTemplateRoute[1]);
      }

      if (hubTemplateRoute && request.method === "DELETE") {
        return await handleHubTemplateDelete(request, env, hubTemplateRoute[1]);
      }

      if (url.pathname === "/api/hub/richmenus/templates" && request.method === "GET") {
        return await handleHubRichMenuTemplates(request, env);
      }

      if ((url.pathname === "/api/hub/ecard/render" || url.pathname === "/api/hub/ecard/flex") && request.method === "POST") {
        return await handleHubEcardFlex(request, env);
      }

      if (url.pathname === "/api/hub/assets/upload" && request.method === "POST") {
        return await handleHubAssetUpload(request, env);
      }

      const hubAssetRoute = url.pathname.match(/^\/api\/hub\/assets\/([^/]+)$/);
      if (hubAssetRoute && request.method === "GET") {
        return await handleHubAsset(request, env, hubAssetRoute[1]);
      }

      if (url.pathname === "/api/hub/richmenus/validate" && request.method === "POST") {
        return await handleHubRichMenuValidate(request, env);
      }

      if (url.pathname === "/api/hub/richmenus/render" && request.method === "POST") {
        return await handleHubRichMenuRender(request, env);
      }

      if (url.pathname === "/api/hub/richmenus/publish" && request.method === "POST") {
        return await handleHubRichMenuPublish(request, env);
      }

      if (url.pathname === "/api/hub/voom/extract" && request.method === "POST") {
        return await handleHubVoomExtract(request, env);
      }

      const hubVoomJobRoute = url.pathname.match(/^\/api\/hub\/voom\/jobs\/([^/]+)$/);
      if (hubVoomJobRoute && request.method === "GET") {
        return await handleHubVoomJob(request, env, hubVoomJobRoute[1]);
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

async function handleHubModules(_request, env) {
  return hubJson({
    version: CONTENT_HUB_VERSION,
    storage: {
      provider: "wasabi",
      bucket: env.WASABI_BUCKET || "tonyuse",
      region: env.WASABI_REGION || "us-west-1",
      endpoint: env.WASABI_ENDPOINT || "https://s3.us-west-1.wasabisys.com",
      base_prefix: hubPath(env, "")
    },
    modules: HUB_MODULES
  });
}

async function handleHubTemplates(request, env) {
  const url = new URL(request.url);
  const type = sanitizeHubType(url.searchParams.get("type") || url.searchParams.get("module") || "");
  const templates = await loadHubTemplates(env, type);
  return hubJson({ templates, count: templates.length });
}

async function handleHubRichMenuTemplates(_request, env) {
  const templates = await loadHubTemplates(env, "rich-menu");
  return hubJson({ templates, count: templates.length });
}

async function handleHubTemplate(_request, env, templateId) {
  const template = await loadHubTemplate(env, templateId);
  if (!template) throw new HttpError(404, "template_not_found", "Template not found");
  return hubJson({ template });
}

async function handleHubTemplateSave(request, env) {
  const body = await request.json().catch(() => ({}));
  requireHubAdmin(request, env, body);
  const template = normalizeHubTemplate(body.template || body);
  await putHubTemplate(env, template);
  return hubJson({ template, saved: true });
}

async function handleHubTemplateDelete(request, env, templateId) {
  requireHubAdmin(request, env);
  const existing = await loadHubTemplate(env, templateId);
  if (!existing) throw new HttpError(404, "template_not_found", "Template not found");
  if (existing.status === "builtin") throw new HttpError(400, "builtin_template_readonly", "Builtin templates cannot be deleted");
  const moduleId = sanitizeHubType(existing.module);
  const safeTemplateId = sanitizeId(templateId);
  await deleteObject(env, hubPath(env, `modules/${moduleId}/templates/${safeTemplateId}.json`));
  const index = await safeGetHubJson(env, `modules/${moduleId}/indexes/templates.json`) || { templates: [] };
  index.templates = (index.templates || []).filter((item) => sanitizeId(typeof item === "string" ? item : item.template_id) !== safeTemplateId);
  index.updated_at = new Date().toISOString();
  await safePutHubJson(env, `modules/${moduleId}/indexes/templates.json`, index);
  return hubJson({ deleted: true, template_id: safeTemplateId });
}

async function handleHubSeed(request, env) {
  const body = await request.json().catch(() => ({}));
  requireHubAdmin(request, env, body);
  const saved = [];
  for (const template of BUILTIN_TEMPLATES) {
    const stored = { ...withTemplateSampleData(template), status: "seeded", seeded_from: "builtin", seeded_at: new Date().toISOString() };
    await putHubTemplate(env, stored);
    saved.push(stored.template_id);
  }
  return hubJson({ seeded: saved.length, templates: saved });
}

async function handleHubEcardFlex(request, env) {
  const body = await request.json().catch(() => ({}));
  const templateId = sanitizeId(body.template_id || body.templateId || "ecard-v2-business-card");
  const template = await loadHubTemplate(env, templateId);
  if (!template) throw new HttpError(404, "template_not_found", "Template not found");
  if (template.module !== "ecard") throw new HttpError(400, "not_ecard_template", "Template is not an ecard template");

  const input = body.data && typeof body.data === "object" ? body.data : body;
  const sample = template.sample_data && typeof template.sample_data === "object" ? template.sample_data : {};
  const renderInput = { ...sample, ...input };
  const flex = buildEcardFlex(template, renderInput);
  return hubJson({
    template_id: template.template_id,
    template_name: template.name,
    flex,
    preview: {
      title: renderInput.name || renderInput.title || renderInput.company || template.name,
      altText: `${renderInput.name || renderInput.company || "E-card"}`
    }
  });
}

async function handleHubAssetUpload(request, env) {
  const body = await request.json().catch(() => ({}));
  requireHubAdmin(request, env, body);
  const contentType = cleanText(body.content_type || body.contentType || "application/octet-stream").toLowerCase();
  const filename = cleanFilename(body.filename || `asset-${Date.now()}`);
  const moduleId = sanitizeHubType(body.module || "shared") || "shared";
  const base64 = cleanText(body.base64 || body.data || "").replace(/^data:[^;]+;base64,/, "");
  if (!base64) throw new HttpError(400, "missing_asset_base64", "Missing base64 asset data");
  if (!isAllowedHubAssetType(contentType, filename)) throw new HttpError(400, "unsupported_asset_type", "Unsupported asset type");
  const bytes = base64ToBytes(base64);
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new HttpError(400, "asset_too_large", "Asset is too large");
  const now = new Date();
  const ext = fileExtension(filename, contentType);
  const assetId = `asset_${Date.now()}_${randomString(8)}`;
  const objectKey = hubPath(env, `assets/${moduleId}/${now.getUTCFullYear()}/${pad2(now.getUTCMonth() + 1)}/${assetId}.${ext}`);
  await putObject(env, objectKey, bytes, contentType);
  const record = {
    asset_id: assetId,
    module: moduleId,
    filename,
    content_type: contentType,
    size: bytes.byteLength,
    object_key: objectKey,
    api_url: `${appBaseUrl(env)}/api/hub/assets/${assetId}`,
    created_at: now.toISOString()
  };
  await safePutHubJson(env, `assets/index/${assetId}.json`, record);
  return hubJson({ asset: record });
}

async function handleHubAsset(_request, env, assetId) {
  const safeAssetId = sanitizeId(assetId);
  const record = await safeGetHubJson(env, `assets/index/${safeAssetId}.json`);
  if (!record) throw new HttpError(404, "asset_not_found", "Asset not found");
  const response = await getObject(env, record.object_key);
  if (!response.ok) throw await wasabiError(response, "asset_get_failed");
  return new Response(response.body, {
    status: 200,
    headers: {
      "content-type": record.content_type || "application/octet-stream",
      "cache-control": "public, max-age=86400",
      ...corsHeaders()
    }
  });
}

async function handleHubRichMenuValidate(request, _env) {
  const body = await request.json().catch(() => ({}));
  const richMenu = normalizeRichMenuConfig(body.richMenu || body.config || body);
  const issues = validateRichMenuConfig(richMenu);
  return hubJson({ valid: issues.length === 0, issues, richMenu });
}

async function handleHubRichMenuRender(request, _env) {
  const body = await request.json().catch(() => ({}));
  const richMenu = normalizeRichMenuConfig(body.richMenu || body.config || body);
  const issues = validateRichMenuConfig(richMenu);
  if (issues.length) throw new HttpError(400, "invalid_rich_menu", issues.map((item) => item.message).join("; "));
  return hubJson({ richMenu, linePayload: toLineRichMenuPayload(richMenu) });
}

async function handleHubRichMenuPublish(request, env) {
  const body = await request.json().catch(() => ({}));
  const token = body.channelAccessToken || body.channel_access_token || env.LINE_CHANNEL_ACCESS_TOKEN || "";
  const imageBase64 = body.imageBase64 || body.image_base64 || "";
  const richMenu = normalizeRichMenuConfig(body.richMenu || body.config || body);
  const issues = validateRichMenuConfig(richMenu);
  if (issues.length) throw new HttpError(400, "invalid_rich_menu", issues.map((item) => item.message).join("; "));
  if (!token) throw new HttpError(400, "missing_line_channel_token", "Missing LINE channel access token");
  if (!imageBase64) throw new HttpError(400, "missing_rich_menu_image", "Missing rich menu image base64");
  const result = await publishLineRichMenu(token, richMenu, imageBase64);
  return hubJson(result);
}

async function handleHubVoomExtract(request, env) {
  const body = await request.json().catch(() => ({}));
  const sourceUrl = cleanText(body.url || body.source_url);
  if (!sourceUrl) throw new HttpError(400, "missing_voom_url", "Missing LINE VOOM URL");
  const parsed = await extractVoomAssets(sourceUrl);
  const jobId = `voom_${Date.now()}_${randomString(8)}`;
  const job = {
    job_id: jobId,
    module: "voom",
    source_url: sourceUrl,
    status: parsed.videoUrl || parsed.images.length ? "extracted" : "needs_review",
    result: parsed,
    created_at: new Date().toISOString()
  };
  await safePutHubJson(env, `modules/voom/items/${jobId}.json`, job);
  return hubJson({ job });
}

async function handleHubVoomJob(_request, env, jobId) {
  const safeJobId = sanitizeId(jobId);
  const job = await safeGetHubJson(env, `modules/voom/items/${safeJobId}.json`);
  if (!job) throw new HttpError(404, "voom_job_not_found", "VOOM job not found");
  return hubJson({ job });
}

async function handleLineAuth(request, env) {
  const body = await request.json().catch(() => ({}));
  if (!body.idToken) throw new HttpError(400, "missing_id_token", "Missing LIFF idToken");

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
    tags: legacy.tags || "",
    notes: legacy.notes || ""
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
  if (!refCode) throw new HttpError(404, "referral_not_found", "Referral link not found");
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
    ecard_config: existing?.ecard_config || body.ecard_config || buildDefaultEcardConfig(normalizedFields),
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
  if (!card) throw new HttpError(404, "card_not_found", "Card not found");
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
  if (!card) throw new HttpError(404, "card_not_found", "Card not found");
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
  if (!slug) throw new HttpError(404, "public_card_not_found", "Public card not found");
  const card = await getJson(env, publicCardPath(slug));
  if (!card) throw new HttpError(404, "public_card_not_found", "Public card not found");
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
    throw new HttpError(400, "invalid_rent_type", "Enterprise plan requires organization rent");
  }
  const now = new Date().toISOString();
  const rentId = `rent_${Date.now()}_${randomString(8)}`;
  const displayName = cleanText(body.display_name) || (type === "personal" ? "Personal PRO Space" : "Enterprise Team Space");
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
  if (!(image instanceof File)) throw new HttpError(400, "missing_image", "Please upload a business card image");
  if (!image.type.startsWith("image/")) throw new HttpError(400, "invalid_file_type", "Only image files are accepted");
  if (image.size > MAX_IMAGE_BYTES) throw new HttpError(400, "file_too_large", "Image size must be under 8MB");

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
    throw new HttpError(422, "ocr_not_enough_fields", "OCR did not return enough fields. Please fill name, phone, or email manually.");
  }

  const indexKey = userPath(user.user_id, "indexes/card-fingerprints.json");
  const index = await getJson(env, indexKey) || { fingerprints: {} };
  const duplicate = index.fingerprints?.[fingerprint];
  if (duplicate) {
    return json({
      ok: false,
      code: "duplicate_card",
      message: "This card already exists. No new record or reward points were created.",
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
    ecard_config: buildDefaultEcardConfig(normalizeParsedCard(parsed), { source: "ocr" }),
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
    english_name: card.fields.english_name || "",
    department: card.fields.department || "",
    tax_id: card.fields.tax_id || "",
    phone: card.fields.phone || "",
    company_phone: card.fields.company_phone || "",
    extension: card.fields.extension || "",
    fax: card.fields.fax || "",
    email: card.fields.email || "",
    website: card.fields.website || "",
    line_id: card.fields.line_id || "",
    address: card.fields.address || "",
    service: card.fields.service || "",
    tags: card.fields.tags || "",
    notes: card.fields.notes || "",
    visibility: card.visibility,
    public_slug: card.public_slug || "",
    source: card.source || "",
    ecard_config: card.ecard_config || null,
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
  if (!token) throw new HttpError(401, "unauthorized", "Please login with LIFF");
  return verifyLineIdToken(token, env);
}

async function verifyLineIdToken(idToken, env) {
  const clientId = env.LINE_LOGIN_CHANNEL_ID || (env.LIFF_ID || "").split("-")[0];
  if (!clientId) throw new HttpError(500, "missing_line_channel_id", "Worker is missing LINE_LOGIN_CHANNEL_ID or LIFF_ID");

  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: clientId })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(401, "line_token_invalid", payload.error_description || "LINE idToken verification failed");
  }

  return {
    user_id: `line_${sanitizeId(payload.sub)}`,
    line_user_id: payload.sub,
    name: payload.name || "LINE User",
    picture_url: payload.picture || ""
  };
}

async function recognizeBusinessCard(env, bytes, contentType) {
  if (!env.OPENAI_API_KEY) throw new HttpError(500, "missing_openai_api_key", "Worker is missing OPENAI_API_KEY");

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
            text: "Recognize this paper business card and return JSON only. Use the legacy card schema fields: name, english_name, title, department, company, tax_id, phone, company_phone, extension, fax, email, line_id, website, address, service, tags, notes, raw_text. Use an empty string for unknown fields."
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
              english_name: { type: "string" },
              title: { type: "string" },
              department: { type: "string" },
              company: { type: "string" },
              tax_id: { type: "string" },
              phone: { type: "string" },
              company_phone: { type: "string" },
              extension: { type: "string" },
              fax: { type: "string" },
              email: { type: "string" },
              line_id: { type: "string" },
              website: { type: "string" },
              address: { type: "string" },
              service: { type: "string" },
              tags: { type: "string" },
              notes: { type: "string" },
              raw_text: { type: "string" }
            },
            required: ["name", "english_name", "title", "department", "company", "tax_id", "phone", "company_phone", "extension", "fax", "email", "line_id", "website", "address", "service", "tags", "notes", "raw_text"]
          }
        }
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, "openai_ocr_failed", data.error?.message || "GPT OCR request failed");
  }
  const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
  if (!outputText) throw new HttpError(502, "openai_empty_output", "GPT OCR returned no parseable content");
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
    english_name: cleanText(parsed.english_name),
    title: cleanText(parsed.title),
    department: cleanText(parsed.department),
    company: cleanText(parsed.company),
    tax_id: cleanText(parsed.tax_id),
    phone: cleanText(parsed.phone),
    company_phone: cleanText(parsed.company_phone),
    extension: cleanText(parsed.extension),
    fax: cleanText(parsed.fax),
    email: cleanText(parsed.email).toLowerCase(),
    line_id: cleanText(parsed.line_id),
    website: cleanText(parsed.website),
    address: cleanText(parsed.address),
    service: cleanText(parsed.service),
    tags: cleanText(parsed.tags),
    notes: cleanText(parsed.notes),
    raw_text: cleanText(parsed.raw_text)
  };
}

function normalizeManualFields(fields) {
  return {
    name: cleanText(fields.name),
    english_name: cleanText(fields.english_name),
    title: cleanText(fields.title),
    department: cleanText(fields.department),
    company: cleanText(fields.company),
    tax_id: cleanText(fields.tax_id),
    phone: cleanText(fields.phone),
    company_phone: cleanText(fields.company_phone),
    extension: cleanText(fields.extension),
    fax: cleanText(fields.fax),
    email: cleanText(fields.email).toLowerCase(),
    line_id: cleanText(fields.line_id || fields.social),
    website: cleanText(fields.website),
    address: cleanText(fields.address),
    service: cleanText(fields.service),
    tags: cleanText(fields.tags),
    notes: cleanText(fields.notes),
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
    "服務項目": fields.service || fields.raw_text || fields.title || fields.company || "",
    "標籤": fields.tags || "",
    "建檔人/備註": fields.notes || (options.source === "ocr" ? "由 mycard GPT OCR 建立" : "由 mycard 手動建立"),
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
    ecard_config: card.ecard_config || null,
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
    const raw = card?.["自訂名片設定"] || card?.["電子名片設定"] || card?.["自訂版面"] || card?.["名片設定"] || "{}";
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

function hubJson(data, init = {}) {
  return json({
    success: true,
    code: "ok",
    ...data
  }, init);
}

function sanitizeHubType(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

async function loadHubTemplates(env, type = "") {
  const builtin = BUILTIN_TEMPLATES
    .filter((item) => !type || item.module === type || item.kind === type)
    .map(withTemplateSampleData);
  const index = await safeGetHubJson(env, type ? `modules/${type}/indexes/templates.json` : "indexes/templates.json");
  const ids = Array.isArray(index?.templates) ? index.templates : [];
  const stored = [];
  for (const item of ids.slice(0, 200)) {
    const id = sanitizeId(typeof item === "string" ? item : item.template_id);
    const moduleId = sanitizeHubType(typeof item === "object" ? item.module : type) || type || "ecard";
    if (!id) continue;
    const template = await safeGetHubJson(env, `modules/${moduleId}/templates/${id}.json`);
    if (template) stored.push(template);
  }
  const byId = new Map([...builtin, ...stored].map((item) => [item.template_id, item]));
  return Array.from(byId.values()).filter((item) => !type || item.module === type || item.kind === type);
}

async function loadHubTemplate(env, templateId) {
  const safeTemplateId = sanitizeId(templateId);
  const builtin = BUILTIN_TEMPLATES.find((item) => item.template_id === safeTemplateId);
  if (builtin) return withTemplateSampleData(builtin);
  for (const module of HUB_MODULES) {
    const template = await safeGetHubJson(env, `modules/${module.id}/templates/${safeTemplateId}.json`);
    if (template) return template;
  }
  return null;
}

function withTemplateSampleData(template) {
  return {
    ...template,
    sample_data: template.sample_data || structuredClone(BUILTIN_TEMPLATE_SAMPLE_DATA[template.template_id] || {})
  };
}

async function safeGetHubJson(env, path) {
  try {
    return await getJson(env, hubPath(env, path));
  } catch (error) {
    if (error?.code === "missing_wasabi_config") return null;
    throw error;
  }
}

async function safePutHubJson(env, path, value) {
  try {
    await putJson(env, hubPath(env, path), value);
    return true;
  } catch (error) {
    if (error?.code === "missing_wasabi_config") return false;
    throw error;
  }
}

function hubPath(env, path) {
  return appPath(env, `content-hub/${String(path || "").replace(/^\/+/, "")}`);
}

function requireHubAdmin(request, env, body = null) {
  const expected = env.HUB_ADMIN_TOKEN || env.MIGRATION_ADMIN_TOKEN || "";
  if (!expected) throw new HttpError(503, "hub_admin_disabled", "HUB_ADMIN_TOKEN is not configured");
  const provided = request.headers.get("x-hub-admin-token")
    || request.headers.get("x-admin-migration-token")
    || cleanText(body?.admin_token || body?.hub_admin_token || body?.migration_admin_token);
  if (!provided || provided !== expected) throw new HttpError(401, "hub_admin_unauthorized", "Invalid hub admin token");
}

function normalizeHubTemplate(input = {}) {
  const templateId = sanitizeId(input.template_id || input.templateId || input.id);
  const moduleId = sanitizeHubType(input.module || input.type || "ecard");
  if (!templateId) throw new HttpError(400, "missing_template_id", "template_id is required");
  if (!moduleId) throw new HttpError(400, "missing_template_module", "module is required");
  const now = new Date().toISOString();
  return {
    ...input,
    template_id: templateId,
    module: moduleId,
    kind: cleanText(input.kind || (moduleId === "rich-menu" ? "rich-menu" : "flex")),
    name: cleanText(input.name || templateId),
    source: cleanText(input.source || "mycard-content-hub"),
    version: cleanText(input.version || "1.0.0"),
    status: cleanText(input.status || "custom"),
    fields: Array.isArray(input.fields) ? input.fields.map(cleanText).filter(Boolean) : [],
    updated_at: now,
    created_at: input.created_at || now
  };
}

async function putHubTemplate(env, template) {
  const normalized = normalizeHubTemplate(template);
  const moduleId = sanitizeHubType(normalized.module);
  await putJson(env, hubPath(env, `modules/${moduleId}/templates/${normalized.template_id}.json`), normalized);
  await upsertHubTemplateIndex(env, `modules/${moduleId}/indexes/templates.json`, normalized);
  await upsertHubTemplateIndex(env, "indexes/templates.json", normalized);
  return normalized;
}

async function upsertHubTemplateIndex(env, path, template) {
  const index = await safeGetHubJson(env, path) || { templates: [] };
  const summary = {
    template_id: template.template_id,
    module: template.module,
    kind: template.kind,
    name: template.name,
    version: template.version,
    status: template.status,
    updated_at: template.updated_at
  };
  index.templates = [summary, ...(index.templates || []).filter((item) => sanitizeId(typeof item === "string" ? item : item.template_id) !== template.template_id)];
  index.updated_at = new Date().toISOString();
  await putJson(env, hubPath(env, path), index);
}

function cleanFilename(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || `asset-${Date.now()}`;
}

function isAllowedHubAssetType(contentType, filename) {
  const ext = String(filename || "").split(".").pop()?.toLowerCase() || "";
  const allowedExt = new Set(["jpg", "jpeg", "png", "webp", "gif", "mp4", "pdf", "json"]);
  return allowedExt.has(ext) || /^(image\/(jpeg|png|webp|gif)|video\/mp4|application\/pdf|application\/json)/i.test(contentType);
}

function fileExtension(filename, contentType) {
  const ext = String(filename || "").split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]{2,8}$/.test(ext)) return ext;
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("json")) return "json";
  return "jpg";
}

function buildEcardFlex(template, input = {}) {
  if (template.template_id === "ecard-v1-video-guide") return buildVideoGuideFlex(input);
  if (template.template_id === "ecard-v3-catalog") return buildCatalogFlex(input);
  if (template.template_id === "ecard-v4-video-rich-menu") return buildVideoRichMenuFlex(input);
  return buildBusinessCardFlex(input);
}

function buildBusinessCardFlex(input = {}) {
  const title = cleanText(input.title || input.name || input.company || "請輸入姓名或公司名稱");
  const desc = cleanText(input.desc || input.description || input.service || input.bio || input.raw_text || "Nice to exchange business cards with you.");
  const titleAlign = cleanText(input.title_align || input.titleAlign || "start") === "center" ? "center" : "start";
  const logoUrl = cleanText(input.logo || input.logo_url || input.logoUrl || input.avatar_url || input.image_url || "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png");
  const background = normalizeFlexBackground(input.background || input.ecard_config?.background);
  const socials = normalizeV2Socials(input.socials);
  const buttons = normalizeFlexButtons(input.buttons || input.ecard_config?.buttons || defaultHubButtons(input));
  const shareButton = buttons.find((button) => /share|分享/i.test(button.label));
  const regularButtons = buttons.filter((button) => button !== shareButton);
  const bodyContents = [
    ...(shareButton ? [{
      type: "box",
      layout: "vertical",
      position: "absolute",
      offsetTop: "14px",
      offsetEnd: "14px",
      backgroundColor: "#FFFFFFE8",
      cornerRadius: "100px",
      paddingTop: "6px",
      paddingBottom: "6px",
      paddingStart: "14px",
      paddingEnd: "14px",
      contents: [{ type: "text", text: "分享", size: "xs", weight: "bold", color: "#111827" }],
      action: { type: "uri", uri: sanitizeFlexUri(shareButton.uri) }
    }] : []),
    {
      type: "box",
      layout: "vertical",
      width: "100px",
      height: "100px",
      cornerRadius: "100px",
      margin: "lg",
      contents: [{ type: "image", url: logoUrl, size: "full", aspectMode: "cover", aspectRatio: "1:1" }]
    },
    {
      type: "box",
      layout: "vertical",
      alignItems: "center",
      margin: "sm",
      paddingAll: "0px",
      contents: [
        { type: "text", text: title, weight: "bold", size: "lg", color: "#ffffff", align: titleAlign, adjustMode: "shrink-to-fit" },
        { type: "text", text: desc, size: "sm", color: "#ffffff", align: titleAlign, wrap: true, margin: "sm" }
      ]
    }
  ];
  if (socials.length) {
    bodyContents.push(
      {
        type: "box",
        layout: "horizontal",
        justifyContent: "center",
        spacing: "xl",
        paddingTop: "xs",
        paddingBottom: "xs",
        margin: "lg",
        contents: socials.slice(0, 5).map((item) => ({
          type: "image",
          url: item.iconUrl,
          size: "70px",
          aspectRatio: "1:1",
          animated: true,
          action: { type: "uri", uri: sanitizeFlexUri(item.uri) }
        }))
      }
    );
  }
  if (regularButtons.length) {
    bodyContents.push({
      type: "box",
      layout: "vertical",
      spacing: "none",
      margin: "lg",
      alignItems: "center",
      contents: regularButtons.slice(0, 6).map((button) => ({
        type: "box",
        layout: "vertical",
        backgroundColor: "#ffffff",
        cornerRadius: "100px",
        paddingAll: "md",
        width: "260px",
        margin: "lg",
        alignItems: "center",
        contents: [{
          type: "text",
          text: button.label,
          color: "#333333",
          align: "center",
          weight: "bold",
          size: "sm",
          adjustMode: "shrink-to-fit"
        }],
        action: { type: "uri", uri: sanitizeFlexUri(button.uri) }
      }))
    });
  }
  bodyContents.push({ type: "box", layout: "vertical", height: "10px", contents: [] });
  return {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "0px",
      alignItems: "center",
      background,
      contents: bodyContents
    }
  };
}

function buildVideoGuideFlex(input = {}) {
  const title = cleanText(input.title || input.name || "Video Guide");
  const desc = cleanText(input.description || input.desc || "Tap to watch the full introduction.");
  const videoUrl = cleanText(input.video_url || input.videoUrl || "https://example.com/video.mp4");
  const previewUrl = cleanText(input.preview_url || input.previewUrl || "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png");
  return {
    type: "bubble",
    hero: {
      type: "video",
      url: videoUrl,
      previewUrl,
      altContent: { type: "image", url: previewUrl, size: "full", aspectRatio: "20:13", aspectMode: "cover" },
      aspectRatio: cleanText(input.aspect_ratio || "20:13")
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: title, weight: "bold", size: "xl", wrap: true },
        { type: "text", text: desc, size: "sm", color: "#666666", wrap: true, margin: "md" }
      ]
    },
    footer: { type: "box", layout: "vertical", contents: normalizeFlexButtons(input.buttons || defaultHubButtons(input)).slice(0, 3).map(toLineButton) }
  };
}

function buildCatalogFlex(input = {}) {
  const items = Array.isArray(input.items) && input.items.length ? input.items : [
    { title: input.title || "Catalog item", price: input.price || "", image_url: input.hero_url || input.heroUrl || "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png", uri: input.uri || "https://line.me" }
  ];
  return {
    type: "carousel",
    contents: items.slice(0, 8).map((item) => ({
      type: "bubble",
      hero: { type: "image", url: cleanText(item.image_url || item.img || "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png"), size: "full", aspectRatio: "20:13", aspectMode: "cover" },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: cleanText(item.title || item.desc || "Product"), weight: "bold", wrap: true },
          { type: "text", text: cleanText(item.price || ""), size: "sm", color: "#777777", margin: "sm" }
        ]
      },
      footer: { type: "box", layout: "vertical", contents: [toLineButton({ label: item.button_text || item.btnText || "View", uri: item.uri || item.url || "https://line.me", color: input.button_color || "#1d7a5f" })] }
    }))
  };
}

function buildVideoRichMenuFlex(input = {}) {
  const zones = Array.isArray(input.zones) ? input.zones : [];
  return {
    type: "bubble",
    hero: {
      type: "video",
      url: cleanText(input.video_url || input.videoUrl || "https://example.com/video.mp4"),
      previewUrl: cleanText(input.preview_url || input.previewUrl || "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png"),
      altContent: { type: "image", url: cleanText(input.base_image || input.baseImage || "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png"), size: "full", aspectRatio: cleanText(input.base_ratio || "20:13"), aspectMode: "cover" },
      aspectRatio: cleanText(input.video_ratio || "20:13")
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: cleanText(input.header_text || "Tap the video to open full media"), weight: "bold", wrap: true },
        { type: "text", text: `${zones.length} clickable zones`, size: "xs", color: "#777777", margin: "sm" }
      ]
    }
  };
}

function normalizeFlexBackground(value) {
  if (value?.type === "linearGradient") return value;
  if (value?.type === "gradient") {
    return {
      type: "linearGradient",
      angle: `${Number(value.angle || 90)}deg`,
      startColor: cleanText(value.startColor || value.start_color || "#57142b"),
      endColor: cleanText(value.endColor || value.end_color || "#46250c")
    };
  }
  if (value?.color) return { type: "solid", color: cleanText(value.color) };
  return { type: "linearGradient", angle: "88deg", startColor: "#57142b", endColor: "#46250c" };
}

function normalizeV2Socials(socials) {
  return (Array.isArray(socials) ? socials : []).map((item) => {
    const type = cleanText(item.type || "LINE").toUpperCase();
    return {
      type,
      iconUrl: cleanText(item.iconUrl || item.icon_url || item.url || V2_SOCIAL_ICONS[type] || V2_SOCIAL_ICONS.LINE),
      uri: cleanText(item.uri || item.u || item.link || "https://line.me")
    };
  });
}

function defaultHubButtons(input = {}) {
  const phone = normalizePhone(input.phone || input.tel || "");
  const lineId = cleanText(input.line_id || input.lineId || input.social || "");
  return [
    { label: "LINE", uri: lineId ? `https://line.me/R/ti/p/${lineId}` : "https://line.me", color: "#06C755" },
    { label: "Phone", uri: phone ? `tel:${phone}` : "tel:0000000000", color: "#3b82f6" },
    { label: "Map", uri: input.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(input.address)}` : "https://www.google.com/maps", color: "#1e293b" }
  ];
}

function normalizeFlexButtons(buttons) {
  return (Array.isArray(buttons) ? buttons : []).map((button) => ({
    label: cleanText(button.label || button.l || button.t || button.text || "Open"),
    uri: cleanText(button.uri || button.u || button.url || "https://line.me"),
    color: cleanText(button.color || button.c || "#06C755")
  }));
}

function sanitizeFlexUri(value) {
  const uri = cleanText(value || "https://line.me");
  if (/^(https?|tel|line):/i.test(uri)) return uri;
  return `https://${uri}`;
}

function toLineButton(button) {
  return {
    type: "button",
    style: "primary",
    color: cleanText(button.color || button.c || "#06C755"),
    action: { type: "uri", label: cleanText(button.label || button.l || "Open"), uri: cleanText(button.uri || button.u || "https://line.me") }
  };
}

function normalizeRichMenuConfig(input = {}) {
  const size = input.size || {};
  return {
    name: cleanText(input.name || "MyCard Rich Menu").slice(0, 300),
    chatBarText: cleanText(input.chatBarText || input.chat_bar_text || "Menu").slice(0, 14),
    selected: Boolean(input.selected ?? true),
    size: {
      width: Number(size.width || input.width || 2500),
      height: Number(size.height || input.height || 1686)
    },
    areas: (Array.isArray(input.areas) ? input.areas : []).map(normalizeRichMenuArea)
  };
}

function normalizeRichMenuArea(area = {}) {
  const bounds = area.bounds || area;
  return {
    bounds: {
      x: Math.max(0, Number(bounds.x || 0)),
      y: Math.max(0, Number(bounds.y || 0)),
      width: Math.max(1, Number(bounds.width || bounds.w || 1)),
      height: Math.max(1, Number(bounds.height || bounds.h || 1))
    },
    action: normalizeRichMenuAction(area.action || area)
  };
}

function normalizeRichMenuAction(action = {}) {
  const type = cleanText(action.type || "uri");
  if (type === "message") return { type, text: cleanText(action.text || action.label || "Open") };
  if (type === "richmenuswitch") {
    return {
      type,
      richMenuAliasId: cleanText(action.richMenuAliasId || action.rich_menu_alias_id || ""),
      data: cleanText(action.data || "switch")
    };
  }
  return { type: "uri", uri: cleanText(action.uri || action.url || "https://line.me") };
}

function validateRichMenuConfig(menu) {
  const issues = [];
  if (![2500, 1200, 800].includes(menu.size.width)) issues.push({ field: "size.width", message: "LINE Rich Menu width should normally be 2500, 1200, or 800." });
  if (menu.size.height < 250 || menu.size.height > 2500) issues.push({ field: "size.height", message: "Rich Menu height is out of LINE's normal range." });
  if (!menu.chatBarText) issues.push({ field: "chatBarText", message: "chatBarText is required." });
  menu.areas.forEach((area, index) => {
    if (area.bounds.x + area.bounds.width > menu.size.width) issues.push({ field: `areas.${index}.bounds`, message: "Area exceeds menu width." });
    if (area.bounds.y + area.bounds.height > menu.size.height) issues.push({ field: `areas.${index}.bounds`, message: "Area exceeds menu height." });
    if (area.action.type === "uri" && !/^https?:\/\//i.test(area.action.uri)) issues.push({ field: `areas.${index}.action.uri`, message: "URI action must be an http(s) URL." });
    if (area.action.type === "richmenuswitch" && !area.action.richMenuAliasId) issues.push({ field: `areas.${index}.action.richMenuAliasId`, message: "richmenuswitch requires richMenuAliasId." });
  });
  return issues;
}

function toLineRichMenuPayload(menu) {
  return {
    size: menu.size,
    selected: menu.selected,
    name: menu.name,
    chatBarText: menu.chatBarText,
    areas: menu.areas
  };
}

async function publishLineRichMenu(token, richMenu, imageBase64) {
  const payload = toLineRichMenuPayload(richMenu);
  const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const created = await createRes.json().catch(async () => ({ message: await createRes.text() }));
  if (!createRes.ok) return { success: false, code: "line_create_failed", line: created };
  const bytes = base64ToBytes(imageBase64);
  const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${created.richMenuId}/content`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "image/png" },
    body: bytes
  });
  if (!uploadRes.ok) return { success: false, code: "line_upload_failed", richMenuId: created.richMenuId, line: await uploadRes.text() };
  const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${created.richMenuId}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  });
  if (!defaultRes.ok) return { success: false, code: "line_default_failed", richMenuId: created.richMenuId, line: await defaultRes.text() };
  return { success: true, code: "published", richMenuId: created.richMenuId };
}

async function extractVoomAssets(sourceUrl) {
  const result = { sourceUrl, videoUrl: "", thumbnailUrl: "", images: [], rawMatches: [] };
  if (/^https?:\/\/voom-obs\.line-scdn\.net\//i.test(sourceUrl)) {
    result.videoUrl = sourceUrl;
    result.rawMatches.push(sourceUrl);
    return result;
  }
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 MyCardContentHub/0.1",
      accept: "text/html,application/xhtml+xml"
    }
  });
  const text = await response.text();
  const urls = Array.from(text.matchAll(/https?:\\?\/\\?\/[^"'<>\s]+/g))
    .map((match) => match[0].replace(/\\\//g, "/").replace(/\\u002F/g, "/"))
    .map((url) => url.replace(/&amp;/g, "&"));
  const unique = Array.from(new Set(urls));
  result.rawMatches = unique.filter((url) => /line|obs|scdn|mp4|jpg|png|webp/i.test(url)).slice(0, 50);
  result.videoUrl = unique.find((url) => /\.mp4(\?|$)/i.test(url) || /voom-obs\.line-scdn\.net/i.test(url)) || "";
  result.thumbnailUrl = unique.find((url) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url) && /scdn|obs|line/i.test(url)) || "";
  result.images = unique.filter((url) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url) && /scdn|obs|line/i.test(url)).slice(0, 12);
  return result;
}

function base64ToBytes(value) {
  const clean = String(value || "").replace(/^data:[^;]+;base64,/, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
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
    if (!env[name]) throw new HttpError(500, "missing_wasabi_config", `Worker is missing ${name}`);
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

