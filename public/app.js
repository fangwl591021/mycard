const storeKey = "cardking-state-v1";
const apiBase = "";
const liffId = "1660923784-EcoH8aMs";

const defaultState = {
  activeId: "card-1",
  cards: [
    {
      id: "card-1",
      theme: "mint",
      name: "王小明",
      title: "業務總監",
      company: "名片王科技",
      phone: "0912-345-678",
      email: "sales@cardking.local",
      social: "@cardking",
      bio: "用一張可追蹤、可更新、可收單的數位名片，替業務團隊建立一致的第一印象。",
      views: 128,
      leads: 9
    }
  ],
  leads: [
    { name: "陳小姐", contact: "chen@example.com", source: "王小明", date: "2026-05-22" },
    { name: "林先生", contact: "0911-222-333", source: "王小明", date: "2026-05-21" }
  ]
};

let state = loadState();
let liffProfile = null;
let liffIdToken = "";
let selectedOcrFile = null;

const form = document.querySelector("#cardForm");
const toast = document.querySelector("#toast");
const fields = {
  name: document.querySelector("#nameInput"),
  title: document.querySelector("#titleInput"),
  company: document.querySelector("#companyInput"),
  phone: document.querySelector("#phoneInput"),
  email: document.querySelector("#emailInput"),
  social: document.querySelector("#socialInput"),
  bio: document.querySelector("#bioInput")
};

function loadState() {
  const raw = localStorage.getItem(storeKey);
  if (!raw) return structuredClone(defaultState);
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function activeCard() {
  return state.cards.find((card) => card.id === state.activeId) || state.cards[0];
}

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "") || "card";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function setLiffStatus(title, detail, ready = false) {
  const status = document.querySelector("#liffStatus");
  status.classList.toggle("ready", ready);
  status.innerHTML = `
    <strong>${title}</strong>
    <span>${detail}</span>
  `;
}

function setReferralBox(url, code) {
  const box = document.querySelector("#referralBox");
  if (!url) {
    box.classList.remove("ready");
    box.innerHTML = `
      <strong>我的推廣連結</strong>
      <span>登入後產生，每個 user 都有自己的專屬連結。</span>
    `;
    return;
  }
  box.classList.add("ready");
  box.innerHTML = `
    <strong>我的推廣連結 ${code || ""}</strong>
    <span>${url}</span>
  `;
}

function setRentStatus(title, detail, ready = false) {
  const status = document.querySelector("#rentStatus");
  if (!status) return;
  status.classList.toggle("ready", ready);
  status.innerHTML = `
    <strong>${title}</strong>
    <span>${detail}</span>
  `;
}

function hydrateForm() {
  const card = activeCard();
  if (!card) return;
  Object.entries(fields).forEach(([key, input]) => {
    input.value = card[key] || "";
  });
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === card.theme);
  });
}

function updatePreview() {
  const card = activeCard();
  if (!card) return;
  const slug = slugify(card.name);
  const cfg = getLocalEcardConfig(card);
  document.querySelector("#cardPreview").className = `business-card line-card-v1 theme-${card.theme}`;
  document.querySelector("#cardPreview").style.setProperty("--line-card-img", `url("${cfg.imgUrl}")`);
  document.querySelector("#avatarPreview").textContent = "分享";
  document.querySelector("#previewName").textContent = card.name || "未命名";
  document.querySelector("#previewRole").textContent = `${card.title || "職稱"} · ${card.company || "公司"}`;
  document.querySelector("#previewBio").textContent = cfg.desc || card.bio || "尚未填寫介紹。";
  document.querySelector("#previewBio").style.color = cfg.descColor;
  document.querySelector("#previewBio").style.textAlign = cfg.descAlign;
  document.querySelector("#previewPhone").href = `tel:${card.phone || ""}`;
  document.querySelector("#previewPhone").textContent = "行動電話";
  document.querySelector("#previewEmail").href = `mailto:${card.email || ""}`;
  document.querySelector("#previewEmail").textContent = "電子郵件";
  document.querySelector("#previewSocial").href = "#";
  document.querySelector("#previewSocial").textContent = "加LINE好友";
  const publicUrl = card.public_url || `${location.origin}/card/${card.public_slug || slug}`;
  document.querySelector("#shareSlug").textContent = `card/${card.public_slug || slug}`;
  document.querySelector("#shareText").textContent = publicUrl;
}

