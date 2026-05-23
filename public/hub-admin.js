import { createMyCardHub } from "./sdk/mycard-hub.js";

const hub = createMyCardHub({ apiBase: "" });

const state = {
  modules: [],
  ecardTemplates: [],
  richMenuTemplates: [],
  activeTemplateFilter: "ecard",
  voomResult: null
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
  logo: "https://aiwe.cc/wp-content/uploads/2026/02/6e1716a9965b002e6c25ab6f9d383e60.jpg",
  title: "請輸入姓名或公司名稱",
  desc: "✨ 一行建議16個字\n✨ 可以簡介公司或是活動內容\n✨ 四到六排的高度較為適中，不建議太長\n✨ 多分享、多收穫",
  title_align: "start",
  background: {
    type: "linearGradient",
    angle: "88deg",
    startColor: "#57142b",
    endColor: "#46250c"
  },
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
};

const defaultRichMenu = {
  name: "MyCard Rich Menu",
  chatBarText: "Menu",
  selected: true,
  size: { width: 2500, height: 1686 },
  areas: [
    {
      bounds: { x: 0, y: 0, width: 1250, height: 843 },
      action: { type: "uri", uri: "https://myvard.fangwl591021.workers.dev/hub.html" }
    },
    {
      bounds: { x: 1250, y: 0, width: 1250, height: 843 },
      action: { type: "message", text: "mycard" }
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
    showToast("Content Hub loaded");
  } catch (error) {
    showToast(error.message || "Failed to load Content Hub");
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
  loadRichMenuSample();
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
      <span>${escapeHtml(item.module)} | ${escapeHtml(item.status)}</span>
      <p>${escapeHtml(item.description || item.template_id)}</p>
      <p><code>${escapeHtml(item.template_id)}</code></p>
    </article>
  `).join("") || `<div class="empty-row">No templates</div>`;
}

function renderTemplateSelect() {
  els.ecardTemplateSelect.innerHTML = state.ecardTemplates.map((item) => `
    <option value="${escapeHtml(item.template_id)}">${escapeHtml(item.name)}</option>
  `).join("");
  if (state.ecardTemplates.some((item) => item.template_id === "ecard-v2-business-card")) {
    els.ecardTemplateSelect.value = "ecard-v2-business-card";
  }
  loadSelectedTemplateSample();
}

function loadRichMenuSample() {
  const template = state.richMenuTemplates.find((item) => item.template_id === "rich-menu-basic-2500") || state.richMenuTemplates[0];
  const sample = template?.sample_data || defaultRichMenu;
  els.richMenuInput.value = pretty(sample);
  renderRichMenuPreview(sample, []);
}

function loadSelectedTemplateSample() {
  const template = state.ecardTemplates.find((item) => item.template_id === els.ecardTemplateSelect.value);
  const sample = template?.sample_data || defaultCardData;
  els.ecardDataInput.value = pretty(sample);
  renderEcardPreview(sample, {}, template?.template_id || "ecard-v2-business-card");
}

async function generateFlex() {
  try {
    const templateId = els.ecardTemplateSelect.value || "ecard-v2-business-card";
    const data = JSON.parse(els.ecardDataInput.value || "{}");
    const result = await hub.ecard.generateFlex(templateId, data);
    setOutput(els.flexOutput, result.flex);
    renderEcardPreview(data, result.flex, templateId);
    showToast("Flex JSON generated");
  } catch (error) {
    setOutput(els.flexOutput, { success: false, message: error.message });
    showToast("Flex generation failed");
  }
}

async function validateRichMenu() {
  try {
    const config = JSON.parse(els.richMenuInput.value || "{}");
    const result = await hub.richMenu.validate(config);
    els.richMenuBadge.textContent = result.valid ? "Valid" : "Needs fix";
    setOutput(els.richMenuOutput, result);
    renderRichMenuPreview(result.richMenu || config, result.issues || []);
    showToast(result.valid ? "Rich Menu valid" : "Rich Menu needs fixes");
  } catch (error) {
    els.richMenuBadge.textContent = "Error";
    setOutput(els.richMenuOutput, { success: false, message: error.message });
    showToast("Validation failed");
  }
}

function renderEcardPreview(data = {}, flex = {}, templateId = "") {
  if (!els.ecardPreview) return;
  const background = flex?.body?.background || normalizePreviewBackground(data.background || {});
  const start = background.startColor || background.color || "#57142b";
  const end = background.endColor || background.color || "#46250c";
  const angle = background.angle || "88deg";
  const image = data.logo || data.logo_url || data.logoUrl || data.avatar_url || data.image_url || "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_cafe.png";
  els.ecardPreview.style.background = background.type === "linearGradient"
    ? `linear-gradient(${angle}, ${start}, ${end})`
    : start;
  els.ecardPreviewBadge.textContent = templateId.replace("ecard-", "").toUpperCase();
  els.ecardPreviewAvatar.src = image;
  els.ecardPreviewName.textContent = data.title || data.name || data.company || "E-card";
  els.ecardPreviewRole.textContent = "";
  els.ecardPreviewDesc.textContent = data.desc || data.description || data.service || data.bio || "Nice to exchange cards with you.";
  els.ecardPreviewDesc.style.textAlign = data.title_align === "center" ? "center" : "left";
  const socials = Array.isArray(data.socials) ? data.socials : [];
  const buttons = Array.isArray(data.buttons) && data.buttons.length ? data.buttons : [
    { t: "New Button", u: "https://line.me" }
  ];
  const socialHtml = socials.length ? `<div class="ecard-preview-socials">${socials.slice(0, 5).map((item) => `
    <img src="${escapeHtml(item.iconUrl || item.icon_url || socialIconUrl(item.type))}" alt="${escapeHtml(item.type || "")}">
  `).join("")}</div>` : "";
  const buttonHtml = buttons.filter((button) => !/share|分享/i.test(button.t || button.label || button.l || "")).slice(0, 6).map((button) => `
    <span>${escapeHtml(button.t || button.label || button.l || "New Button")}</span>
  `).join("");
  els.ecardPreviewActions.innerHTML = `${socialHtml}${buttonHtml}`;
}

function normalizePreviewBackground(background) {
  if (background?.type === "linearGradient") return background;
  if (background?.type === "gradient") {
    return {
      type: "linearGradient",
      angle: `${Number(background.angle || 88)}deg`,
      startColor: background.startColor || background.start_color || "#57142b",
      endColor: background.endColor || background.end_color || "#46250c"
    };
  }
  return background;
}

function socialIconUrl(type = "LINE") {
  const icons = {
    YT: "https://aiwe.cc/wp-content/uploads/2026/02/87e6f8054bd3672f2885e38bddb112e2.png",
    FB: "https://aiwe.cc/wp-content/uploads/2026/02/3986d1fd62384c8cdaa0e7c82f2740d1.png",
    LINE: "https://aiwe.cc/wp-content/uploads/2026/02/b75a5831fd553c7130aeafbb9783cf79.png",
    TEL: "https://aiwe.cc/wp-content/uploads/2026/02/7254567388850a6b4d77b75208ebd4b8.png"
  };
  return icons[String(type).toUpperCase()] || icons.LINE;
}

function renderRichMenuPreview(menu = {}, issues = []) {
  if (!els.richMenuPreview) return;
  const size = menu.size || { width: 2500, height: 1686 };
  const width = Number(size.width || 2500);
  const height = Number(size.height || 1686);
  els.richMenuPreviewBadge.textContent = `${width} x ${height}`;
  els.richMenuPreview.style.aspectRatio = `${width} / ${height}`;
  const areas = Array.isArray(menu.areas) ? menu.areas : [];
  els.richMenuPreview.innerHTML = `
    <div class="richmenu-base-label">${escapeHtml(menu.chatBarText || "Menu")}</div>
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
    ${issues.length ? `<div class="richmenu-issue">${issues.length} issues</div>` : ""}
  `;
}

function percentage(value, total) {
  return Math.max(0, Math.min(100, (value / Math.max(1, total)) * 100));
}

async function extractVoom() {
  try {
    const url = els.voomUrlInput.value.trim();
    if (!url) {
      showToast("Enter a VOOM URL");
      return;
    }
    state.voomResult = null;
    setOutput(els.voomOutput, { status: "processing" });
    const result = await hub.voom.extract(url);
    state.voomResult = structuredClone(result);
    setOutput(els.voomOutput, state.voomResult);
    renderVoomPreview(result.job?.result || result.result || result);
    showToast("VOOM extracted");
  } catch (error) {
    setOutput(els.voomOutput, { success: false, message: error.message });
    showToast("VOOM extraction failed");
  }
}

function renderVoomPreview(result = {}) {
  if (!els.voomMediaFrame) return;
  const videoUrl = result.videoUrl || result.video_url || "";
  const thumbnailUrl = result.thumbnailUrl || result.thumbnail_url || result.images?.[0] || "";
  els.voomVideoUrl.textContent = videoUrl || "-";
  els.voomThumbUrl.textContent = thumbnailUrl || "-";
  els.voomSizeBadge.textContent = "Loading media size";
  els.voomMediaFrame.innerHTML = "";

  if (videoUrl) {
    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.src = videoUrl;
    if (thumbnailUrl) video.poster = thumbnailUrl;
    video.addEventListener("loadedmetadata", () => {
      setVoomSize(video.videoWidth, video.videoHeight, "video");
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
    els.voomSizeBadge.textContent = "No media";
    els.voomMediaFrame.innerHTML = "<span>No video or thumbnail extracted</span>";
    return;
  }
  const image = document.createElement("img");
  image.alt = "";
  image.src = url;
  image.addEventListener("load", () => {
    setVoomSize(image.naturalWidth, image.naturalHeight, "thumbnail");
  });
  image.addEventListener("error", () => {
    els.voomSizeBadge.textContent = "Media failed to load";
  });
  els.voomMediaFrame.append(image);
}

function setVoomSize(width, height, source = "detected") {
  const safeWidth = Number(width || 0);
  const safeHeight = Number(height || 0);
  if (!safeWidth || !safeHeight) {
    els.voomSizeBadge.textContent = "Unable to detect size";
    return;
  }
  const ratio = simplifyRatio(safeWidth, safeHeight);
  const orientation = safeWidth > safeHeight ? "landscape" : safeWidth < safeHeight ? "portrait" : "square";
  els.voomSizeBadge.textContent = `True quality: ${safeWidth} x ${safeHeight}`;
  els.voomMediaFrame.style.aspectRatio = `${safeWidth} / ${safeHeight}`;
  updateVoomOutputDimensions({
    width: safeWidth,
    height: safeHeight,
    aspectRatio: ratio,
    orientation,
    source
  });
}

function updateVoomOutputDimensions(dimensions) {
  if (!state.voomResult) return;
  const next = structuredClone(state.voomResult);
  if (next.job?.result) {
    next.job.result.media = dimensions;
  } else if (next.result) {
    next.result.media = dimensions;
  } else {
    next.media = dimensions;
  }
  state.voomResult = next;
  setOutput(els.voomOutput, next);
}

function simplifyRatio(width, height) {
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function gcd(a, b) {
  let x = Math.abs(Number(a) || 0);
  let y = Math.abs(Number(b) || 0);
  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
}

async function seedTemplates() {
  try {
    const token = els.adminTokenInput.value.trim();
    if (!token) {
      showToast("Enter MIGRATION_ADMIN_TOKEN");
      return;
    }
    const result = await hub.seed(token);
    setOutput(els.flexOutput, result);
    await loadHub();
    showToast(`Seeded ${result.seeded || 0} templates`);
  } catch (error) {
    showToast(error.message || "Seed failed");
  }
}

async function copyFlex() {
  await navigator.clipboard.writeText(els.flexOutput.textContent || "{}");
  showToast("Flex JSON copied");
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
els.ecardTemplateSelect.addEventListener("change", loadSelectedTemplateSample);
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
