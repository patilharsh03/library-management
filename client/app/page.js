"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import BookCard from "@/components/BookCard";
import Alert from "@/components/Alert";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/books/categories")
      .then((res) => setCategories(res.categories))
      .catch(() => { });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ page: String(page), limit: "9" });
    if (query) params.set("q", query);
    if (category) params.set("category", category);

    api(`/books?${params}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, category, page]);

  function submit(e) {
    e.preventDefault();
    setPage(1);
    setQuery(input.trim());
  }

  function changeCategory(e) {
    setPage(1);
    setCategory(e.target.value);
  }

  function clearFilters() {
    setInput("");
    setQuery("");
    setCategory("");
    setPage(1);
  }

  const buttonClass = "rounded-lg border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50";

  return (
    <div>
      <h1 className="text-2xl font-bold">Find a book</h1>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by title, author or ISBN"
          aria-label="Search books"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={category}
          onChange={changeCategory}
          aria-label="Category"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700"
        >
          Search
        </button>
      </form>

      <div className="mt-6">
        {error && <Alert>{error}</Alert>}

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <p className="mb-3 text-sm text-slate-500">
              {data.total} {data.total === 1 ? "book" : "books"} found
            </p>

            {data.books.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-slate-600">No books match your search.</p>
                <button onClick={clearFilters} className={`${buttonClass} mt-3`}>
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.books.map((b) => (
                  <BookCard key={b._id} book={b} />
                ))}
              </div>
            )}

            {data.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  className={buttonClass}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {data.page} of {data.totalPages}
                </span>
                <button
                  className={buttonClass}
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}