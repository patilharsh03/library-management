"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth";

// Redirects visitors who aren't logged in (or have the wrong role).
// 'ready' is true only when the page may be shown.
export function useRequireAuth(role) {
    const { user, token, loading } = useAuth();
    const router = useRouter();
    const allowed = !!user && (!role || user.role === role);

    useEffect(() => {
        if (loading) return;
        if (!user) router.replace("/login");
        else if (role && user.role !== role) router.replace("/");
    }, [loading, user, role, router])

    return { user, token, ready: !loading && allowed }
}