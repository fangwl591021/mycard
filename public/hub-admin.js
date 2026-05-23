import { createMyCardHub } from "./sdk/mycard-hub.js";

const hub = createMyCardHub({ apiBase: "" });
const state = {
  modules: [],
  ecardTemplates: [],
  richMenuTemplates: [],
  activeTemplateFilter: "ecard"
};

const els = {
  toast: document.querySelector("#toast"),
  moduleCount: document.querySelector("#moduleCount"),
  ecardCount: document.querySelector("#ecardCount"),
  richMenuCount: document.querySelector("#richMenuCount"),
  storagePrefix: document.querySelector("#storagePrefix"),
  moduleGrid: document.querySelector("#moduleGrid"),
  templateList: document.querySelector("#templateList"),
  ecardTemplateSelect: document.querySelector("#ecardTemplateSelect"),
  ecardDataInput: document.querySelector("#ecardDataInput"),
  flexOutput: document.querySelector("#flexOutput"),
  ecardPreview: document.querySelector("#ecardPreview"),
  ecardPreviewBadge: document.querySelector("#ecardPreviewBadge"),
  ecardPreviewAvatar: document.querySelector("#ecardPreviewAvatar"),
  ecardPreviewName: document.querySelector("#ecardPreviewName"),
  ecardPreviewRole: document.querySelector("#ecardPreviewRole"),
  ecardPreviewDesc: document.querySelector("#ecardPreviewDesc"),
  ecardPreviewActions: document.querySelector("#ecardPreviewActions"),
  richMenuInput: document.querySelector("#richMenuInput"),
  richMenuOutput: document.querySelector("#richMenuOutput"),
  richMenuBadge: document.querySelector("#richMenuBadge"),
  richMenuPreview: document.querySelector("#richMenuPreview"),
  richMenuPreviewBadge: document.querySelector("#richMenuPreviewBadge"),
  voomUrlInput: document.querySelector("#voomUrlInput"),
  voomOutput: document.querySelector("#voomOutput"),
  voomMediaFrame: document.querySelector("#voomMediaFrame"),
  voomSizeBadge: document.querySelector("#voomSizeBadge"),
  voomVideoUrl: document.querySelector("#voomVideoUrl"),
  voomThumbUrl: document.querySelector("#voomThumbUrl"),
  adminTokenInput: document.querySelector("#adminTokenInput")
};

const defaultCardData = {
  name: "方萬隆",
  title: "創意總監",
  company: "名片王",
  phone: "0912345678",
  line_id: "@mycard",
  description: "這裡是電子名片模板庫測試資料，可由其他專案透過 SDK 產生 Flex JSON。",
  background: {
    type: "gradient",
    angle: 88,
    startColor: "#57142b",
    endColor: "#46250c"
  }
};

const defaultRichMenu = {
  name: "MyCard Rich Menu",
  chatBarText: "選單",
  selected: true,
  size: { width: 2500, height: 1686 },
  areas: [
    {
      bounds: { x: 0, y: 0, width: 1250, height: 843 },
      action: { type: "uri", uri: "https://myvard.fangwl591021.workers.dev/hub.html" }
    },
    {
      bounds: { x: 1250, y: 0, width: 1250, height: 843 },
      action: { type: "message", text: "我要名片" }
    }
  ]
};

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function setOutput(el, value) {
  el.textContent = typeof value === "string" ? value : pretty(value);
}

async function loadHub() {
  try {
    const [modules, ecards, richMenus] = await Promise.all([
      hub.modules.list(),
      hub.ecard.listTemplates(),
      hub.richMenu.listTemplates()
    ]);
    state.modules = modules.modules || [];
    state.ecardTemplates = ecards.templates || [];
    state.richMenuTemplates = richMenus.templates || [];
    renderAll(modules.storage);
    showToast("內容倉庫已更新");
  } catch (error) {
    showToast(error.message || "讀取內容倉庫失敗");
  }
}

function renderAll(storage) {
  els.moduleCount.textContent = state.modules.length;
  els.ecardCount.textContent = state.ecardTemplates.length;
  els.richMenuCount.textContent = state.richMenuTemplates.length;
  els.storagePrefix.textContent = storage?.base_prefix || "content-hub";
  renderModules();
  renderTemplates();
  renderTemplateSelect();
}

function renderModules() {
  els.moduleGrid.innerHTML = state.modules.map((item) => `
    <article class="module-item">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.status)}</span>
      <p>${escapeHtml(item.description)}</p>
    </article>
  `).join("");
}

function currentTemplates() {
  if (state.activeTemplateFilter === "rich-menu") return state.richMenuTemplates;
  if (state.activeTemplateFilter === "ecard") return state.ecardTemplates;
  return [...state.ecardTemplates, ...state.richMenuTemplates];
}

