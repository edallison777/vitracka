/**
 * User Authentication Types
 * Based on design document specifications for multi-method authentication
 */

export interface UserAccount {
    id: string;
    email?: string; // Required for email/password auth
    passwordHash?: string; // Hashed password, never stored in plain text
    googleId?: string; // Google OAuth identifier
    facebookId?: string; // Facebook OAuth identifier
    authMethod: 'email' | 'google' | 'facebook';
    emailVerified: boolean;
    createdAt: Date;
    lastLoginAt: Date;
    isActive: boolean;
}

export interface AuthenticationRequest {
    method: 'email' | 'google' | 'facebook';
    credentials: {
        email?: string;
        password?: string; // Plain text, hashed before storage
        oauthToken?: string; // For Google/Facebook OAuth
    };
}

export type AuthMethod = 'email' | 'google' | 'facebook';