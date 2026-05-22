const tokenKey = "mycard-admin-import-token";

const tokenInput = document.querySelector("#adminTokenInput");
const loadButton = document.querySelector("#loadImportBtn");
const clearButton = document.querySelector("#clearTokenBtn");
const table = document.querySelector("#importTable");
const statusText = document.querySelector("#importStatusText");
const toast = document.querySelector("#toast");

tokenInput.value = localStorage.getItem(tokenKey) || "";

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

async function loadImportUsers() {
  const token = tokenInput.value.trim();
  if (!token) {
    showToast("請先貼上管理 Token");
    return;
  }

  localStorage.setItem(tokenKey, token);
  statusText.textContent = "讀取中...";
  table.innerHTML = "";

  const response = await fetch("/api/admin/import/users?limit=100", {
    headers: { "x-admin-migration-token": token }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.message || "讀取匯入資料失敗");
  }

  setText("#metricBucket", data.bucket || "-");
  setText("#metricPrefix", data.users_prefix || "-");
  setText("#metricProfiles", data.profiles ?? 0);
  setText("#metricImportCards", data.cards ?? 0);
  setText("#metricLogs", data.import_logs ?? 0);
  statusText.textContent = `已讀取 ${data.users?.length || 0} 筆`;
  renderUsers(data.users || []);
}

function renderUsers(users) {
  if (!users.length) {
    table.innerHTML = `<div class="empty-row">Wasabi 裡目前沒有匯入使用者。</div>`;
    return;
  }

  table.innerHTML = `
    <div class="import-row import-head-row">
      <span>姓名</span>
      <span>職稱 / 電話</span>
      <span>舊角色</span>
      <span>Wasabi Key</span>
    </div>
    ${users.map((user) => `
      <div class="import-row">
        <span>
          <strong>${escapeHtml(user.name || "未命名")}</strong>
          <small>${escapeHtml(user.user_id || "")}</small>
        </span>
        <span>
          ${escapeHtml(user.industry || "-")}
          <small>${escapeHtml(user.phone || "")}</small>
        </span>
        <span>
          ${escapeHtml(user.legacy_role || "user")}
          <small>${escapeHtml(user.legacy_network_id || "")}</small>
        </span>
        <span>
          <code>${escapeHtml(user.profile_key || "")}</code>
          <small>${escapeHtml(user.card_key || "")}</small>
        </span>
      </div>
    `).join("")}
  `;
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

loadButton.addEventListener("click", async () => {
  try {
    await loadImportUsers();
    showToast("匯入資料已讀取");
  } catch (error) {
    statusText.textContent = "讀取失敗";
    showToast(error.message);
  }
});

clearButton.addEventListener("click", () => {
  tokenInput.value = "";
  localStorage.removeItem(tokenKey);
  showToast("已清除 Token");
});

if (tokenInput.value) {
  loadImportUsers().catch((error) => {
    statusText.textContent = "讀取失敗";
    showToast(error.message);
  });
}