function getLocalEcardConfig(card) {
  const desc = card.bio || card.title || card.company || "";
  return {
    layoutStyle: "landscape",
    imgUrl: card.ecard_img_url || "https://images.unsplash.com/photo-1616628188550-808682f3926d?w=800&q=80",
    imgRatioLandscape: "20:13",
    desc,
    descAlign: "center",
    descColor: "#666666",
    buttons: [
      { l: "加LINE好友", u: card.social ? `https://line.me/R/ti/p/${card.social}` : "https://lin.ee/y7h8BUF", c: "#06C755" },
      { l: "行動電話", u: card.phone ? `tel:${card.phone}` : "tel:XXXXXXXXXX", c: "#3b82f6" },
      { l: "店家地址", u: "https://www.google.com/maps", c: "#1e293b" }
    ]
  };
}

function renderMetrics() {
  const views = state.cards.reduce((sum, card) => sum + Number(card.views || 0), 0);
  const cardLeads = state.cards.reduce((sum, card) => sum + Number(card.leads || 0), 0);
  const totalLeads = state.leads.length + cardLeads;
  const rate = views ? Math.round((totalLeads / views) * 100) : 0;
  document.querySelector("#metricCards").textContent = state.cards.length;
  document.querySelector("#metricViews").textContent = views;
  document.querySelector("#metricLeads").textContent = totalLeads;
  document.querySelector("#metricRate").textContent = `${rate}%`;
}

