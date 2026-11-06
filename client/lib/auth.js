"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);
const STORAGE_KEY = "library_token";

function readToken() {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

function writeToken(token) {
    try {
        if (token) localStorage.setItem(STORAGE_KEY, token);
        else localStorage.removeItem(STORAGE_KEY);
    } catch { }
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const saved = readToken();
        if (!saved) {
            setLoading(false);
            return;
        }
        api("/auth/me", { token: saved })
            .then(({ user }) => {
                setToken(saved);
                setUser(user);
            })
            .catch(() => writeToken(null))
            .finally(() => setLoading(false));
    }, []);

    const saveSession = useCallback(({ token, user }) => {
        writeToken(token);
        setToken(token);
        setUser(user);
    }, []);

    const logout = useCallback(() => {
        writeToken(null);
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ token, user, loading, saveSession, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);