import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { AppError } from "../utils/AppError.js";

export async function requireAuth(req, _res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new AppError(401, "Please log in first");

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        throw new AppError(401, "Your session has expired, please log in again");
    }

    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) throw new AppError(401, "Account no longer exists");

    req.user = user;
    next();
}

export const requireRole = (...roles) => (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
        throw new AppError(403, "You don't have permission to do that");
    }
    next();
};