function renderTemplates() {
  const templates = currentTemplates();
  els.templateList.innerHTML = templates.map((item) => `
    <article class="template-item">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.module)} · ${escapeHtml(item.status)}</span>
      <p>${escapeHtml(item.description || item.template_id)}</p>
      <p><code>${escapeHtml(item.template_id)}</code></p>
    </article>
  `).join("") || `<div class="empty-row">目前沒有模板</div>`;
}

function renderTemplateSelect() {
  els.ecardTemplateSelect.innerHTML = state.ecardTemplates.map((item) => `
    <option value="${escapeHtml(item.template_id)}">${escapeHtml(item.name)}</option>
  `).join("");
  if (state.ecardTemplates.some((item) => item.template_id === "ecard-v2-business-card")) {
    els.ecardTemplateSelect.value = "ecard-v2-business-card";
  }
}

async function generateFlex() {
  try {
    const templateId = els.ecardTemplateSelect.value || "ecard-v2-business-card";
    const data = JSON.parse(els.ecardDataInput.value || "{}");
    const result = await hub.ecard.generateFlex(templateId, data);
    setOutput(els.flexOutput, result.flex);
    renderEcardPreview(data, result.flex, templateId);
    showToast("Flex JSON 已產生");
  } catch (error) {
    setOutput(els.flexOutput, { success: false, message: error.message });
    showToast("Flex 產生失敗");
  }
}

async function validateRichMenu() {
  try {
    const config = JSON.parse(els.richMenuInput.value || "{}");
    const result = await hub.richMenu.validate(config);
    els.richMenuBadge.textContent = result.valid ? "通過" : "需修正";
    setOutput(els.richMenuOutput, result);
    renderRichMenuPreview(result.richMenu || config, result.issues || []);
    showToast(result.valid ? "圖文選單驗證通過" : "圖文選單需要修正");
  } catch (error) {
    els.richMenuBadge.textContent = "錯誤";
    setOutput(els.richMenuOutput, { success: false, message: error.message });
    showToast("驗證失敗");
  }
}

function renderEcardPreview(data = {}, flex = {}, templateId = "") {
  if (!els.ecardPreview) return;
  const background = flex?.body?.background || {};
  const start = background.startColor || background.color || "#57142b";
  const end = background.endColor || background.color || "#46250c";
  const angle = background.angle || "88deg";
  const image = data.logo_url || data.logoUrl || data.avatar_url || data.image_url || "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png";
  els.ecardPreview.style.background = background.type === "linearGradient"
    ? `linear-gradient(${angle}, ${start}, ${end})`
    : start;
  els.ecardPreviewBadge.textContent = templateId.replace("ecard-", "").toUpperCase();
  els.ecardPreviewAvatar.src = image;
  els.ecardPreviewName.textContent = data.name || data.title || data.company || "電子名片";
  els.ecardPreviewRole.textContent = [data.title, data.company].filter(Boolean).join("｜") || "Digital Business Card";
  els.ecardPreviewDesc.textContent = data.description || data.desc || data.service || data.bio || "很高興與你交換名片。";
  const buttons = Array.isArray(data.buttons) && data.buttons.length ? data.buttons : [
    { label: "LINE 聯絡", color: "#06C755" },
    { label: "電話聯絡", color: "#3b82f6" },
    { label: "地址導航", color: "#1e293b" }
  ];
  els.ecardPreviewActions.innerHTML = buttons.slice(0, 4).map((button) => `
    <span style="background:${escapeHtml(button.color || button.c || "#06C755")}">${escapeHtml(button.label || button.l || "開啟")}</span>
  `).join("");
}

function renderRichMenuPreview(menu = {}, issues = []) {
  if (!els.richMenuPreview) return;
  const size = menu.size || { width: 2500, height: 1686 };
  const width = Number(size.width || 2500);
  const height = Number(size.height || 1686);
  els.richMenuPreviewBadge.textContent = `${width} × ${height}`;
  els.richMenuPreview.style.aspectRatio = `${width} / ${height}`;
  const areas = Array.isArray(menu.areas) ? menu.areas : [];
  els.richMenuPreview.innerHTML = `
    <div class="richmenu-base-label">${escapeHtml(menu.chatBarText || "選單")}</div>
    ${areas.map((area, index) => {
      const b = area.bounds || area;
      const left = percentage(Number(b.x || 0), width);
      const top = percentage(Number(b.y || 0), height);
      const areaWidth = percentage(Number(b.width || b.w || 1), width);
      const areaHeight = percentage(Number(b.height || b.h || 1), height);
      const action = area.action || {};
      return `<div class="richmenu-zone" style="left:${left}%;top:${top}%;width:${areaWidth}%;height:${areaHeight}%">
        <strong>${index + 1}</strong>
        <span>${escapeHtml(action.type || "uri")}</span>
      </div>`;
    }).join("")}
    ${issues.length ? `<div class="richmenu-issue">${issues.length} 個問題</div>` : ""}
  `;
}

