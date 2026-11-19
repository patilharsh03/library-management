"use client";

import { api, fieldErrors } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import Alert from "./Alert";

const STATUS_STYLE = {
    available: "bg-green-100 text-green-800",
    issued: "bg-slate-100 text-slate-700",
    held: "bg-amber-100 text-amber-800",
}

export default function LibrarianPanel({ bookId, token, onChange }) {
    const [copies, setCopies] = useState(null);
    const [count, setCount] = useState("1");
    const [error, setError] = useState("");
    const [countError, setCountError] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api(`/books/${bookId}/copies`, { token });
            setCopies(res.copies);
        } catch (err) {
            setError(err.message)
        }
    }, [bookId, token]);

    useEffect(() => {
        load();
    }, [load]);

    async function addCopies(e) {
        e.preventDefault();
        setBusy(true);
        setError("");
        setCountError("");
        try {
            await api(`/books/${bookId}/copies`, {
                method: "POST",
                token,
                body: { count: Number(count) },
            });
            await load();
            if (onChange) onChange();
        } catch (err) {
            const fe = fieldErrors(err);
            setCountError(fe.count || "");
            if (!fe.count) setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="mt-6 border-t border-slate-200 pt-5">
            <h2 className="text-lg font-semibold">Copies</h2>
            <p className="text-sm text-slate-500">Visible to librarians only.</p>

            {error && (
                <div className="mt-3">
                    <Alert>{error}</Alert>
                </div>
            )}

            {!copies && !error && <div className="mt-3 h-16 animate-pulse rounded-lg bg-slate-200" />}

            {copies && copies.length === 0 && (
                <p className="mt-3 text-sm text-slate-600">This book has no copies yet.</p>
            )}

            {copies && copies.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {copies.map((c) => (
                        <li key={c._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                            <span className="break-all font-mono text-sm">{c.barcode}</span>
                            <span className="flex items-center gap-2">
                                {c.status === "held" && c.heldFor && (
                                    <span className="text-xs text-slate-600">for {c.heldFor.name}</span>
                                )}
                                <span
                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status]}`}
                                >
                                    {c.status}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <form onSubmit={addCopies} className="mt-4 flex items-start gap-2">
                <div>
                    <label htmlFor="count" className="sr-only">
                        Number of copies to add
                    </label>
                    <input
                        id="count"
                        type="number"
                        min="1"
                        max="20"
                        value={count}
                        onChange={(e) => setCount(e.target.value)}
                        className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {countError && <p className="mt-1 text-sm text-red-600">{countError}</p>}
                </div>
                <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {busy ? "Adding..." : "Add copies"}
                </button>
            </form>
            <p className="mt-2 text-xs text-slate-500">
                If members are waiting for this book, new copies go to the queue first.
            </p>
        </section>
    )
}