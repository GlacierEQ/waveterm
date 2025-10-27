
import rateLimit from 'express-rate-limit';

export const createRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

export const aiRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit AI requests
    message: 'AI rate limit exceeded, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
