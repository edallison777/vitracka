/**
 * Authentication Service
 * Handles multi-method authentication, JWT token management, and session handling
 * Implements Requirements 19.1, 19.2, 19.3
 */

import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { UserAccount, AuthenticationRequest, AuthMethod } from '../types';
import { UserAccountRepository } from '../database/repositories/UserAccountRepository';

export interface AuthenticationResult {
    success: boolean;
    user?: UserAccount;
    token?: string;
    refreshToken?: string;
    error?: string;
}

export interface TokenPayload {
    userId: string;
    email?: string;
    authMethod: AuthMethod;
    sessionId?: string; // Add session ID to token payload
    iat?: number;
    exp?: number;
}

export interface BiometricAuthRequest {
    userId: string;
    biometricData: string; // Encrypted biometric signature
    deviceId: string;
}

export class AuthenticationService {
    private userRepository: UserAccountRepository;
    private jwtSecret: string;
    private jwtRefreshSecret: string;
    private tokenExpiry: string;
    private refreshTokenExpiry: string;

    constructor() {
        this.userRepository = new UserAccountRepository();
        this.jwtSecret = process.env.JWT_SECRET || 'vitracka-jwt-secret-key';
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'vitracka-refresh-secret-key';
        this.tokenExpiry = process.env.JWT_EXPIRY || '24h'; // Match session timeout
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    }

    /**
     * Authenticate user with email and password
     */
    async authenticateWithEmail(email: string, password: string): Promise<AuthenticationResult> {
        try {
            const user = await this.userRepository.verifyPassword(email, password);

            if (!user) {
                return {
                    success: false,
                    error: 'Invalid email or password'
                };
            }

            if (!user.isActive) {
                return {
                    success: false,
                    error: 'Account is deactivated'
                };
            }

            await this.userRepository.updateLastLogin(user.id);
            const tokens = this.generateTokens(user);

            return {
                success: true,
                user,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken
            };
        } catch (error) {
            return {
                success: false,
                error: 'Authentication failed'
            };
        }
    }

    /**
     * Authenticate user with Google OAuth
     */
    async authenticateWithGoogle(googleId: string, email: string, oauthToken: string): Promise<AuthenticationResult> {
        try {
            // Verify OAuth token (in real implementation, verify with Google)
            if (!this.verifyOAuthToken(oauthToken, 'google')) {
                return {
                    success: false,
                    error: 'Invalid Google OAuth token'
                };
            }

            let user = await this.userRepository.findByGoogleId(googleId);

            if (!user) {
                // Create new user account
                user = await this.userRepository.create({
                    email,
                    googleId,
                    authMethod: 'google',
                    emailVerified: true, // Google accounts are pre-verified
                    isActive: true
                });
            }

            if (!user.isActive) {
                return {
                    success: false,
                    error: 'Account is deactivated'
                };
            }

            await this.userRepository.updateLastLogin(user.id);
            const tokens = this.generateTokens(user);

            return {
                success: true,
                user,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken
            };
        } catch (error) {
            return {
                success: false,
                error: 'Google authentication failed'
            };
        }
    }

    /**
     * Authenticate user with Facebook OAuth
     */
    async authenticateWithFacebook(facebookId: string, email: string, oauthToken: string): Promise<AuthenticationResult> {
        try {
            // Verify OAuth token (in real implementation, verify with Facebook)
            if (!this.verifyOAuthToken(oauthToken, 'facebook')) {
                return {
                    success: false,
                    error: 'Invalid Facebook OAuth token'
                };
            }

            let user = await this.userRepository.findByFacebookId(facebookId);

            if (!user) {
                // Create new user account
                user = await this.userRepository.create({
                    email,
                    facebookId,
                    authMethod: 'facebook',
                    emailVerified: true, // Facebook accounts are pre-verified
                    isActive: true
                });
            }

            if (!user.isActive) {
                return {
                    success: false,
                    error: 'Account is deactivated'
                };
            }

            await this.userRepository.updateLastLogin(user.id);
            const tokens = this.generateTokens(user);

            return {
                success: true,
                user,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken
            };
        } catch (error) {
            return {
                success: false,
                error: 'Facebook authentication failed'
            };
        }
    }

    /**
     * Register new user with email and password
     */
    async registerWithEmail(email: string, password: string): Promise<AuthenticationResult> {
        try {
            // Check if user already exists
            const existingUser = await this.userRepository.findByEmail(email);
            if (existingUser) {
                return {
                    success: false,
                    error: 'User already exists with this email'
                };
            }

            // Validate password strength
            if (!this.validatePasswordStrength(password)) {
                return {
                    success: false,
                    error: 'Password does not meet security requirements'
                };
            }

            // Create new user
            const user = await this.userRepository.create({
                email,
                passwordHash: password, // Will be hashed in repository
                authMethod: 'email',
                emailVerified: false,
                isActive: true
            });

            const tokens = this.generateTokens(user);

            return {
                success: true,
                user,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken
            };
        } catch (error) {
            return {
                success: false,
                error: 'Registration failed'
            };
        }
    }