function percentage(value, total) {
  return Math.max(0, Math.min(100, (value / Math.max(1, total)) * 100));
}

async function extractVoom() {
  try {
    const url = els.voomUrlInput.value.trim();
    if (!url) {
      showToast("請輸入 VOOM 網址");
      return;
    }
    setOutput(els.voomOutput, { status: "processing" });
    const result = await hub.voom.extract(url);
    setOutput(els.voomOutput, result);
    renderVoomPreview(result.job?.result || result.result || result);
    showToast("VOOM 擷取完成");
  } catch (error) {
    setOutput(els.voomOutput, { success: false, message: error.message });
    showToast("VOOM 擷取失敗");
  }
}

function renderVoomPreview(result = {}) {
  if (!els.voomMediaFrame) return;
  const videoUrl = result.videoUrl || result.video_url || "";
  const thumbnailUrl = result.thumbnailUrl || result.thumbnail_url || result.images?.[0] || "";
  els.voomVideoUrl.textContent = videoUrl || "-";
  els.voomThumbUrl.textContent = thumbnailUrl || "-";
  els.voomSizeBadge.textContent = "讀取尺寸中";
  els.voomMediaFrame.innerHTML = "";

  if (videoUrl) {
    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.src = videoUrl;
    if (thumbnailUrl) video.poster = thumbnailUrl;
    video.addEventListener("loadedmetadata", () => {
      setVoomSize(video.videoWidth, video.videoHeight, "真實畫質");
    });
    video.addEventListener("error", () => {
      renderVoomImage(thumbnailUrl);
    });
    els.voomMediaFrame.append(video);
    return;
  }

  renderVoomImage(thumbnailUrl);
}

function renderVoomImage(url) {
  els.voomMediaFrame.innerHTML = "";
  if (!url) {
    els.voomSizeBadge.textContent = "沒有媒體";
    els.voomMediaFrame.innerHTML = "<span>沒有擷取到影片或縮圖</span>";
    return;
  }
  const image = document.createElement("img");
  image.alt = "";
  image.src = url;
  image.addEventListener("load", () => {
    setVoomSize(image.naturalWidth, image.naturalHeight, "真實畫質");
  });
  image.addEventListener("error", () => {
    els.voomSizeBadge.textContent = "媒體無法載入";
  });
  els.voomMediaFrame.append(image);
}

function setVoomSize(width, height, label) {
  const safeWidth = Number(width || 0);
  const safeHeight = Number(height || 0);
  if (!safeWidth || !safeHeight) {
    els.voomSizeBadge.textContent = "無法取得尺寸";
    return;
  }
  els.voomSizeBadge.textContent = `${label}: ${safeWidth} × ${safeHeight}`;
  els.voomMediaFrame.style.aspectRatio = `${safeWidth} / ${safeHeight}`;
}

async function seedTemplates() {
  try {
    const token = els.adminTokenInput.value.trim();
    if (!token) {
      showToast("請輸入 MIGRATION_ADMIN_TOKEN");
      return;
    }
    const result = await hub.seed(token);
    setOutput(els.flexOutput, result);
    await loadHub();
    showToast(`Seed 完成：${result.seeded || 0} 個模板`);
  } catch (error) {
    showToast(error.message || "Seed 失敗");
  }
}

async function copyFlex() {
  await navigator.clipboard.writeText(els.flexOutput.textContent || "{}");
  showToast("已複製 Flex JSON");
}

function switchPanel(panelId) {
  document.querySelectorAll(".hub-nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.hubPanel === panelId);
  });
  document.querySelectorAll(".hub-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${panelId}`);
  });
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

document.querySelectorAll(".hub-nav-item").forEach((button) => {
  button.addEventListener("click", () => switchPanel(button.dataset.hubPanel));
});

document.querySelectorAll("[data-template-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.activeTemplateFilter = button.dataset.templateFilter;
    document.querySelectorAll("[data-template-filter]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    renderTemplates();
  });
});

document.querySelector("#refreshBtn").addEventListener("click", loadHub);
document.querySelector("#seedBtn").addEventListener("click", seedTemplates);
document.querySelector("#generateFlexBtn").addEventListener("click", generateFlex);
document.querySelector("#validateRichMenuBtn").addEventListener("click", validateRichMenu);
document.querySelector("#extractVoomBtn").addEventListener("click", extractVoom);
document.querySelector("#copyFlexBtn").addEventListener("click", copyFlex);

els.ecardDataInput.value = pretty(defaultCardData);
els.richMenuInput.value = pretty(defaultRichMenu);
setOutput(els.flexOutput, {});
setOutput(els.richMenuOutput, {});
setOutput(els.voomOutput, {});
renderEcardPreview(defaultCardData, {}, "ecard-v2-business-card");
renderRichMenuPreview(defaultRichMenu, []);
renderVoomPreview({});
loadHub();
