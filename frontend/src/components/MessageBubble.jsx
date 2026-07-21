import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock.jsx";
import { api } from "../api/api.js";

export default function MessageBubble({ message, readOnly }) {
  const isUser = message.role === "user";
  const isImage = message.type === "image";
  const [copied, setCopied] = useState(false);
  const [imgCopied, setImgCopied] = useState(false);
  const [liked, setLiked] = useState(message.liked);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyImage = async () => {
    try {
      const res = await fetch(message.content);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setImgCopied(true);
      setTimeout(() => setImgCopied(false), 1500);
    } catch {
      // Clipboard image writes aren't supported everywhere - the download
      // button below always works as a fallback.
    }
  };

  const downloadImage = () => {
    const a = document.createElement("a");
    a.href = message.content;
    a.download = `kera-${(message.imagePrompt || "image").slice(0, 40).replace(/\s+/g, "-")}.png`;
    a.click();
  };

  const react = async (value) => {
    if (readOnly) return;
    const next = liked === value ? null : value;
    setLiked(next);
    try {
      await api.reactMessage(message._id, next);
    } catch {
      // non-critical, ignore
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2.5 px-4 animate-fadein`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-signal to-signal2 shrink-0 mt-0.5" />
      )}
      <div className={`max-w-[75ch] w-fit ${isUser ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
        <div
          className={`rounded-xl2 ${isImage ? "p-2" : "px-4 py-3"} text-[0.93rem] ${
            isUser
              ? "bg-signal text-white rounded-br-md"
              : "bg-panel2 border border-line text-paper rounded-bl-md"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : isImage ? (
            <div>
              <img
                src={message.content}
                alt={message.imagePrompt || "Generated image"}
                className="rounded-lg max-w-full max-h-[420px] object-contain"
              />
              {message.imagePrompt && (
                <p className="text-xs text-mist px-1 pt-2">🎨 “{message.imagePrompt}”</p>
              )}
            </div>
          ) : (
            <div className="prose-kera">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const value = String(children).replace(/\n$/, "");
                    if (inline) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                    return <CodeBlock language={match?.[1]} value={value} />;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!readOnly && (
          <div className={`flex items-center gap-1 text-mist text-xs ${isUser ? "pr-1" : "pl-1"}`}>
            {isImage ? (
              <>
                <button
                  onClick={downloadImage}
                  className="px-1.5 py-1 rounded-md hover:bg-white/5 hover:text-paper transition-colors"
                  title="Download image"
                >
                  ⬇ Download
                </button>
                <button
                  onClick={copyImage}
                  className="px-1.5 py-1 rounded-md hover:bg-white/5 hover:text-paper transition-colors"
                  title="Copy image"
                >
                  {imgCopied ? "Copied ✓" : "⧉ Copy image"}
                </button>
              </>
            ) : (
              <button
                onClick={copyMessage}
                className="px-1.5 py-1 rounded-md hover:bg-white/5 hover:text-paper transition-colors"
                title="Copy message"
              >
                {copied ? "Copied ✓" : "⧉ Copy"}
              </button>
            )}
            {!isUser && (
              <>
                <button
                  onClick={() => react(true)}
                  className={`px-1.5 py-1 rounded-md hover:bg-white/5 transition-colors ${
                    liked === true ? "text-good" : "hover:text-paper"
                  }`}
                  title="Like"
                >
                  👍
                </button>
                <button
                  onClick={() => react(false)}
                  className={`px-1.5 py-1 rounded-md hover:bg-white/5 transition-colors ${
                    liked === false ? "text-bad" : "hover:text-paper"
                  }`}
                  title="Dislike"
                >
                  👎
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
