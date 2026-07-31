import { pool } from "../db/db.js";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { scopeMap, routeConfig } from "../config/scopes.js";
import { registry } from "../config/registry.js";

const verifyJWT = async (req, res, next) => {
    try {
        const token =
            req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized request"
            });
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!
        ) as JwtPayload;

        const result = await pool.query(
            "SELECT id,email FROM users WHERE id=$1",
            [decodedToken._id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid access token"
            });
        }
        req.user = result.rows[0];
        next();

    } catch (error: any) {
        return res.status(401).json({
            message: error.message
        });
    }
};

const authoriseRoles = async (req, res, next) => {
    try {
        const roleResult = await pool.query(
            `SELECT role FROM user_roles WHERE user_id=$1`,
            [req.user.id]
        );

        const allowedScopes = roleResult.rows.flatMap(
            r => scopeMap[r.role] || []
        );

        const route = registry.find(r =>
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

export { verifyJWT, authoriseRoles };