import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-line">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12141a] text-xs text-mist border-b border-line">
        <span className="font-mono">{language || "text"}</span>
        <button
          onClick={copy}
          className="text-xs px-2 py-0.5 rounded-md hover:bg-white/5 transition-colors"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{ margin: 0, padding: "0.85rem", fontSize: "0.82rem", background: "#0f1116" }}
        wrapLongLines
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}
