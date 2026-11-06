"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, fieldErrors } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import FormField from "@/components/FormField";
import Alert from "@/components/Alert";

export default function RegisterPage() {
    const router = useRouter();
    const { saveSession } = useAuth();
    const [form, setForm] = useState({ name: "", email: "", password: "" });
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
            const session = await api("/auth/register", { method: "POST", body: form });
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
            <h1 className="text-2xl font-bold">Create an account</h1>

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                {message && <Alert>{message}</Alert>}
                <FormField
                    label="Name"
                    name="name"
                    value={form.name}
                    onChange={update}
                    error={errors.name}
                    autoComplete="name"
                />
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
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                />
                <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {busy ? "Creating account..." : "Register"}
                </button>
            </form>

            <p className="mt-4 text-sm text-slate-600">
                Already registered?{" "}
                <Link href="/login" className="font-medium text-indigo-700 hover:underline">
                    Log in
                </Link>
            </p>
        </div>
    )
}