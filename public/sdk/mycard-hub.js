const DEFAULT_API_BASE = "https://myvard.fangwl591021.workers.dev";

export const LEGACY_ECARD_TEMPLATE_IDS = {
  v1: "ecard-v1-video-guide",
  v2: "ecard-v2-business-card",
  v3: "ecard-v3-catalog",
  v4: "ecard-v4-video-rich-menu"
};

export const LEGACY_ECARD_TEMPLATE_ORDER = [
  LEGACY_ECARD_TEMPLATE_IDS.v1,
  LEGACY_ECARD_TEMPLATE_IDS.v2,
  LEGACY_ECARD_TEMPLATE_IDS.v3,
  LEGACY_ECARD_TEMPLATE_IDS.v4
];

export const RICH_MENU_TEMPLATE_IDS = {
  basic2500: "rich-menu-basic-2500"
};

export function createMyCardHub(options = {}) {
  const apiBase = String(options.apiBase || DEFAULT_API_BASE).replace(/\/$/, "");
  const tokenProvider = options.token;

  async function request(path, init = {}) {
    const headers = new Headers(init.headers || {});
    if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
    const token = typeof tokenProvider === "function" ? await tokenProvider() : tokenProvider;
    if (token && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
    const response = await fetch(`${apiBase}${path}`, { ...init, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false || data.ok === false) {
      const error = new Error(data.message || `MyCard Hub API failed: ${response.status}`);
      error.status = response.status;
      error.code = data.code || "api_error";
      error.data = data;
      throw error;
    }
    return data;
  }

  function post(path, body) {
    return request(path, {
      method: "POST",
      body: JSON.stringify(body || {})
    });
  }

  async function listLegacyEcardTemplates() {
    const result = await request("/api/hub/templates?type=ecard");
    const templates = result.templates || [];
    return {
      ...result,
      templates: LEGACY_ECARD_TEMPLATE_ORDER
        .map((templateId) => templates.find((template) => template.template_id === templateId))
        .filter(Boolean)
    };
  }

  async function getLegacyEcardTemplates() {
    const result = await listLegacyEcardTemplates();
    return Object.fromEntries(
      result.templates.map((template) => [legacyAlias(template.template_id), template])
    );
  }

  function legacyAlias(templateId) {
    return Object.entries(LEGACY_ECARD_TEMPLATE_IDS).find(([, id]) => id === templateId)?.[0] || templateId;
  }

  function generateLegacyFlex(version, data = {}) {
    const key = String(version || "").toLowerCase();
    const templateId = LEGACY_ECARD_TEMPLATE_IDS[key] || version;
    return post("/api/hub/ecard/flex", { template_id: templateId, data });
  }

  async function getBasicRichMenuTemplate() {
    const result = await request(`/api/hub/templates/${encodeURIComponent(RICH_MENU_TEMPLATE_IDS.basic2500)}`);
    return result.template;
  }

  return {
    apiBase,
    modules: {
      list: () => request("/api/hub/modules")
    },
    templates: {
      list: (params = {}) => {
        const query = new URLSearchParams(params);
        const suffix = query.toString() ? `?${query}` : "";
        return request(`/api/hub/templates${suffix}`);
      },
      get: (templateId) => request(`/api/hub/templates/${encodeURIComponent(templateId)}`),
      save: (template, adminToken) => request("/api/hub/templates", {
        method: "POST",
        headers: adminToken ? { "x-hub-admin-token": adminToken } : undefined,
        body: JSON.stringify({ ...(template || {}), admin_token: adminToken || undefined })
      }),
      delete: (templateId, adminToken) => request(`/api/hub/templates/${encodeURIComponent(templateId)}`, {
        method: "DELETE",
        headers: adminToken ? { "x-hub-admin-token": adminToken } : undefined
      })
    },
    seed: (adminToken) => request("/api/hub/seed", {
      method: "POST",
      headers: adminToken ? { "x-hub-admin-token": adminToken } : undefined,
      body: JSON.stringify({ admin_token: adminToken || undefined })
    }),
    assets: {
      upload: (asset, adminToken) => request("/api/hub/assets/upload", {
        method: "POST",
        headers: adminToken ? { "x-hub-admin-token": adminToken, "content-type": "application/json" } : undefined,
        body: JSON.stringify({ ...(asset || {}), admin_token: adminToken || undefined })
      }),
      url: (assetId) => `${apiBase}/api/hub/assets/${encodeURIComponent(assetId)}`
    },
    ecard: {
      listTemplates: () => request("/api/hub/templates?type=ecard"),
      getTemplate: (templateId) => request(`/api/hub/templates/${encodeURIComponent(templateId)}`),
      render: (templateId, data = {}) => post("/api/hub/ecard/render", { template_id: templateId, data }),
      generateFlex: (templateId, data = {}) => post("/api/hub/ecard/flex", { template_id: templateId, data }),
      legacy: {
        ids: LEGACY_ECARD_TEMPLATE_IDS,
        order: LEGACY_ECARD_TEMPLATE_ORDER,
        list: listLegacyEcardTemplates,
        getAll: getLegacyEcardTemplates,
        generateFlex: generateLegacyFlex,
        v1: (data = {}) => generateLegacyFlex("v1", data),
        v2: (data = {}) => generateLegacyFlex("v2", data),
        v3: (data = {}) => generateLegacyFlex("v3", data),
        v4: (data = {}) => generateLegacyFlex("v4", data)
      }
    },
    richMenu: {
      ids: RICH_MENU_TEMPLATE_IDS,
      listTemplates: () => request("/api/hub/richmenus/templates"),
      getBasicTemplate: getBasicRichMenuTemplate,
      validate: (config) => post("/api/hub/richmenus/validate", { config }),
      render: (config) => post("/api/hub/richmenus/render", { config }),
      publish: (config, options = {}) => post("/api/hub/richmenus/publish", {
        config,
        imageBase64: options.imageBase64,
        channelAccessToken: options.channelAccessToken
      })
    },
    voom: {
      extract: (url) => post("/api/hub/voom/extract", { url }),
      getJob: (jobId) => request(`/api/hub/voom/jobs/${encodeURIComponent(jobId)}`)
    }
  };
}

export default createMyCardHub;
