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
};

export { getToken };
