"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import AvailabilityBadge from "@/components/AvailabilityBadge";
import Alert from "@/components/Alert";

export default function BookPage() {
    const { id } = useParams();
    const { user, token, loading: authLoading } = useAuth();

    const [book, setBook] = useState(null);
    const [myReservation, setMyReservation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const loadBook = useCallback(async () => {
        try {
            const res = await api(`/books/${id}`);
            setBook(res.book);
        } catch (err) {
            setError(err.status === 404 ? "This book doesn't exist." : err.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const loadMyReservation = useCallback(async () => {
        if (!token || user?.role !== "member") {
            setMyReservation(null);
            return;
        }
        try {
            const { reservations } = await api("/reservations/mine", { token });
            setMyReservation(reservations.find((r) => String(r.book._id) === id) || null);
        } catch {
            setMyReservation(null);
        }
    }, [token, user, id]);

    useEffect(() => {
        loadBook();
    }, [loadBook]);

    useEffect(() => {
        if (!authLoading) loadMyReservation();
    }, [authLoading, loadMyReservation]);

    async function reserve() {
        setBusy(true);
        setError("");
        try {
            await api("/reservations", { method: "POST", token, body: { bookId: id } });
            await Promise.all([loadBook(), loadMyReservation()]);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    function renderAction() {
        if (authLoading) return null;

        if (!user) {
            return book.availableCopies > 0 ? (
                <p className="text-slate-700">
                    Copies are available now.{" "}
                    <Link href="/login" className="font-medium text-indigo-700 hover:underline">
                        Log in
                    </Link>{" "}
                    and ask at the library desk to borrow one.
                </p>
            ) : (
                <Link
                    href="/login"
                    className="inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
                >
                    Log in to reserve
                </Link>
            );
        }

        if (user.role === "librarian") {
            return (
                <p className="text-slate-600">
                    Librarian accounts manage loans from the Desk. Reservations are made by members.
                </p>
            );
        }

        if (myReservation) {
            return myReservation.status === "offered" ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
                    A copy is being held for you
                    {myReservation.heldCopy ? ` (barcode ${myReservation.heldCopy.barcode})` : ""}. Collect
                    it at the library desk.
                </div>
            ) : (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-indigo-800">
                    You are number {myReservation.position} in the queue for this book.
                </div>
            );
        }

        if (book.availableCopies > 0) {
            return (
                <p className="text-slate-700">
                    Copies are available now. Ask at the library desk to borrow one.
                </p>
            );
        }

        return (
            <div>
                <button
                    onClick={reserve}
                    disabled={busy}
                    className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {busy ? "Reserving..." : "Reserve this book"}
                </button>
                <p className="mt-2 text-sm text-slate-500">
                    {book.waitingReservations === 0
                        ? "Nobody is waiting. You would be first in line."
                        : `${book.waitingReservations} ${book.waitingReservations === 1 ? "person is" : "people are"
                        } waiting.`}
                </p>
            </div>
        );
    }

    return (
        <div>
            <Link href="/" className="text-sm font-medium text-indigo-700 hover:underline">
                &larr; Back to books
            </Link>

            {loading && <div className="mt-4 h-48 animate-pulse rounded-xl bg-slate-200" />}

            {!loading && !book && error && (
                <div className="mt-4">
                    <Alert>{error}</Alert>
                </div>
            )}

            {book && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                        {book.category}
                    </p>
                    <h1 className="mt-1 text-2xl font-bold">{book.title}</h1>
                    <p className="text-slate-600">by {book.author}</p>
                    <p className="mt-1 text-sm text-slate-500">ISBN {book.isbn}</p>

                    <div className="mt-4">
                        <AvailabilityBadge available={book.availableCopies} total={book.totalCopies} />
                    </div>

                    <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-lg bg-slate-50 p-3">
                            <dt className="text-xs text-slate-500">Available</dt>
                            <dd className="text-xl font-semibold">{book.availableCopies}</dd>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                            <dt className="text-xs text-slate-500">Total copies</dt>
                            <dd className="text-xl font-semibold">{book.totalCopies}</dd>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                            <dt className="text-xs text-slate-500">Waiting</dt>
                            <dd className="text-xl font-semibold">{book.waitingReservations}</dd>
                        </div>
                    </dl>

                    <div className="mt-5 space-y-3">
                        {error && <Alert>{error}</Alert>}
                        {renderAction()}
                    </div>
                </div>
            )}
        </div>
    );
}