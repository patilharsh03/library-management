"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const links = [{ href: "/", label: "Books " }];
    if (user?.role === "member") {
        links.push({ href: "/my/loans", label: "My loans" });
        links.push({ href: "/my/reservations", label: "My reservations" });
    }
    if (user?.role === "librarian") {
        links.push({ href: "/desk", label: "Desk" });
        links.push({ href: "/overdue", label: "Overdue" });
    }

    function handleLogout() {
        logout();
        setOpen(false);
        router.push("/login");
    }

    const linkClass = "rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 hover:text-indigo-700";

    const items = (
        <>
            {links.map((l) => (
                <Link key={l.href} href={l.href} className={linkClass} onClick={() => setOpen(false)}>
                    {l.label}
                </Link>
            ))}
            {!loading && !user && (
                <>
                    <Link href="/login" className={linkClass} onClick={() => setOpen(false)}>
                        Log in
                    </Link>
                    <Link
                        href="/register"
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                        onClick={() => setOpen(false)}
                    >
                        Register
                    </Link>
                </>
            )}
            {user && (
                <>
                    <span className="px-2 text-sm text-slate-500">
                        {user.name} <span className="text-xs">({user.role})</span>
                    </span>
                    <button onClick={handleLogout} className={`${linkClass} text-left`}>
                        Log Out
                    </button>
                </>
            )}
        </>
    );

    return (
        <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                <Link href="/" className="text-lg font-bold text-indigo-700">
                    Library
                </Link>
                <button
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm md:hidden"
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    aria-label="Toggle menu"
                >
                    Menu
                </button>
                <nav className="hidden items-center gap-3 md:flex">{items}</nav>
            </div>
            {open && (
                <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 md:hidden">
                    {items}
                </nav>
            )}
        </header>
    )
}