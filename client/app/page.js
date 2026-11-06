"use client";

import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <p className="text-slate-500">Loading...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold">Library</h1>
      <p className="mt-2 text-slate-600">
        {user ? `Signed in as ${user.name} (${user.role})` : "You are not signed in."}
      </p>
    </div>
  )
}