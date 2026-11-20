import Link from "next/link";

export default function NotFound() {
    return (
        <div className="mx-auto max-w-md py-16 text-center">
            <p className="text-5xl font-bold text-indigo-600">404</p>
            <h1 className="mt-3 text-2xl font-bold">Page not found</h1>
            <p className="mt-2 text-slate-600">
                The page you are looking for doesn't exist or has moved.
            </p>
            <Link
                href="/"
                className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
            >
                Back to books
            </Link>
        </div>
    )
}