"use client";

import Alert from "@/components/Alert";
import FormField from "@/components/FormField";
import { api, fieldErrors } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewBookPage() {
    const { token, ready } = useRequireAuth("librarian");
    const router = useRouter();
    const [form, setForm] = useState({
        title: "",
        author: "",
        isbn: "",
        category: "",
        copies: "1",
    })
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    const update = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        setErrors({});
        try {
            const { book } = await api("/books", {
                method: "POST",
                token,
                body: { ...form, copies: Number(form.copies) },
            });
            router.push(`/books/${book._id}`)
        } catch (err) {
            const fe = fieldErrors(err);
            setErrors(fe);
            setMessage(Object.keys(fe).length ? "" : err.message)
        } finally {
            setBusy(false);
        }
    }

    if (!ready) return <p className="text-slate-500">Loading...</p>

    return (
        <div className="mx-auto max-w-lg">
            <h1 className="text-2xl font-bold">Add a book</h1>
            <p className="mt-1 text-slate-600">
                Copies are created with barcodes like <span className="font-mono">ISBN-001</span>.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                {message && <Alert>{message}</Alert>}
                <FormField label="Title" name="title" value={form.title} onChange={update} error={errors.title} />
                <FormField label="Author" name="author" value={form.author} onChange={update} error={errors.author} />
                <FormField
                    label="ISBN"
                    name="isbn"
                    value={form.isbn}
                    onChange={update}
                    error={errors.isbn}
                    placeholder="978-0-14-044913-6"
                />
                <FormField
                    label="Category"
                    name="category"
                    value={form.category}
                    onChange={update}
                    error={errors.category}
                    placeholder="Use an existing category to keep filters tidy"
                />
                <FormField
                    label="Number of copies"
                    name="copies"
                    type="number"
                    value={form.copies}
                    onChange={update}
                    error={errors.copies}
                />
                <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {busy ? "Saving..." : "Add book"}
                </button>
            </form>
        </div>
    )
}