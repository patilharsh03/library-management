import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

function signToken(user) {
    return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
        subject: String(user._id),
        expiresIn: "7d",
    });
}

function publicUser(user) {
    return { id: user._id, name: user.name, email: user.email, role: user.role };
}

router.post("/register", validate(registerSchema), async (req, res) => {
    const { name, email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: "member" });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post("/login", validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) throw new AppError(401, "Invalid email or password");
    res.json({ token: signToken(user), user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
    res.json({ user: publicUser(req.user) });
});

export default router;