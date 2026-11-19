"use client";

import Alert from "@/components/Alert";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { useRequireAuth } from "@/lib/useRequireAuth";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function OverduePage() {
    const { token, ready } = useRequireAuth("librarian");
    const [data, setData] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!ready) return;
        api("/loans/overdue", { token })
            .then(setData)
            .catch((err) => setError(err.message))
    }, [ready, token])

    if (!ready) return <p className="text-slate-500">Loading...</p>

    return (
        <div>
            <h1 className="text-2xl font-bold">Overdue loans</h1>

            {error && (
                <div className="mt-4">
                    <Alert>{error}</Alert>
                </div>
            )}

            {!data && !error && <div className="mt-4 h-32 animate-pulse rounded-xl bg-slate-200" />}

            {data && (
                <>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs text-slate-500">Overdue loans</p>
                            <p className="text-2xl font-semibold">{data.count}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs text-slate-500">Fines owed so far</p>
                            <p className={`text-2xl font-semibold ${data.totalFine > 0 ? "text-red-700" : ""}`}>
                                {formatMoney(data.totalFine)}
                            </p>
                        </div>
                    </div>

                    {data.overdue.length === 0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
                            Nothing is overdue.
                        </div>
                    ) : (
                        <ul className="mt-6 space-y-3">
                            {data.overdue.map((l) => (
                                <li
                                    key={l.loanId}
                                    className="rounded-xl border border-red-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold">{l.book.title}</p>
                                            <p className="text-sm text-slate-600">{l.book.author}</p>
                                        </div>
                                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                            {l.lateDays} {l.lateDays === 1 ? "day" : "days"} late
                                        </span>
                                    </div>

                                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                                        <div>
                                            <dt className="text-slate-500">Member</dt>
                                            <dd>
                                                {l.member.name}
                                                <br />
                                                <a
                                                    href={`mailto:${l.member.email}`}
                                                    className="break-all text-indigo-700 hover:underline"
                                                >
                                                    {l.member.email}
                                                </a>
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-500">Copy</dt>
                                            <dd className="break-all">{l.barcode}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-500">Was due</dt>
                                            <dd>{formatDate(l.dueAt)}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-slate-500">Fine so far</dt>
                                            <dd className="font-semibold text-red-700">{formatMoney(l.fine)}</dd>
                                        </div>
                                    </dl>
                                </li>
                            ))}
                        </ul>
                    )}

                    <p className="mt-4 text-sm text-slate-500">
                        To take a book back, use the{" "}
                        <Link href="/desk" className="font-medium text-indigo-700 hover:underline">
                            desk
                        </Link>
                        .
                    </p>
                </>
            )}
        </div>
    )
}