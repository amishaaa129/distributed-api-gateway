import "express";

declare global {
    namespace Express {
        interface Request {
            user?: {
                _id: number;
                email?: string;
                roles?: string[];
            };
        }
    }
}

export {};