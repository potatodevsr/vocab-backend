import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type AdminPayload = {
    role?: string;
    username?: string;
};

type UserPayload = {
    role?: string;
    userId: string;
    username?: string;
};

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is missing");
    }

    return secret;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.admin_token;

    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const payload = jwt.verify(token, getJwtSecret()) as AdminPayload;
        res.locals.adminUsername = payload.username;
        next();
    } catch {
        res.status(401).json({ message: "Unauthorized" });
    }
};

export const requireUserAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.user_token;

    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const payload = jwt.verify(token, getJwtSecret()) as UserPayload;

        if (!payload.userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        res.locals.userId = payload.userId;
        next();
    } catch {
        res.status(401).json({ message: "Unauthorized" });
    }
};