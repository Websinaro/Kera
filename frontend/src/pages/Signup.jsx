import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signup(username, email, password);
      navigate("/chat");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-signal to-signal2" />
          <span className="font-display font-semibold text-xl tracking-tight">Kera</span>
        </div>

        <div className="bg-panel border border-line rounded-xl2 p-7 shadow-glow">
          <h1 className="font-display text-lg font-semibold mb-1">Create your account</h1>
          <p className="text-mist text-sm mb-6">
            You'll get 25 messages every 30 minutes, for up to 2 hours per session.
          </p>

          {error && (
            <div className="mb-4 text-sm text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-mist mb-1 block">Username</label>
              <input
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal focus:ring-1 focus:ring-signal"
                placeholder="yourname"
              />
            </div>
            <div>
              <label className="text-xs text-mist mb-1 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal focus:ring-1 focus:ring-signal"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs text-mist mb-1 block">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal focus:ring-1 focus:ring-signal"
                placeholder="At least 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 bg-signal hover:bg-signal/90 disabled:opacity-60 transition-colors text-white text-sm font-medium rounded-lg py-2.5"
            >
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-mist mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-signal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
