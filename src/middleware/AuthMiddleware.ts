/**
 * Authentication Middleware
 * JWT token validation middleware for API routes
 * Implements secure session handling for Requirements 19.1, 19.2, 19.3
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../services/AuthenticationService';
import { UserAccount } from '../types';

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: UserAccount;
            userId?: string;
        }
    }
}

export class AuthMiddleware {
    private authService: AuthenticationService;

    constructor() {
        this.authService = new AuthenticationService();
    }

    /**
     * Middleware to verify JWT token and attach user to request
     */
    async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({
                    success: false,
                    error: 'Authorization token required'
                });
                return;
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            const verification = await this.authService.verifyToken(token);

            if (!verification.valid || !verification.user) {
                res.status(401).json({
                    success: false,
                    error: verification.error || 'Invalid token'
                });
                return;
            }

            // Attach user to request for use in route handlers
            req.user = verification.user;
            req.userId = verification.user.id;

            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Authentication middleware error'
            });
        }
    }

    /**
     * Optional authentication middleware - doesn't fail if no token provided
     */
    async optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const authHeader = req.headers.authorization;

            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const verification = await this.authService.verifyToken(token);

                if (verification.valid && verification.user) {
                    req.user = verification.user;
                    req.userId = verification.user.id;
                }
            }

            next();
        } catch (error) {
            // Continue without authentication for optional auth
            next();
        }
    }

    /**
     * Middleware to check if user has specific authentication method
     */
    requireAuthMethod(requiredMethod: 'email' | 'google' | 'facebook') {
        return (req: Request, res: Response, next: NextFunction): void => {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            if (req.user.authMethod !== requiredMethod) {
                res.status(403).json({
                    success: false,
                    error: `${requiredMethod} authentication required`
                });
                return;
            }

            next();
        };
    }

    /**
     * Middleware to check if email is verified (for email auth users)
     */
    requireEmailVerification(req: Request, res: Response, next: NextFunction): void {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }

        if (req.user.authMethod === 'email' && !req.user.emailVerified) {
            res.status(403).json({
                success: false,
                error: 'Email verification required'
            });
            return;
        }

        next();
    }

    /**
     * Middleware to require admin access
     * For now, this is a placeholder - in production this would check admin roles
     */
    async requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // First verify the token
            await this.verifyToken(req, res, () => { });

            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            // For now, allow any authenticated user to access admin endpoints
            // In production, this would check for admin role/permissions
            // Example: if (!req.user.isAdmin) { ... }

            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Admin authentication error'
            });
        }
    }

    /**
     * Rate limiting middleware for authentication attempts
     */
    private authAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();

    rateLimitAuth(maxAttempts: number = 5, windowMinutes: number = 15) {
        return (req: Request, res: Response, next: NextFunction): void => {
            const clientId = req.ip || 'unknown';
            const now = new Date();
            const windowMs = windowMinutes * 60 * 1000;

            const attempts = this.authAttempts.get(clientId);

            if (attempts) {
                const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();

                if (timeSinceLastAttempt > windowMs) {
                    // Reset counter if window has passed
                    this.authAttempts.set(clientId, { count: 1, lastAttempt: now });
                } else if (attempts.count >= maxAttempts) {
                    // Too many attempts within window
                    res.status(429).json({
                        success: false,
                        error: 'Too many authentication attempts. Please try again later.'
                    });
                    return;
                } else {
                    // Increment counter
                    attempts.count++;
                    attempts.lastAttempt = now;
                }
            } else {
                // First attempt
                this.authAttempts.set(clientId, { count: 1, lastAttempt: now });
            }

            next();
        };
    }

    /**
     * Clean up old rate limit entries
     */
    cleanupRateLimitData(): void {
        const now = new Date();
        const windowMs = 15 * 60 * 1000; // 15 minutes

        for (const [clientId, attempts] of this.authAttempts.entries()) {
            const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();
            if (timeSinceLastAttempt > windowMs) {
                this.authAttempts.delete(clientId);
            }
        }
    }
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();