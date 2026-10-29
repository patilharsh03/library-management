import { Router } from "express";
import { z } from "zod";
import { Book, Copy, Reservation } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { fillQueueFromAvailableCopies } from "../services/reservationService.js";

const router = Router();

// ---------- validation schemas ----------
const isbnSchema = z
    .string()
    .trim()
    .transform((s) => s.replace(/[-\s]/g, "").toUpperCase())
    .pipe(z.string().regex(/^(\d{9}[\dX]|\d{13})$/, "Enter a valid ISBN-10 or ISBN-13"));

const createBookSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(200),
    author: z.string().trim().min(1, "Author is required").max(100),
    isbn: isbnSchema,
    category: z.string().trim().min(1, "Category is required").max(50),
    copies: z.number().int().min(0).max(50).default(1),
});

const addCopiesSchema = z.object({
    count: z.number().int("Count must be a whole number").min(1).max(20),
});

const listQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    category: z.string().trim().max(50).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
});

// ---------- helpers ----------
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function addCopies(book, count) {
    const existing = await Copy.countDocuments({ book: book._id });
    const docs = Array.from({ length: count }, (_, i) => ({
        book: book._id,
        barcode: `${book.isbn}-${String(existing + i + 1).padStart(3, "0")}`,
    }));
    return Copy.insertMany(docs);
}

async function copyCounts(bookId) {
    const [totalCopies, availableCopies, waitingReservations] = await Promise.all([
        Copy.countDocuments({ book: bookId }),
        Copy.countDocuments({ book: bookId, status: "available" }),
        Reservation.countDocuments({ book: bookId, status: "waiting"}),
    ]);
    return { totalCopies, availableCopies, waitingReservations };
}

// ---------- routes ----------

// Search / list (public)
router.get("/", async (req, res) => {
    const { q, category, page, limit } = listQuerySchema.parse(req.query);

    const filter = {};
    if (q) {
        const rx = new RegExp(escapeRegex(q), "i");
        const or = [{ title: rx }, { author: rx }];
        const isbnQuery = q.replace(/[-\s]/g, "");
        if (isbnQuery) or.push({ isbn: new RegExp(escapeRegex(isbnQuery), "i") });
        filter.$or = or;
    }
    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");

    const [total, books] = await Promise.all([
        Book.countDocuments(filter),
        Book.aggregate([
            { $match: filter },
            { $sort: { title: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
                $lookup: { from: "copies", localField: "_id", foreignField: "book", as: "copies" },
            },
            {
                $addFields: {
                    totalCopies: { $size: "$copies" },
                    availableCopies: {
                        $size: {
                            $filter: { input: "$copies", as: "c", cond: { $eq: ["$$c.status", "available"] } },
                        },
                    },
                },
            },
            { $project: { copies: 0, __v: 0 } },
        ]),
    ]);

    res.json({ books, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// Category list for the filter dropdown (public). Must be above "/:id".
router.get("/categories", async (_req, res) => {
    const categories = await Book.distinct("category");
    res.json({ categories: categories.sort() });
});

// One book with counts (public)
router.get("/:id", async (req, res) => {
    const book = await Book.findById(req.params.id).lean();
    if (!book) throw new AppError(404, "Book not found");
    res.json({ book: { ...book, ...(await copyCounts(book._id)) } });
});

// Create a book, optionally with initial copies (librarian)
router.post(
    "/",
    requireAuth,
    requireRole("librarian"),
    validate(createBookSchema),
    async (req, res) => {
        const { copies, ...data } = req.body;
        const book = await Book.create(data);
        if (copies > 0) await addCopies(book, copies);
        res.status(201).json({ book: { ...book.toObject(), ...(await copyCounts(book._id)) } });
    }
);

// Add more copies to an existing book (librarian)
router.post(
    "/:id/copies",
    requireAuth,
    requireRole("librarian"),
    validate(addCopiesSchema),
    async (req, res) => {
        const book = await Book.findById(req.params.id);
        if (!book) throw new AppError(404, "Book not found");
        await addCopies(book, req.body.count);
        await fillQueueFromAvailableCopies(book._id);
        res.status(201).json({ ...(await copyCounts(book._id)) });
    }
);

// List the physical copies and their status (librarian)
router.get("/:id/copies", requireAuth, requireRole("librarian"), async (req, res) => {
    const book = await Book.findById(req.params.id);
    if (!book) throw new AppError(404, "Book not found");
    const copies = await Copy.find({ book: book._id }).sort({ barcode: 1 });
    res.json({ copies });
});

export default router;