function renderCardList() {
  const list = document.querySelector("#cardList");
  list.innerHTML = "";
  state.cards.forEach((card) => {
    const item = document.createElement("article");
    item.className = "mini-card";
    item.innerHTML = `
      <strong>${card.name || "未命名"}</strong>
      <p>${card.title || "職稱"} · ${card.company || "公司"}<br>${card.views || 0} 次瀏覽 · ${card.leads || 0} 筆互動</p>
      <div class="mini-actions">
        <button class="ghost-button" data-edit="${card.id}">編輯</button>
        <button class="ghost-button" data-delete="${card.id}">刪除</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function renderLeads() {
  const table = document.querySelector("#leadTable");
  table.innerHTML = `
    <div class="lead-row"><span>姓名</span><span>聯絡方式</span><span>來源名片</span><span>日期</span></div>
    ${state.leads.map((lead) => `
      <div class="lead-row">
        <span>${lead.name}</span>
        <span>${lead.contact}</span>
        <span>${lead.source}</span>
        <span>${lead.date}</span>
      </div>
    `).join("")}
  `;
}

function renderAll() {
  hydrateForm();
  updatePreview();
  renderMetrics();
  renderCardList();
  renderLeads();
}

async function initLiff() {
  if (!window.liff) {
    setLiffStatus("LIFF SDK 未載入", "目前可能是本機 file:// 預覽，正式登入請用 LIFF URL 開啟。");
    return;
  }
  try {
    await liff.init({ liffId });
    if (!liff.isLoggedIn()) {
      setLiffStatus("尚未 LINE 登入", "按 LINE 登入後，系統會建立你的私人名片管理中心。");
      return;
    }
    liffProfile = await liff.getProfile();
    liffIdToken = liff.getIDToken();
    setLiffStatus("LINE 已登入", `${liffProfile.displayName}，正在同步你的資料。`, true);
    await syncLineUser();
    await loadMe();
  } catch (error) {
    setLiffStatus("LIFF 初始化失敗", error.message || "請確認是否由 LIFF URL 開啟。");
  }
}

async function syncLineUser() {
  if (!liffIdToken) return;
  const refCode = localStorage.getItem("mycard_ref") || new URLSearchParams(location.search).get("ref") || "";
  const response = await fetch(`${apiBase}/api/auth/line`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken: liffIdToken, refCode })
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.message || "LINE 身份同步失敗");
  setReferralBox(data.user?.referral_url, data.user?.ref_code);
  return data.user;
}

async function loadMe() {
  const token = await getLineToken();
  const response = await fetch(`${apiBase}/api/me`, {
    headers: { authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.message || "讀取我的資料失敗");
  const points = data.points?.balance ?? 0;
  const cards = await loadRemoteCards(token);
  const rents = await loadRents(token);
  const refCode = data.user?.ref_code ? `，推廣碼 ${data.user.ref_code}` : "";
  setReferralBox(data.user?.referral_url, data.user?.ref_code);
  setLiffStatus("我的資料已讀取", `${data.user?.name || "LINE 使用者"}，目前點數 ${points}${refCode}，同步 ${cards.length} 張名片、${rents.length} 個付費空間。`, true);
  showToast(`同步 ${cards.length} 張名片，目前點數 ${points}`);
}

async function loadRemoteCards(token) {
  const response = await fetch(`${apiBase}/api/cards`, {
    headers: { authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.message || "讀取名片清單失敗");
  if (Array.isArray(data.cards) && data.cards.length) {
    state.cards = data.cards.map(remoteCardToLocalCard);
    state.activeId = state.cards[0].id;
    saveState();
    renderAll();
  }
  return data.cards || [];
}

function remoteCardToLocalCard(card) {
  const fieldsFromCard = card.fields || {};
  const lineCard = card.line_card || {};
  const cfg = parseEcardConfig(lineCard["自訂名片設定"]);
  return {
    id: card.card_id,
    theme: "mint",
    visibility: card.visibility || "private",
    public_slug: card.public_slug || "",
    public_url: card.public_slug ? `${location.origin}/card/${card.public_slug}` : "",
    ecard_img_url: cfg.imgUrl || lineCard["名片圖檔"] || "",
    name: lineCard["姓名"] || fieldsFromCard.name || "未命名",
    title: lineCard["職稱"] || fieldsFromCard.title || "",
    company: lineCard["公司名稱"] || fieldsFromCard.company || "",
    phone: lineCard["手機號碼"] || fieldsFromCard.phone || "",
    email: lineCard["電子郵件"] || fieldsFromCard.email || "",
    social: lineCard["社群帳號"] || fieldsFromCard.line_id || "",
    bio: cfg.desc || lineCard["服務項目"] || (fieldsFromCard.raw_text ? `OCR 原文：${fieldsFromCard.raw_text}` : "由拍照 OCR 建立的私人名片。"),
    views: 0,
    leads: 0
  };
}

function parseEcardConfig(raw) {
  try {
    const cfg = typeof raw === "object" ? raw : JSON.parse(raw || "{}");
    return cfg && typeof cfg === "object" ? cfg : {};
  } catch {
    return {};
  }
}

function localCardToPayload(card) {
  const cfg = getLocalEcardConfig(card);
  return {
    card_id: card.id?.startsWith("card_") ? card.id : undefined,
    visibility: card.visibility || "private",
    public_slug: card.public_slug || "",
    fields: {
      name: card.name || "",
      title: card.title || "",
      company: card.company || "",
      phone: card.phone || "",
      email: card.email || "",
      line_id: card.social || "",
      website: "",
      address: "",
      service: card.bio || "",
      raw_text: card.bio || ""
    },
    line_card: {
      "姓名": card.name || "",
      "職稱": card.title || "",
      "公司名稱": card.company || "",
      "手機號碼": card.phone || "",
      "電子郵件": card.email || "",
      "社群帳號": card.social || "",
      "服務項目": card.bio || "",
      "名片圖檔": cfg.imgUrl || "",
      "自訂名片設定": JSON.stringify(cfg)
    }
  };
}

async function loadRents(token) {
  const response = await fetch(`${apiBase}/api/rents`, {
    headers: { authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.message || "讀取付費空間失敗");
  renderRents(data.rents || []);
  return data.rents || [];
}

function renderRents(rents) {
  if (!rents.length) {
    setRentStatus("尚無付費空間", "你目前是 free user，可先建立 PRO 或 enterprise 草稿。");
    return;
  }
  const detail = rents.map((rent) => `${rent.display_name}：${rent.plan} / ${rent.status}`).join("；");
  setRentStatus(`已建立 ${rents.length} 個空間`, detail, true);
}

async function createRentDraft() {
  const token = await getLineToken();
  const plan = document.querySelector("#rentPlanInput").value;
  const displayName = document.querySelector("#rentNameInput").value.trim();
  const payload = {
    plan,
    type: plan === "enterprise" ? "organization" : "personal",
    display_name: displayName
  };
  const response = await fetch(`${apiBase}/api/rents`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.message || "建立付費空間草稿失敗");
  setRentStatus("付費空間草稿已建立", `${data.rent.display_name}：${data.rent.plan} / ${data.rent.status}`, true);
  showToast("付費空間草稿已建立");
}

async function saveActiveCardRemote() {
  const token = await getLineToken();
  const card = activeCard();
  const isRemote = card.id?.startsWith("card_");
  const response = await fetch(`${apiBase}/api/cards${isRemote ? `/${encodeURIComponent(card.id)}` : ""}`, {
    method: isRemote ? "PUT" : "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(localCardToPayload(card))
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.message || "儲存名片失敗");
  const local = remoteCardToLocalCard(data.card);
  const index = state.cards.findIndex((item) => item.id === card.id);
  if (index >= 0) state.cards[index] = { ...card, ...local };
  state.activeId = local.id;
  saveState();
  renderAll();
  return data.card;
}

async function publishActiveCard() {
  let card = activeCard();
  if (!card.id?.startsWith("card_")) {
    await saveActiveCardRemote();
    card = activeCard();
  }
  const token = await getLineToken();
  const slug = card.public_slug || slugify(card.name || card.id);
  const response = await fetch(`${apiBase}/api/cards/${encodeURIComponent(card.id)}/publish`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ publish: true, slug })
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.message || "發布公開頁失敗");
  const local = remoteCardToLocalCard(data.card);
  local.public_url = data.public_url;
  const index = state.cards.findIndex((item) => item.id === card.id);
  if (index >= 0) state.cards[index] = { ...state.cards[index], ...local };
  state.activeId = local.id;
  saveState();
  renderAll();
  showToast("公開頁已發布");
}

async function deleteRemoteCard(cardId) {
  if (!cardId?.startsWith("card_")) return;
  const token = await getLineToken();
  const response = await fetch(`${apiBase}/api/cards/${encodeURIComponent(cardId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.message || "刪除遠端名片失敗");
}

async function getLineToken() {
  if (liffIdToken) return liffIdToken;
  if (!window.liff) throw new Error("請用 LIFF 開啟後登入");
  if (!liff.isLoggedIn()) {
    liff.login();
    throw new Error("正在前往 LINE 登入");
  }
  liffIdToken = liff.getIDToken();
  if (!liffIdToken) throw new Error("無法取得 LINE idToken");
  return liffIdToken;
}

function applyOcrCardToForm(card) {
  const localCard = remoteCardToLocalCard(card);
  const existingIndex = state.cards.findIndex((item) => item.id === localCard.id);
  if (existingIndex >= 0) {
    state.cards[existingIndex] = localCard;
  } else {
    state.cards.unshift(localCard);
  }
  state.activeId = localCard.id;
  const fieldsFromCard = card.fields || {};
  const mapping = {
    name: fieldsFromCard.name,
    title: fieldsFromCard.title,
    company: fieldsFromCard.company,
    phone: fieldsFromCard.phone,
    email: fieldsFromCard.email,
    social: fieldsFromCard.line_id,
    bio: fieldsFromCard.raw_text ? `OCR 原文：${fieldsFromCard.raw_text}` : "由拍照 OCR 建立的名片資料。"
  };
  Object.entries(mapping).forEach(([key, value]) => {
    if (fields[key] && value !== undefined) {
      fields[key].value = value || "";
      activeCard()[key] = value || "";
    }
  });
  activeCard().views = Number(activeCard().views || 0);
  saveState();
  renderAll();
}

async function scanSelectedCard() {
  if (!selectedOcrFile) throw new Error("請先選擇或拍攝名片圖片");
  const token = await getLineToken();
  const formData = new FormData();
  formData.append("image", selectedOcrFile);
  const result = document.querySelector("#ocrResult");
  result.innerHTML = `
    <strong>辨識中</strong>
    <span>正在上傳到 Worker，完成 OCR、查重與送點流程。</span>
  `;
  const response = await fetch(`${apiBase}/api/cards/scan`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: formData
  });
  const data = await response.json();
  if (response.status === 409 && data.code === "duplicate_card") {
    result.innerHTML = `
      <strong>重複名片</strong>
      <span>${data.message}</span>
    `;
    showToast("重複名片，未建立也未送點");
    return;
  }
  if (!response.ok || !data.ok) {
    throw new Error(data.message || "掃描失敗");
  }
  applyOcrCardToForm(data.card);
  result.innerHTML = `
    <strong>建立完成</strong>
    <span>已建立私人名片，贈送 ${data.points_awarded || 10} 點。</span>
  `;
  showToast(`名片已建立，贈送 ${data.points_awarded || 10} 點`);
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewId);
  });
}

