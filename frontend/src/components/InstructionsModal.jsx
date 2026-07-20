import React, { useState } from "react";

export default function InstructionsModal({ initialValue, onSave, onClose }) {
  const [value, setValue] = useState(initialValue || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await onSave(value);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-panel border border-line rounded-xl2 w-full max-w-lg p-6 shadow-glow">
        <h2 className="font-display font-semibold text-base mb-1">Chat instructions</h2>
        <p className="text-mist text-xs mb-4">
          Tell Kera how to behave in this chat only — tone, role, constraints. Applied to every
          reply in this conversation.
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={7}
          maxLength={4000}
          placeholder="e.g. You are a concise senior code reviewer. Answer in bullet points and always suggest a safer alternative."
          className="w-full bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-signal focus:ring-1 focus:ring-signal resize-none"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-sm rounded-lg text-mist hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="px-3.5 py-2 text-sm rounded-lg bg-signal hover:bg-signal/90 disabled:opacity-60 text-white transition-colors"
          >
            {busy ? "Saving…" : "Save instructions"}
          </button>
        </div>
      </div>
    </div>
  );
}
