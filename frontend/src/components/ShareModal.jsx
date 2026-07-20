import React, { useState } from "react";
import { api } from "../api/api.js";

export default function ShareModal({ chatId, onClose }) {
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      const { shareToken } = await api.createShareLink(chatId);
      const url = `${window.location.origin}/share/${shareToken}`;
      setLink(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-panel border border-line rounded-xl2 w-full max-w-md p-6 shadow-glow">
        <h2 className="font-display font-semibold text-base mb-1">Share this chat</h2>
        <p className="text-mist text-xs mb-4">
          Anyone with the link gets a read-only view of this conversation. The link expires 2
          hours after you create it.
        </p>

        {error && (
          <div className="mb-3 text-sm text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {!link ? (
          <button
            onClick={generate}
            disabled={busy}
            className="w-full bg-signal hover:bg-signal/90 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5"
          >
            {busy ? "Creating link…" : "Create share link"}
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 bg-panel2 border border-line rounded-lg px-3 py-2 text-sm text-mist"
            />
            <button
              onClick={copy}
              className="px-3.5 py-2 text-sm rounded-lg bg-signal hover:bg-signal/90 text-white transition-colors whitespace-nowrap"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-3.5 py-2 text-sm rounded-lg text-mist hover:bg-white/5">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
