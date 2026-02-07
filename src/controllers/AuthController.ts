/**
 * Authentication Controller
 * HTTP endpoints for authentication operations
 * Implements Requirements 19.1, 19.2, 19.3
 */

import { Request, Response } from 'express';
import { AuthenticationService, BiometricAuthRequest } from '../services/AuthenticationService';
import { AuthenticationRequest } from '../types';

export class AuthController {
    private authService: AuthenticationService;

    constructor() {
        this.authService = new AuthenticationService();
    }

    /**
     * POST /auth/login
     * Authenticate user with various methods
     */
    async login(req: Request, res: Response): Promise<void> {
        try {
            const authRequest: AuthenticationRequest = req.body;

            if (!authRequest.method || !authRequest.credentials) {
                res.status(400).json({
                    success: false,
                    error: 'Authentication method and credentials are required'
                });
                return;
            }

            const result = await this.authService.authenticate(authRequest);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    user: {
                        id: result.user!.id,
                        email: result.user!.email,
                        authMethod: result.user!.authMethod,
                        emailVerified: result.user!.emailVerified,
                        isActive: result.user!.isActive
                    },
                    token: result.token,
                    refreshToken: result.refreshToken
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * POST /auth/register
     * Register new user with email and password
     */
    async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    error: 'Email and password are required'
                });
                return;
            }

            const result = await this.authService.registerWithEmail(email, password);

            if (result.success) {
                res.status(201).json({
                    success: true,
                    user: {
                        id: result.user!.id,
                        email: result.user!.email,
                        authMethod: result.user!.authMethod,
                        emailVerified: result.user!.emailVerified,
                        isActive: result.user!.isActive
                    },
                    token: result.token,
                    refreshToken: result.refreshToken
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * POST /auth/google
     * Authenticate with Google OAuth
     */
    async googleAuth(req: Request, res: Response): Promise<void> {
        try {
            const { oauthToken, email } = req.body;

            if (!oauthToken || !email) {
                res.status(400).json({
                    success: false,
                    error: 'OAuth token and email are required'
                });
                return;
            }

            // Extract Google ID from token (simplified)
            const googleId = `google_${oauthToken.substring(0, 10)}`;
            const result = await this.authService.authenticateWithGoogle(googleId, email, oauthToken);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    user: {
                        id: result.user!.id,
                        email: result.user!.email,
                        authMethod: result.user!.authMethod,
                        emailVerified: result.user!.emailVerified,
                        isActive: result.user!.isActive
                    },
                    token: result.token,
                    refreshToken: result.refreshToken
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * POST /auth/facebook
     * Authenticate with Facebook OAuth
     */
    async facebookAuth(req: Request, res: Response): Promise<void> {
        try {
            const { oauthToken, email } = req.body;

            if (!oauthToken || !email) {
                res.status(400).json({
                    success: false,
                    error: 'OAuth token and email are required'
                });
                return;
            }

            // Extract Facebook ID from token (simplified)
            const facebookId = `facebook_${oauthToken.substring(0, 10)}`;
            const result = await this.authService.authenticateWithFacebook(facebookId, email, oauthToken);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    user: {
                        id: result.user!.id,
                        email: result.user!.email,
                        authMethod: result.user!.authMethod,
                        emailVerified: result.user!.emailVerified,
                        isActive: result.user!.isActive
                    },
                    token: result.token,
                    refreshToken: result.refreshToken
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * POST /auth/biometric
     * Authenticate with biometric data (mobile)
     */
    async biometricAuth(req: Request, res: Response): Promise<void> {
        try {
            const biometricRequest: BiometricAuthRequest = req.body;

            if (!biometricRequest.userId || !biometricRequest.biometricData || !biometricRequest.deviceId) {
                res.status(400).json({
                    success: false,
                    error: 'User ID, biometric data, and device ID are required'
                });
                return;
            }

            const result = await this.authService.authenticateWithBiometric(biometricRequest);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    user: {
                        id: result.user!.id,
                        email: result.user!.email,
                        authMethod: result.user!.authMethod,
                        emailVerified: result.user!.emailVerified,
                        isActive: result.user!.isActive
                    },
                    token: result.token,
                    refreshToken: result.refreshToken
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * POST /auth/refresh
     * Refresh access token using refresh token
     */
    async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                res.status(400).json({
                    success: false,
                    error: 'Refresh token is required'
                });
                return;
            }

            const result = await this.authService.refreshToken(refreshToken);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    token: result.token
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * POST /auth/verify
     * Verify JWT token
     */
    async verifyToken(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.body;

            if (!token) {
                res.status(400).json({
                    success: false,
                    error: 'Token is required'
                });
                return;
            }

            const result = await this.authService.verifyToken(token);

            if (result.valid) {
                res.status(200).json({
                    success: true,
                    valid: true,
                    user: {
                        id: result.user!.id,
                        email: result.user!.email,
                        authMethod: result.user!.authMethod,
                        emailVerified: result.user!.emailVerified,
                        isActive: result.user!.isActive
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    valid: false,
                    error: result.error
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * GET /auth/me
     * Get current user information (requires authentication)
     */
    async getCurrentUser(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            res.status(200).json({
                success: true,
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    authMethod: req.user.authMethod,
                    emailVerified: req.user.emailVerified,
                    isActive: req.user.isActive,
                    createdAt: req.user.createdAt,
                    lastLoginAt: req.user.lastLoginAt
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * POST /auth/logout
     * Logout user (client-side token removal)
     */
    async logout(req: Request, res: Response): Promise<void> {
        try {
            // In a more sophisticated implementation, we might maintain a blacklist of tokens
            // For now, we rely on client-side token removal
            res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}