import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import UsageBar from "../components/UsageBar.jsx";
import InstructionsModal from "../components/InstructionsModal.jsx";
import ShareModal from "../components/ShareModal.jsx";
import { api } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadChats = useCallback(async () => {
    const { chats } = await api.listChats();
    setChats(chats);
    return chats;
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    (async () => {
      if (!chatId) {
        setActiveChat(null);
        setMessages([]);
        return;
      }
      try {
        const { chat, messages } = await api.getChat(chatId);
        setActiveChat(chat);
        setMessages(messages);
      } catch {
        navigate("/chat");
      }
    })();
  }, [chatId, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, uploading]);

  const handleNewChat = async () => {
    const { chat } = await api.createChat({});
    setChats((prev) => [chat, ...prev]);
    navigate(`/chat/${chat._id}`);
    setSidebarOpen(false);
  };

  const handleDeleteChat = async (id) => {
    await api.deleteChat(id);
    setChats((prev) => prev.filter((c) => c._id !== id));
    if (chatId === id) navigate("/chat");
  };

  const ensureChat = async () => {
    if (activeChat) return activeChat;
    const res = await api.createChat({});
    setActiveChat(res.chat);
    setChats((prev) => [res.chat, ...prev]);
    navigate(`/chat/${res.chat._id}`, { replace: true });
    return res.chat;
  };

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;

    const chat = await ensureChat();

    setInput("");
    setError("");
    setSending(true);

    const optimisticUser = {
      _id: `tmp-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const { userMessage, assistantMessage, usage } = await api.sendMessage(chat._id, content);
      setMessages((prev) => [...prev.filter((m) => m._id !== optimisticUser._id), userMessage, assistantMessage]);
      setUser((u) => (u ? { ...u, usage } : u));
      setChats((prev) => {
        const rest = prev.filter((c) => c._id !== chat._id);
        return [{ ...chat, title: chat.title === "New chat" ? content.slice(0, 60) : chat.title }, ...rest];
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== optimisticUser._id));
      setError(err.message);
      if (err.data?.windowResetAt) {
        setUser((u) => (u ? { ...u, usage: { ...u.usage, remaining: 0, windowResetAt: err.data.windowResetAt, sessionResetAt: err.data.sessionResetAt } } : u));
      }
    } finally {
      setSending(false);
    }
  };

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const chat = await ensureChat();
    setError("");
    setUploading(true);

    try {
      const dataUrl = await fileToDataUrl(file);
      const { chat: updatedChat, userMessage, assistantMessage } = await api.uploadReferenceImage(
        chat._id,
        dataUrl
      );
      setActiveChat(updatedChat);
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const clearReferenceImage = async () => {
    if (!activeChat) return;
    const { chat } = await api.clearReferenceImage(activeChat._id);
    setActiveChat(chat);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const saveInstructions = async (value) => {
    const { chat } = await api.updateChat(activeChat._id, { instructions: value });
    setActiveChat(chat);
  };

  return (
    <div className="h-[100dvh] w-screen flex bg-ink overflow-hidden">
      <Sidebar
        chats={chats}
        activeChatId={chatId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 h-[100dvh]">
        <header className="h-14 shrink-0 border-b border-line flex items-center justify-between px-4 bg-ink/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden text-mist hover:text-paper text-lg leading-none"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-signal to-signal2 shrink-0 md:hidden" />
            <span className="font-display font-medium truncate">
              {activeChat?.title || "New chat"}
            </span>
          </div>
          {activeChat && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowInstructions(true)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-line text-mist hover:bg-white/5 hover:text-paper transition-colors"
              >
                ⚙ Instructions
              </button>
              <button
                onClick={() => setShowShare(true)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-line text-mist hover:bg-white/5 hover:text-paper transition-colors"
              >
                ↗ Share
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto py-6 space-y-4 min-h-0">
          {messages.length === 0 && !uploading && (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-signal to-signal2 mb-4 shadow-glow" />
              <h2 className="font-display text-xl font-semibold mb-1.5">
                Hey {user?.username} 👋
              </h2>
              <p className="text-mist text-sm max-w-sm">
                Ask Kera anything, set custom instructions for this chat, and it'll remember the
                conversation as you go. Type <code className="text-signal">/image</code> followed
                by a description to generate an image, or upload a photo to edit it. 🎨
              </p>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m._id} message={m} />
          ))}

          {(sending || uploading) && (
            <div className="flex justify-start px-4">
              <div className="bg-panel2 border border-line rounded-xl2 rounded-bl-md px-4 py-3.5 flex items-center gap-2">
                {uploading && <span className="text-xs text-mist">uploading image</span>}
                <span className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-mist typing-dot" style={{ animationDelay: "0s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-mist typing-dot" style={{ animationDelay: "0.15s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-mist typing-dot" style={{ animationDelay: "0.3s" }} />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="mx-4 mb-2 text-sm text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2 shrink-0">
            {error}
          </div>
        )}

        {activeChat?.referenceImageUrl && (
          <div className="mx-4 mb-2 flex items-center gap-2 bg-panel2 border border-line rounded-lg px-2.5 py-2 text-xs text-mist shrink-0">
            <img
              src={activeChat.referenceImageUrl}
              alt="Reference"
              className="w-8 h-8 rounded object-cover shrink-0"
            />
            <span className="flex-1 truncate">
              Editing this image — <code className="text-signal">/image</code> will modify it
            </span>
            <button
              onClick={clearReferenceImage}
              className="px-2 py-1 rounded-md hover:bg-white/5 hover:text-paper transition-colors shrink-0"
              title="Stop editing this image"
            >
              ✕ Clear
            </button>
          </div>
        )}

        <div className="p-4 pt-0 shrink-0">
          <div className="flex items-end gap-2 bg-panel2 border border-line rounded-xl2 px-3 py-2 focus-within:border-signal transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickImage}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 text-mist hover:text-paper disabled:opacity-40 transition-colors p-1.5 -mb-0.5"
              title="Upload an image"
            >
              📎
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message Kera… try /image a fox in the snow (Shift+Enter for a new line)"
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm py-1.5 max-h-40"
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="shrink-0 bg-signal hover:bg-signal/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Send
            </button>
          </div>
        </div>

        <UsageBar usage={user?.usage} />
      </main>

      {showInstructions && activeChat && (
        <InstructionsModal
          initialValue={activeChat.instructions}
          onSave={saveInstructions}
          onClose={() => setShowInstructions(false)}
        />
      )}
      {showShare && activeChat && (
        <ShareModal chatId={activeChat._id} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
