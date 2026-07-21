import React, { useEffect, useState } from "react";

function fmtCountdown(target) {
  if (!target) return "";
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return "now";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

export default function UsageBar({ usage }) {
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!usage) return null;

  if (usage.unlimited) {
    return (
      <div className="px-4 py-2.5 border-t border-line bg-panel text-xs text-mist flex items-center gap-1.5">
        <span className="text-signal">⚡</span>
        <span>Unlimited access — admin account</span>
      </div>
    );
  }

  const { remaining = 25, limit = 25, windowResetAt, sessionResetAt } = usage;
  const pct = Math.max(0, Math.min(100, (remaining / limit) * 100));
  const low = remaining <= 5;

  return (
    <div className="px-4 py-2.5 border-t border-line bg-panel text-xs text-mist">
      <div className="flex items-center justify-between mb-1.5">
        <span>
          {remaining}/{limit} messages left this window
        </span>
        <span>resets in {fmtCountdown(windowResetAt)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-panel2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${low ? "bg-bad" : "bg-signal"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {sessionResetAt && (
        <div className="mt-1.5 opacity-70">Session renews in {fmtCountdown(sessionResetAt)}</div>
      )}
    </div>
  );
}
