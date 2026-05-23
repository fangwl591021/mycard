const DEFAULT_API_BASE = "https://myvard.fangwl591021.workers.dev";

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
      generateFlex: (templateId, data = {}) => post("/api/hub/ecard/flex", { template_id: templateId, data })
    },
    richMenu: {
      listTemplates: () => request("/api/hub/richmenus/templates"),
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
