import { AppError } from "../utils/AppError.js";

export function notFound(_req, _res, next) {
    next(new AppError(404, "Route not found"));
}

export function errorHandler(err, _req, res, _next) {
    if (err instanceof AppError) {
        return res.status(err.status).json({ error: err.message, details: err.details });
    }
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || "value";
        return res.status(409).json({ error: `That ${field} already exists` });
    }
    if (err.name === "CastError") {
        return res.status(400).json({ error: `Invalid ${err.path}` });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server" });
}