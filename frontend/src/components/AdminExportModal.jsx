import React, { useEffect, useState } from "react";
import { api } from "../api/api.js";

export default function AdminExportModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [busyAll, setBusyAll] = useState(false);
  const [busyUser, setBusyUser] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .adminListUsers()
      .then(({ users }) => {
        setUsers(users);
        if (users.length) setSelectedUserId(users[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingUsers(false));
  }, []);

  const downloadAll = async () => {
    setError("");
    setBusyAll(true);
    try {
      await api.adminExportAllChats();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAll(false);
    }
  };

  const downloadUser = async () => {
    if (!selectedUserId) return;
    setError("");
    setBusyUser(true);
    try {
      const user = users.find((u) => u.id === selectedUserId);
      await api.adminExportUserChats(selectedUserId, user?.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUser(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-panel border border-line rounded-xl2 w-full max-w-md p-6 shadow-glow">
        <h2 className="font-display font-semibold text-base mb-1">Export chat data 🧪</h2>
        <p className="text-mist text-xs mb-4">
          Testing tool only — downloads full chat history as JSON inside a zip, including image
          URLs. This option is hidden and disabled automatically in production.
        </p>

        {error && (
          <div className="mb-3 text-sm text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <button
              onClick={downloadAll}
              disabled={busyAll}
              className="w-full bg-signal hover:bg-signal/90 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5"
            >
              {busyAll ? "Preparing zip…" : "Download ALL users' chats (.zip)"}
            </button>
          </div>

          <div className="border-t border-line pt-4">
            <label className="block text-xs text-mist mb-1.5">Download a specific user's chats</label>
            <div className="flex gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers || !users.length}
                className="flex-1 bg-panel2 border border-line rounded-lg px-3 py-2 text-sm text-paper disabled:opacity-60"
              >
                {loadingUsers && <option>Loading users…</option>}
                {!loadingUsers && !users.length && <option>No users found</option>}
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.email}) — {u.chatCount} chat{u.chatCount === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
              <button
                onClick={downloadUser}
                disabled={busyUser || !selectedUserId}
                className="px-3.5 py-2 text-sm rounded-lg bg-signal hover:bg-signal/90 disabled:opacity-60 text-white transition-colors whitespace-nowrap"
              >
                {busyUser ? "Preparing…" : "Download"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="px-3.5 py-2 text-sm rounded-lg text-mist hover:bg-white/5">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
