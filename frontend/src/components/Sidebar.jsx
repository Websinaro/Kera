import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Sidebar({ chats, activeChatId, onNewChat, onDeleteChat, open, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed md:static z-40 top-0 left-0 h-full w-72 bg-panel border-r border-line flex flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-4 flex items-center gap-2 border-b border-line">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-signal to-signal2" />
          <span className="font-display font-semibold tracking-tight">Kera</span>
        </div>

        <div className="p-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 bg-panel2 hover:bg-white/5 border border-line text-sm rounded-lg py-2.5 transition-colors"
          >
            <span className="text-signal text-base leading-none">+</span> New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {chats.length === 0 && (
            <p className="text-mist text-xs px-3 py-4">No chats yet — start one above.</p>
          )}
          {chats.map((c) => (
            <div
              key={c._id}
              onClick={() => navigate(`/chat/${c._id}`)}
              className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                activeChatId === c._id ? "bg-panel2 text-paper" : "text-mist hover:bg-white/5"
              }`}
            >
              <span className="truncate">{c.title || "New chat"}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(c._id);
                }}
                className="opacity-0 group-hover:opacity-100 text-mist hover:text-bad transition-opacity text-xs"
                title="Delete chat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-line flex items-center justify-between">
          <div className="text-sm truncate">
            <div className="font-medium truncate">{user?.username}</div>
            <div className="text-mist text-xs truncate">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="text-xs text-mist hover:text-bad px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
