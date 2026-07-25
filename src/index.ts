import 'dotenv-flow/config';
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { VocabWordRouter } from "../prisma/generated/express/VocabWord/VocabWordRouter.js";
import { prisma } from "./helpers/instances.js";
import { requireAuth, requireUserAuth } from "./middleware/auth.js";
import bcrypt from "bcryptjs";
import { UserRouter } from "../prisma/generated/express/User/UserRouter.js";
import { LearningSessionRouter } from "../prisma/generated/express/LearningSession/LearningSessionRouter.js";
import { QuizResultRouter } from "../prisma/generated/express/QuizResult/QuizResultRouter.js";



declare module "express-serve-static-core" {
    interface Request {
        prisma: typeof prisma;
    }
}

const JWT_SECRET = process.env.JWT_SECRET!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use((req, _res, next) => {
    req.prisma = prisma;
    next();
});

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.post("/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
    }
    const user = await prisma.adminUser.findUnique({ where: { username } });
    if (!user) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
    }
    const token = jwt.sign({ role: "admin", username }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ ok: true });
});

app.post("/auth/logout", (_req, res) => {
    res.clearCookie("admin_token");
    res.json({ ok: true });
});

app.get("/auth/me", requireAuth, (_req, res) => {
    res.json({ role: "admin" });
});

app.post("/user/register", async (req, res) => {
    const { email, username, password, firstName, lastName } = req.body;
    if (!email || !username || !password || !firstName || !lastName) {
        res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
        return;
    }
    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
    });
    if (existing) {
        res.status(409).json({ message: "อีเมลหรือชื่อผู้ใช้นี้ถูกใช้แล้ว" });
        return;
    }
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
        data: { email, username, password: hash, firstName, lastName },
    });
    res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
    });
});

app.post("/user/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
        return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        return;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        return;
    }
    const token = jwt.sign(
        { role: "user", userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: "30d" }
    );
    res.cookie("user_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ id: user.id, email: user.email, username: user.username });
});

app.post("/user/logout", (_req, res) => {
    res.clearCookie("user_token");
    res.json({ ok: true });
});

app.get("/user/me", async (req, res) => {
    const token = req.cookies?.user_token;
    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, username: true },
        });
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        res.json(user);
    } catch {
        res.status(401).json({ message: "Unauthorized" });
    }
});

app.use(
    "/",
    VocabWordRouter({
        findMany: {},
        findUnique: {},
        findManyPaginated: {},
        update: {
            before: [requireAuth],
        },
        pagination: {
            defaultLimit: 50,
            maxLimit: 100,
        },
    }),
);

app.use(
    "/",
    UserRouter({
        findMany: {
            before: [requireAuth],
        },
        findUnique: {
            before: [requireAuth],
        },
        findManyPaginated: {
            before: [requireAuth],
        },
        pagination: {
            defaultLimit: 50,
            maxLimit: 100,
        },
    }),
);

app.use(
    "/",
    LearningSessionRouter({
        create: { before: [requireUserAuth] },
        findMany: { before: [requireUserAuth] },
        findManyPaginated: { before: [requireAuth] },
    }),
);

app.use(
    "/",
    QuizResultRouter({
        create: { before: [requireUserAuth] },
        findMany: { before: [requireUserAuth] },
        findManyPaginated: { before: [requireAuth] },
    }),
);

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
});