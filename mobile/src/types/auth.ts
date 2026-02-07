export interface UserAccount {
    id: string;
    email?: string;
    googleId?: string;
    facebookId?: string;
    authMethod: 'email' | 'google' | 'facebook';
    emailVerified: boolean;
    createdAt: Date;
    lastLoginAt: Date;
    isActive: boolean;
}

export interface AuthState {
    user: UserAccount | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

export interface LoginCredentials {
    method: 'email' | 'google' | 'facebook';
    email?: string;
    password?: string;
    oauthToken?: string;
}

export interface RegisterCredentials {
    email: string;
    password: string;
    confirmPassword: string;
}