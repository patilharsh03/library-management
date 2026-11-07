import Link from "next/link";
import AvailabilityBadge from "./AvailabilityBadge";

export default function BookCard({ book }) {
    return (
        <Link
            href={`/books/${book._id}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow"
        >
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">{book.category}</p>
            <h2 className="mt-1 text-lg font-semibold leading-snug">{book.title}</h2>
            <p className="text-sm text-slate-600">{book.author}</p>
            <div className="mt-3">
                <AvailabilityBadge available={book.availableCopies} total={book.totalCopies} />
            </div>
        </Link>
    )
}