function createCard(copyCurrent = false) {
  const base = copyCurrent ? activeCard() : defaultState.cards[0];
  const card = {
    ...base,
    id: `card-${Date.now()}`,
    name: copyCurrent ? `${base.name} 副本` : "新名片",
    views: 0,
    leads: 0
  };
  state.cards.unshift(card);
  state.activeId = card.id;
  saveState();
  renderAll();
  switchView("dashboard");
  showToast("已建立新名片");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const card = activeCard();
  Object.entries(fields).forEach(([key, input]) => {
    card[key] = input.value.trim();
  });
  saveState();
  renderAll();
  try {
    await saveActiveCardRemote();
    showToast("名片已儲存到 Wasabi");
  } catch (error) {
    showToast(`已先暫存在本機：${error.message}`);
  }
});

Object.values(fields).forEach((input) => {
  input.addEventListener("input", () => {
    const card = activeCard();
    const key = Object.entries(fields).find(([, value]) => value === input)[0];
    card[key] = input.value;
    updatePreview();
  });
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    activeCard().theme = button.dataset.theme;
    saveState();
    renderAll();
  });
});

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelectorAll(".role-card").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".role-card").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    showToast(`目前檢視：${button.dataset.role}`);
  });
});

document.querySelector("#newCardBtn").addEventListener("click", () => createCard(false));
document.querySelector("#newCardBtn2").addEventListener("click", () => createCard(false));
document.querySelector("#duplicateBtn").addEventListener("click", () => createCard(true));
document.querySelector("#lineLoginBtn").addEventListener("click", async () => {
  try {
    if (!window.liff) throw new Error("LIFF SDK 未載入，請用 LIFF URL 開啟");
    await liff.init({ liffId });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    await initLiff();
  } catch (error) {
    showToast(error.message);
  }
});
document.querySelector("#refreshMeBtn").addEventListener("click", async () => {
  try {
    setLiffStatus("同步中", "正在讀取你的點數、推廣連結、名片與付費空間。", true);
    await loadMe();
  } catch (error) {
    showToast(error.message);
  }
});
document.querySelector("#createRentBtn").addEventListener("click", async () => {
  try {
    await createRentDraft();
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector("#cardList").addEventListener("click", async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId) {
    state.activeId = editId;
    saveState();
    renderAll();
    switchView("dashboard");
  }
  if (deleteId) {
    try {
      await deleteRemoteCard(deleteId);
    } catch (error) {
      showToast(error.message);
      return;
    }
    state.cards = state.cards.filter((card) => card.id !== deleteId);
    if (!state.cards.length) createCard(false);
    state.activeId = state.cards[0].id;
    saveState();
    renderAll();
    showToast("名片已刪除");
  }
});

document.querySelector("#addLeadBtn").addEventListener("click", () => {
  const card = activeCard();
  state.leads.unshift({
    name: "新客戶",
    contact: "new-contact@example.com",
    source: card.name,
    date: new Date().toISOString().slice(0, 10)
  });
  card.leads = Number(card.leads || 0) + 1;
  saveState();
  renderAll();
  showToast("已新增測試名單");
});

document.querySelector("#copyShareBtn").addEventListener("click", async () => {
  const text = document.querySelector("#shareText").textContent;
  try {
    await navigator.clipboard.writeText(text);
    showToast("分享連結已複製");
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(document.querySelector("#shareText"));
    selection.removeAllRanges();
    selection.addRange(range);
    showToast("已選取連結，請手動複製");
  }
});

document.querySelector("#publishCardBtn").addEventListener("click", async () => {
  try {
    await publishActiveCard();
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cardking-export.json";
  link.click();
  URL.revokeObjectURL(url);
});

document.querySelector("#ocrPhotoInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  const result = document.querySelector("#ocrResult");
  if (!file) return;
  selectedOcrFile = file;
  result.innerHTML = `
    <strong>${file.name}</strong>
    <span>圖片已選取。按「送出掃描」後會建立私人名片；重複名片不建立也不送點。</span>
  `;
});

document.querySelector("#scanCardBtn").addEventListener("click", async () => {
  try {
    await scanSelectedCard();
  } catch (error) {
    document.querySelector("#ocrResult").innerHTML = `
      <strong>掃描未完成</strong>
      <span>${error.message}</span>
    `;
    showToast(error.message);
  }
});

document.querySelector("#mockOcrBtn").addEventListener("click", () => {
  const mock = {
    name: "張建宏",
    title: "品牌顧問",
    company: "名片王示範租戶",
    phone: "0988-123-456",
    email: "demo@mycard.local",
    social: "@mycard-demo",
    bio: "由拍照 OCR 建立的名片資料，確認後可寫入目前名片。"
  };
  Object.entries(mock).forEach(([key, value]) => {
    fields[key].value = value;
    activeCard()[key] = value;
  });
  saveState();
  renderAll();
  document.querySelector("#ocrResult").innerHTML = `
    <strong>模擬辨識完成</strong>
    <span>已將辨識欄位填入名片編輯器。</span>
  `;
  showToast("OCR 結果已填入表單");
});

renderAll();
initLiff();
