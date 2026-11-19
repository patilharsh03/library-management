"use client";

import Alert from "@/components/Alert";
import FormField from "@/components/FormField";
import { api, fieldErrors } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { useRequireAuth } from "@/lib/useRequireAuth";
import Link from "next/link";
import { useState } from "react";

function IssueCard({ token }) {
    const [form, setForm] = useState({ memberEmail: "", barcode: "" });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);

    const update = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        setErrors({});
        setResult(null);
        try {
            const { loan } = await api("/loans/issue", { method: "POST", token, body: form })
            setResult(loan);
            setForm({ memberEmail: "", barcode: "" })
        } catch (err) {
            const fe = fieldErrors(err);
            setErrors(fe);
            setMessage(Object.keys(fe).length ? "" : err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Issue a copy</h2>
            <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
                {message && <Alert>{message}</Alert>}
                <FormField
                    label="Member email"
                    name="memberEmail"
                    type="email"
                    value={form.memberEmail}
                    onChange={update}
                    error={errors.memberEmail}
                    placeholder="aarav@demo.com"
                />
                <FormField
                    label="Copy barcode"
                    name="barcode"
                    value={form.barcode}
                    onChange={update}
                    error={errors.barcode}
                    placeholder="9780132350884-001"
                />
                <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {busy ? "Issuing..." : "Issue copy"}
                </button>
            </form>

            {result && (
                <div className="mt-4">
                    <Alert type="success">
                        Issued <strong>{result.book.title}</strong> ({result.copy.barcode}) to{" "}
                        {result.member.name}. Due {formatDate(result.dueAt)}.
                    </Alert>
                </div>
            )}
        </section>
    );
}

function ReturnCard({ token }) {
    const [barcode, setBarcode] = useState("");
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        setErrors({});
        setResult(null);
        try {
            const res = await api("/loans/return", { method: "POST", token, body: { barcode } });
            setResult(res);
            setBarcode("")
        } catch (err) {
            const fe = fieldErrors(err);
            setErrors(fe);
            setMessage(Object.keys(fe).length ? "" : err.message);
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Return a copy</h2>
            <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
                {message && <Alert>{message}</Alert>}
                <FormField
                    label="Copy barcode"
                    name="barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    error={errors.barcode}
                    placeholder="9780132350884-001"
                />
                <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {busy ? "Returning..." : "Return copy"}
                </button>
            </form>

            {result && (
                <div className="mt-4 space-y-2">
                    <Alert type="success">
                        Returned <strong>{result.loan.book.title}</strong> ({result.loan.copy.barcode}) from{" "}
                        {result.loan.member.name}.
                    </Alert>

                    {result.fineAmount > 0 ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            <p className="font-medium">Collect a fine of {formatMoney(result.fineAmount)}</p>
                            <p>
                                {result.lateDays} {result.lateDays === 1 ? "day" : "days"} late.
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-600">Returned on time. No fine.</p>
                    )}

                    {result.heldFor ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            <p className="font-medium">Set this copy aside</p>
                            <p>
                                It is held for {result.heldFor.name} ({result.heldFor.email}), who was next in the
                                queue.
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-600">Nobody is waiting. The copy is back on the shelf.</p>
                    )}
                </div>
            )}
        </section>
    )
}

export default function DeskPage() {
    const { token, ready } = useRequireAuth("librarian");

    if (!ready) return <p className="text-slate-500">Loading...</p>

    return (
        <div>
            <h1 className="text-2xl font-bold">Library desk</h1>
            <p className="mt-1 text-slate-600">Issue and return copies using their barcodes.</p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
                <IssueCard token={token} />
                <ReturnCard token={token} />
            </div>

            <p className="mt-6 text-sm text-slate-500">
                Need a barcode? Open a book from the{" "}
                <Link href="/" className="font-medium text-indigo-700 hover:underline">
                    catalogue
                </Link>{" "}
                and look at its copies list, or{" "}
                <Link href="/books/new" className="font-medium text-indigo-700 hover:underline">
                    add a new book
                </Link>
                .
            </p>
        </div>
    )
}