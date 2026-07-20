import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../api/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem("kera_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      localStorage.removeItem("kera_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (email, password) => {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem("kera_token", token);
    setUser(user);
    return user;
  };

  const signup = async (username, email, password) => {
    const { token, user } = await api.signup({ username, email, password });
    localStorage.setItem("kera_token", token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("kera_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, signup, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
