import { pool } from "../db/db.js";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type {
    Request,
    Response,
    NextFunction
} from "express";
import { scopeMap } from "../config/scopes.js";
import { registry } from "../config/registry.js";

const verifyJWT = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req
                .header("Authorization")
                ?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized request"
            });
        }

        const decodedToken = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET!
        ) as JwtPayload;

        const result = await pool.query(
            "SELECT id, email FROM users WHERE id=$1",
            [decodedToken._id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid access token"
            });
        }

        req.user = {
            _id: result.rows[0].id,
            email: result.rows[0].email
        };

        next();

    } catch (error: any) {
        return res.status(401).json({
            message: error.message
        });
    }
};

const authoriseRoles = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized request"
            });
        }

        const user = req.user;

        const roleResult = await pool.query(
            `SELECT role
             FROM user_roles
             WHERE user_id=$1`,
            [user._id]
        );

        const allowedScopes = roleResult.rows.flatMap(
            (r: { role: string }) =>
                scopeMap[r.role] || []
        );

        const route = registry.find(
            r =>
                req.originalUrl.startsWith(r.path)
        );

        if (!route) {
            return res.status(404).json({
                message: "Route not found"
            });
        }

        const requiredScope = route.scope;

        if (!allowedScopes.includes(requiredScope)) {
            return res.status(403).json({
                message: "Forbidden"
            });
        }

        next();

    } catch (error: any) {
        return res.status(500).json({
            message: error.message
        });
    }
};

export {
    verifyJWT,
    authoriseRoles
};