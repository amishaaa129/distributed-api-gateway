import { pool } from "../db/db.js";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import ms from "ms";

const generateAccessAndRefreshToken = async (userId: number) => {
    const userResult = await pool.query(
        `SELECT id,email FROM users WHERE id=$1`,
        [userId]
    );

    if (userResult.rows.length === 0) {
        throw new Error("User not found");
    }

    const roleResult = await pool.query(
        `SELECT role FROM user_roles WHERE user_id=$1`,
        [userId]
    );

    const user = userResult.rows[0];
    const roles = roleResult.rows.map(r => r.role);

    const accessToken = jwt.sign(
        {
            _id: user.id,
            email: user.email,
            roles
        },
        process.env.ACCESS_TOKEN_SECRET!,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY!
        }
    );

    const refreshToken = jwt.sign(
        {
            _id: user.id
        },
        process.env.REFRESH_TOKEN_SECRET!,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY!
        }
    );

    const expiresAt = new Date(
        Date.now() + ms(process.env.REFRESH_TOKEN_EXPIRY!)
    );

    await pool.query(
        `INSERT INTO refresh_tokens(user_id,token,expires_at)
        VALUES($1,$2,$3)`,
        [user.id, refreshToken, expiresAt]
    );

    return { accessToken, refreshToken };
};

const registerUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const existing = await pool.query(
            "SELECT id FROM users WHERE email=$1",
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users(email,password)
            VALUES($1,$2)
            RETURNING id,email,created_at`,
            [email, hashedPassword]
        );

        return res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });
    } catch (err: any) {
        return res.status(500).json({
            message: err.message
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const result = await pool.query(
            "SELECT * FROM users WHERE email=$1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(
            password,
            user.password
        );
        if (!valid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(user.id);

        const { password: _, ...safeUser } = user;

        const options = {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({
                message: "Logged in successfully",
                user: safeUser
            });
    } catch (err: any) {
        return res.status(500).json({
            message: err.message
        });
    }
};

const logoutUser = async (req, res) => {
    try {
        await pool.query(
            `DELETE FROM refresh_tokens
            WHERE user_id=$1`,
            [req.user._id]
        );
        const options = {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        };
        return res
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .status(200)
            .json({
                message: "Logged out successfully"
            });
    } catch (err: any) {
        return res.status(500).json({
            message: err.message
        });
    }
};

const refreshAccessToken = async (req, res) => {
    try {
        const incomingRefreshToken =
            req.cookies?.refreshToken || req.body?.refreshToken;

        if (!incomingRefreshToken) {
            return res.status(401).json({
                message: "Refresh token missing"
            });
        }

        const decoded = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET!
        ) as JwtPayload;

        const tokenResult = await pool.query(
            `SELECT * FROM refresh_tokens
            WHERE user_id=$1
            AND token=$2 AND expires_at > NOW()`,
            [decoded._id, incomingRefreshToken]
        );

        if (tokenResult.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid refresh token"
            });

        }

        await pool.query(`
            DELETE FROM refresh_tokens WHERE token=$1`,
            [incomingRefreshToken]
        );

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(decoded._id);

        const options = {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        };

        return res
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .status(200)
            .json({
                message: "Access token refreshed"
            });

    } catch (err: any) {
        return res.status(401).json({
            message: err.message
        });
    }
};

export { registerUser, loginUser, logoutUser, refreshAccessToken };