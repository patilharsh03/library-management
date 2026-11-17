"use client";

import Alert from "@/components/Alert";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function MyReservationsPage() {
    const { token, ready } = useRequireAuth("member");
    const [items, setItems] = useState(null);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await api("/reservations/mine", { token });
            setItems(res.reservations)
        } catch (err) {
            setError(err.message);
        }
    }, [token]);

    useEffect(() => {
        if (ready) load();
    }, [ready, load]);

    async function cancel(r) {
        const message =
            r.status === "offered"
                ? "Give up the copy being held for you? It will go to the next person in the queue."
                : "Remove yourself from the queue for this book?";
        if (!window.confirm(message)) return;

        setBusyId(r._id);
        setError("");
        try {
            await api(`/reservations/${r._id}`, { method: "DELETE", token });
        } catch (err) {
            setError(err.message);
        } finally {
            await load()
            setBusyId(null);
        }
    }

    if (!ready) return <p className="text-slate-500">Loading...</p>

    return (
        <div>
            <h1 className="text-2xl font-bold">My reservations</h1>

            {error && (
                <div className="mt-4">
                    <Alert>{error}</Alert>
                </div>
            )}

            {!items && !error && <div className="mt-4 h-32 animate-pulse rounded-xl bg-slate-200" />}

            {items && items.length === 0 && (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
                    You have no active reservations.{" "}
                    <Link href="/" className="font-medium text-indigo-700 hover:underline">
                        Find a book
                    </Link>
                </div>
            )}

            {items && items.length > 0 && (
                <ul className="mt-4 space-y-3">
                    {items.map((r) => (
                        <li key={r._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <Link
                                        href={`/books/${r.book._id}`}
                                        className="font-semibold hover:text-indigo-700"
                                    >
                                        {r.book.title}
                                    </Link>
                                    <p className="text-sm text-slate-600">{r.book.author}</p>
                                </div>
                                <button
                                    onClick={() => cancel(r)}
                                    disabled={busyId === r._id}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                                >
                                    {busyId === r._id ? "Cancelling..." : "Cancel"}
                                </button>
                            </div>

                            {r.status === "offered" ? (
                                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                                    <p className="font-medium">Ready for pickup</p>
                                    <p>
                                        A copy is being held for you
                                        {r.heldCopy ? ` (barcode ${r.heldCopy.barcode})` : ""}. Collect it at the
                                        library desk.
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
                                    <p className="font-medium">Number {r.position} in the queue</p>
                                    <p>You'll be offered the next copy that is returned.</p>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}