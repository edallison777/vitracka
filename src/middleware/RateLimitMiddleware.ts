/**
 * Rate Limiting Middleware
 * Provides configurable rate limiting for API endpoints
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
    windowMs: number; // Time window in milliseconds
    max: number; // Maximum number of requests per window
    message: string; // Error message when limit is exceeded
    skipSuccessfulRequests?: boolean; // Don't count successful requests
    skipFailedRequests?: boolean; // Don't count failed requests
}

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

// In-memory store for rate limiting (in production, use Redis)
const store: RateLimitStore = {};

/**
 * Create rate limiting middleware
 */
export function rateLimitMiddleware(options: RateLimitOptions) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const key = req.ip || 'unknown';
        const now = Date.now();

        // Clean up expired entries
        if (store[key] && now > store[key].resetTime) {
            delete store[key];
        }

        // Initialize or get current count
        if (!store[key]) {
            store[key] = {
                count: 0,
                resetTime: now + options.windowMs
            };
        }

        // Check if limit exceeded
        if (store[key].count >= options.max) {
            const timeUntilReset = Math.ceil((store[key].resetTime - now) / 1000);

            res.status(429).json({
                error: options.message,
                retryAfter: timeUntilReset
            });
            return;
        }

        // Increment counter
        store[key].count++;

        // Add rate limit headers
        res.set({
            'X-RateLimit-Limit': options.max.toString(),
            'X-RateLimit-Remaining': Math.max(0, options.max - store[key].count).toString(),
            'X-RateLimit-Reset': new Date(store[key].resetTime).toISOString()
        });

        next();
    };
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
    const now = Date.now();
    Object.keys(store).forEach(key => {
        if (store[key] && now > store[key].resetTime) {
            delete store[key];
        }
    });
}

// Clean up every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);