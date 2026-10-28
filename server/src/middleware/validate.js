import { AppError } from "../utils/AppError.js";

export const validate = (schema) => (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const details = result.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
        }));
        return next(new AppError(400, "Validation failed", details));
    }
    req.body = result.data; // cleaned data (trimmed, typed)
    next();
};