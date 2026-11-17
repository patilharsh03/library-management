"use client";

import Alert from "@/components/Alert";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { useRequireAuth } from "@/lib/useRequireAuth";
import Link from "next/link";
import { useEffect, useState } from "react";

const MAX_LOANS = 3; // display only: the server enforces the real limit

export default function MyLoansPage() {
    const { token, ready } = useRequireAuth("member");
    const [loans, setLoans] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!ready) return;
        api("/loans/mine", { token })
            .then((res) => setLoans(res.loans))
            .catch((err) => setError(err.message))
    }, [ready, token]);

    if (!ready) return <p className="text-slate-500">Loading...</p>

    const open = loans ? loans.filter((l) => !l.returnedAt) : [];
    const history = loans ? loans.filter((l) => l.returnedAt) : [];
    const owed = open.reduce((sum, l) => sum + l.currentFine, 0);

    return (
        <div>
            <h1 className="text-2xl font-bold">My loans</h1>

            {error && (
                <div className="mt-4">
                    <Alert>{error}</Alert>
                </div>
            )}

            {!loans && !error && <div className="mt-4 h-32 animate-pulse rounded-xl bg-slate-200" />}

            {loans && (
                <>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs text-slate-500">Borrowed</p>
                            <p className="text-2xl font-semibold">
                                {open.length} <span className="text-base font-normal text-slate-500">of {MAX_LOANS}</span>
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs text-slate-500">Fines so far</p>
                            <p className={`text-2xl font-semibold ${owed > 0 ? "text-red-700" : ""}`}>
                                {formatMoney(owed)}
                            </p>
                        </div>
                    </div>

                    <h2 className="mt-8 text-lg font-semibold">Currently borrowed</h2>
                    {open.length === 0 ? (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
                            You have no books out.{" "}
                            <Link href="/" className="font-medium text-indigo-700 hover:underline">
                                Find a book
                            </Link>
                        </div>
                    ) : (
                        <ul className="mt-3 space-y-3">
                            {open.map((l) => (
                                <li
                                    key={l._id}
                                    className={`rounded-xl border bg-white p-4 shadow-sm ${l.isOverdue ? "border-red-300" : "border-slate-200"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <Link
                                                href={`/books/${l.book._id}`}
                                                className="font-semibold hover:text-indigo-700"
                                            >
                                                {l.book.title}
                                            </Link>
                                            <p className="text-sm text-slate-600">{l.book.author}</p>
                                        </div>
                                        {l.isOverdue ? (
                                            <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                                Overdue {l.lateDays} {l.lateDays === 1 ? "day" : "days"}
                                            </span>
                                        ) : (
                                            <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                                On time
                                            </span>
                                        )}
                                    </div>

                                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                                        <div>
                                            <dt className="text-slate-500">Issued</dt>
                                            <dd>{formatDate(l.issuedAt)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-500">Due</dt>
                                            <dd>{formatDate(l.dueAt)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-500">Copy</dt>
                                            <dd className="break-all">{l.copy.barcode}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-500">Fine so far</dt>
                                            <dd className={l.currentFine > 0 ? "font-semibold text-red-700" : ""}>
                                                {formatMoney(l.currentFine)}
                                            </dd>
                                        </div>
                                    </dl>
                                </li>
                            ))}
                        </ul>
                    )}

                    <p className="mt-3 text-xs text-slate-500">
                        Late fee: {formatMoney(5)} per day after the due date.
                    </p>

                    {history.length > 0 && (
                        <>
                            <h2 className="mt-8 text-lg font-semibold">History</h2>
                            <ul className="mt-3 space-y-2">
                                {history.map((l) => (
                                    <li
                                        key={l._id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
                                    >
                                        <div>
                                            <Link
                                                href={`/books/${l.book._id}`}
                                                className="font-medium hover:text-indigo-700"
                                            >
                                                {l.book.title}
                                            </Link>
                                            <p className="text-slate-500">Returned {formatDate(l.returnedAt)}</p>
                                        </div>
                                        <span className={l.fineAmount > 0 ? "font-medium text-red-700" : "text-slate-500"}>
                                            {l.fineAmount > 0
                                                ? `Fine ${formatMoney(l.fineAmount)} (${l.lateDays} ${l.lateDays === 1 ? "day" : "days"
                                                } late)`
                                                : "No fine"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </>
            )}
        </div>
    )
}