import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MessageBubble from "../components/MessageBubble.jsx";
import { api } from "../api/api.js";

export default function SharedChat() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getSharedChat(token)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-ink text-center px-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-signal to-signal2 mb-4" />
        <h1 className="font-display text-lg font-semibold mb-1.5">Link expired</h1>
        <p className="text-mist text-sm mb-6">{error}</p>
        <Link to="/login" className="text-signal text-sm hover:underline">
          Go to Kera
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="h-screen w-screen bg-ink" />;
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <header className="h-14 border-b border-line flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-signal to-signal2 shrink-0" />
          <span className="font-display font-medium truncate">{data.title}</span>
        </div>
        <span className="text-xs text-mist shrink-0">Read-only shared chat</span>
      </header>

      <div className="flex-1 py-6 space-y-4 max-w-3xl w-full mx-auto">
        {data.messages.map((m, i) => (
          <MessageBubble key={i} message={{ ...m, _id: i }} readOnly />
        ))}
      </div>

      <footer className="p-4 text-center text-xs text-mist border-t border-line">
        This link expires at {new Date(data.expiresAt).toLocaleString()}
      </footer>
    </div>
  );
}
