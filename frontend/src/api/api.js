const BASE = "/api";

function getToken() {
  return localStorage.getItem("kera_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// For endpoints that return a file (zip) instead of JSON. Fetches with the
// same auth header the rest of the app uses, then triggers a normal
// browser "Save as" download from the resulting blob.
async function requestFile(path, fallbackFilename) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackFilename;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const api = {
  signup: (payload) => request("/auth/signup", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),

  listChats: () => request("/chats"),
  createChat: (payload) => request("/chats", { method: "POST", body: payload }),
  getChat: (id) => request(`/chats/${id}`),
  updateChat: (id, payload) => request(`/chats/${id}`, { method: "PUT", body: payload }),
  deleteChat: (id) => request(`/chats/${id}`, { method: "DELETE" }),

  sendMessage: (chatId, content) =>
    request(`/chats/${chatId}/messages`, { method: "POST", body: { content } }),
  reactMessage: (messageId, liked) =>
    request(`/chats/messages/${messageId}/react`, { method: "POST", body: { liked } }),

  uploadReferenceImage: (chatId, imageDataUrl) =>
    request(`/chats/${chatId}/reference-image`, { method: "POST", body: { imageDataUrl } }),
  clearReferenceImage: (chatId) =>
    request(`/chats/${chatId}/reference-image`, { method: "DELETE" }),

  createShareLink: (chatId) => request(`/chats/${chatId}/share`, { method: "POST" }),
  revokeShareLink: (chatId) => request(`/chats/${chatId}/share`, { method: "DELETE" }),

  getSharedChat: (token) => request(`/share/${token}`, { auth: false }),

  // ---- Testing-only chat export (admin, non-production) ----
  adminExportStatus: () => request("/admin/export-status").catch(() => ({ enabled: false })),
  adminListUsers: () => request("/admin/users"),
  adminExportAllChats: () => requestFile("/admin/export/all", "kera-chat-export-all.zip"),
  adminExportUserChats: (userId, username) =>
    requestFile(`/admin/export/user/${userId}`, `kera-chat-export-${username || userId}.zip`),
};

export { getToken };
