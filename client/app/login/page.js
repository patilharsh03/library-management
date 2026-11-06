"use client"

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, fieldErrors } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import FormField from "@/components/FormField";
import Alert from "@/components/Alert";

const DEMO_PASSWORD = "demo1234";
const DEMO_ACCOUNTS = [
    { label: "Librarian", email: "librarian@demo.com" },
    { label: "Member", email: "aarav@demo.com" },
];

export default function LoginPage() {
    const router = useRouter();
    const { saveSession } = useAuth();
    const [form, setForm] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        setErrors({});
        try {
            const session = await api("/auth/login", { method: "POST", body: form });
            saveSession(session);
            router.push("/");
        } catch (err) {
            const fe = fieldErrors(err);
            setErrors(fe);
            setMessage(Object.keys(fe).length ? "" : err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mx-auto max-w-sm">
            <h1 className="text-2xl font-bold">Log in</h1>

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                {message && <Alert>{message}</Alert>}
                <FormField
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={update}
                    error={errors.email}
                    autoComplete="email"
                />
                <FormField
                    label="Password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={update}
                    error={errors.password}
                    autoComplete="current-password"
                />
                <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {busy ? "Logging in..." : "Log in"}
                </button>
            </form>

            <p className="mt-4 text-sm text-slate-600">
                New here?{" "}
                <Link href="/register" className="font-medium text-indigo-700 hover:underline">
                    Create an account
                </Link>
            </p>

            <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-700">Try a demo account</p>
                <p className="mt-1 text-xs text-slate-500">Click one to fill the form, then log in.</p>
                <div className="mt-3 flex gap-2">
                    {DEMO_ACCOUNTS.map((a) => (
                        <button
                            key={a.email}
                            type="button"
                            onClick={() => setForm({ email: a.email, password: DEMO_PASSWORD })}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                        >
                            {a.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}