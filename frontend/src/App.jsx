import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Chat from "./pages/Chat.jsx";
import SharedChat from "./pages/SharedChat.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function FullScreenLoader() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-ink text-mist">
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-signal typing-dot" style={{ animationDelay: "0s" }} />
        <span className="w-2 h-2 rounded-full bg-signal typing-dot" style={{ animationDelay: "0.15s" }} />
        <span className="w-2 h-2 rounded-full bg-signal typing-dot" style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/share/:token" element={<SharedChat />} />
      <Route
        path="/chat/:chatId?"
        element={
          <Protected>
            <Chat />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
