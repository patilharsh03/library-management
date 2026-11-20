"use client";

export default function Error({ reset }) {
    return (
        <div className="mx-auto mx-w-md py-16 text-center">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-slate-600">
                An unexpected error occurred. You can try again, or go back to home page.
            </p>
            <div className="mt-6 flex justify-center gap-3">
                <button
                    onClick={() => reset()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
                >
                    Try again
                </button>
                <a
                    href="/"
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50"
                >
                    Home
                </a>
            </div>
        </div>
    )
}