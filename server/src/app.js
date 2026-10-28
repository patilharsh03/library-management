import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import bookRoutes from "./routes/book.routes.js";

export const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);

app.use(notFound);
app.use(errorHandler);