    /**
     * Authenticate using biometric data (mobile-specific)
     */
    async authenticateWithBiometric(request: BiometricAuthRequest): Promise<AuthenticationResult> {
        try {
            const user = await this.userRepository.findById(request.userId);

            if (!user || !user.isActive) {
                return {
                    success: false,
                    error: 'Invalid user or account deactivated'
                };
            }

            // Verify biometric data (simplified for this implementation)
            if (!this.verifyBiometricData(request.biometricData, request.deviceId, user.id)) {
                return {
                    success: false,
                    error: 'Biometric authentication failed'
                };
            }

            await this.userRepository.updateLastLogin(user.id);
            const tokens = this.generateTokens(user);

            return {
                success: true,
                user,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken
            };
        } catch (error) {
            return {
                success: false,
                error: 'Biometric authentication failed'
            };
        }
    }

    /**
     * Verify JWT token and return user information
     */
    async verifyToken(token: string): Promise<{ valid: boolean; user?: UserAccount; error?: string }> {
        try {
            const decoded = jwt.verify(token, this.jwtSecret as string) as TokenPayload;
            const user = await this.userRepository.findById(decoded.userId);

            if (!user || !user.isActive) {
                return {
                    valid: false,
                    error: 'Invalid user or account deactivated'
                };
            }

            // Update session activity if session exists
            // Note: In a full implementation, we'd extract sessionId from token
            // For now, we'll update the user's last login to track activity
            await this.userRepository.updateLastLogin(user.id);

            return {
                valid: true,
                user
            };
        } catch (error) {
            return {
                valid: false,
                error: 'Invalid or expired token'
            };
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken: string): Promise<{ success: boolean; token?: string; error?: string }> {
        try {
            const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret as string) as TokenPayload;
            const user = await this.userRepository.findById(decoded.userId);

            if (!user || !user.isActive) {
                return {
                    success: false,
                    error: 'Invalid user or account deactivated'
                };
            }

            const newToken = this.generateAccessToken(user);

            return {
                success: true,
                token: newToken
            };
        } catch (error) {
            return {
                success: false,
                error: 'Invalid or expired refresh token'
            };
        }
    }

    /**
     * Process authentication request based on method
     */
    async authenticate(request: AuthenticationRequest): Promise<AuthenticationResult> {
        switch (request.method) {
            case 'email':
                if (!request.credentials.email || !request.credentials.password) {
                    return {
                        success: false,
                        error: 'Email and password are required'
                    };
                }
                return this.authenticateWithEmail(request.credentials.email, request.credentials.password);

            case 'google':
                if (!request.credentials.oauthToken || !request.credentials.email) {
                    return {
                        success: false,
                        error: 'OAuth token and email are required for Google authentication'
                    };
                }
                // Extract Google ID from token (simplified)
                const googleId = this.extractGoogleId(request.credentials.oauthToken);
                return this.authenticateWithGoogle(googleId, request.credentials.email, request.credentials.oauthToken);

            case 'facebook':
                if (!request.credentials.oauthToken || !request.credentials.email) {
                    return {
                        success: false,
                        error: 'OAuth token and email are required for Facebook authentication'
                    };
                }
                // Extract Facebook ID from token (simplified)
                const facebookId = this.extractFacebookId(request.credentials.oauthToken);
                return this.authenticateWithFacebook(facebookId, request.credentials.email, request.credentials.oauthToken);

            default:
                return {
                    success: false,
                    error: 'Unsupported authentication method'
                };
        }
    }

    /**
     * Generate access and refresh tokens
     */
    private generateTokens(user: UserAccount): { accessToken: string; refreshToken: string } {
        const payload: TokenPayload = {
            userId: user.id,
            email: user.email,
            authMethod: user.authMethod
        };

        const accessToken = jwt.sign(payload, this.jwtSecret as string, { expiresIn: this.tokenExpiry } as jwt.SignOptions);
        const refreshToken = jwt.sign(payload, this.jwtRefreshSecret as string, { expiresIn: this.refreshTokenExpiry } as jwt.SignOptions);

        return { accessToken, refreshToken };
    }

    /**
     * Generate access token only
     */
    private generateAccessToken(user: UserAccount): string {
        const payload: TokenPayload = {
            userId: user.id,
            email: user.email,
            authMethod: user.authMethod,
            iat: Math.floor(Date.now() / 1000) // Ensure unique timestamp
        };

        return jwt.sign(payload, this.jwtSecret as string, { expiresIn: this.tokenExpiry } as jwt.SignOptions);
    }

    /**
     * Validate password strength
     */
    private validatePasswordStrength(password: string): boolean {
        // Minimum 8 characters, at least one uppercase, one lowercase, one number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }

    /**
     * Verify OAuth token (simplified implementation)
     */
    private verifyOAuthToken(token: string, provider: 'google' | 'facebook'): boolean {
        // In real implementation, verify with OAuth provider
        // For now, just check if token is not empty and has proper format
        return !!(token && token.length > 10 && token.includes(provider));
    }

    /**
     * Verify biometric data (simplified implementation)
     */
    private verifyBiometricData(biometricData: string, deviceId: string, userId: string): boolean {
        // In real implementation, verify biometric signature
        // For now, just check if data is present and matches expected format
        return !!(biometricData && deviceId && userId && biometricData.length > 20);
    }

    /**
     * Extract Google ID from OAuth token (simplified)
     */
    private extractGoogleId(token: string): string {
        // In real implementation, decode JWT token from Google
        return `google_${token.substring(0, 10)}`;
    }

    /**
     * Extract Facebook ID from OAuth token (simplified)
     */
    private extractFacebookId(token: string): string {
        // In real implementation, decode token from Facebook
        return `facebook_${token.substring(0, 10)}`;
    }
}