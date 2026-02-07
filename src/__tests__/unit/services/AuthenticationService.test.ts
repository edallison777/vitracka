/**
 * Unit Tests for Authentication Service
 * Tests each authentication method independently
 * Tests token generation, validation, and expiration
 * Tests password hashing and verification
 * Validates: Requirements 19.1, 19.2, 19.3
 */

import { AuthenticationService } from '../../../services/AuthenticationService';
import { UserAccountRepository } from '../../../database/repositories/UserAccountRepository';
import { UserAccount } from '../../../types';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// Mock the database connection
jest.mock('../../../database/connection', () => ({
    default: {
        getInstance: jest.fn(() => ({
            query: jest.fn(),
            getPool: jest.fn(),
            close: jest.fn(),
            testConnection: jest.fn()
        }))
    }
}));

// Mock the UserAccountRepository
jest.mock('../../../database/repositories/UserAccountRepository');

describe('AuthenticationService Unit Tests', () => {
    let authService: AuthenticationService;
    let mockUserRepository: jest.Mocked<UserAccountRepository>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock repository
        mockUserRepository = new UserAccountRepository() as jest.Mocked<UserAccountRepository>;

        // Create service and inject mock
        authService = new AuthenticationService();
        (authService as any).userRepository = mockUserRepository;
    });

    describe('Email Authentication', () => {
        it('should successfully authenticate with valid email and password', async () => {
            const mockUser: UserAccount = {
                id: 'user-123',
                email: 'test@example.com',
                passwordHash: await bcrypt.hash('ValidPass123', 10),
                authMethod: 'email',
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true
            };

            mockUserRepository.verifyPassword.mockResolvedValue(mockUser);
            mockUserRepository.updateLastLogin.mockResolvedValue();

            const result = await authService.authenticateWithEmail('test@example.com', 'ValidPass123');

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(result.token).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith('user-123');
        });

        it('should fail authentication with invalid password', async () => {
            mockUserRepository.verifyPassword.mockResolvedValue(null);

            const result = await authService.authenticateWithEmail('test@example.com', 'WrongPassword');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid email or password');
            expect(result.token).toBeUndefined();
        });

        it('should fail authentication for deactivated account', async () => {
            const mockUser: UserAccount = {
                id: 'user-123',
                email: 'test@example.com',
                passwordHash: await bcrypt.hash('ValidPass123', 10),
                authMethod: 'email',
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: false // Deactivated account
            };

            mockUserRepository.verifyPassword.mockResolvedValue(mockUser);

            const result = await authService.authenticateWithEmail('test@example.com', 'ValidPass123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Account is deactivated');
        });

        it('should register new user with valid email and password', async () => {
            const mockUser: UserAccount = {
                id: 'user-123',
                email: 'newuser@example.com',
                passwordHash: 'hashed-password',
                authMethod: 'email',
                emailVerified: false,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true
            };

            mockUserRepository.findByEmail.mockResolvedValue(null); // User doesn't exist
            mockUserRepository.create.mockResolvedValue(mockUser);

            const result = await authService.registerWithEmail('newuser@example.com', 'ValidPass123');

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(result.token).toBeDefined();
            expect(result.refreshToken).toBeDefined();
        });

        it('should reject registration for existing user', async () => {
            const existingUser: UserAccount = {
                id: 'user-123',
                email: 'existing@example.com',
                passwordHash: 'hashed-password',
                authMethod: 'email',
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true
            };

            mockUserRepository.findByEmail.mockResolvedValue(existingUser);

            const result = await authService.registerWithEmail('existing@example.com', 'ValidPass123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('User already exists with this email');
        });

        it('should reject weak passwords', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null);

            const result = await authService.registerWithEmail('test@example.com', 'weak');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Password does not meet security requirements');
        });
    });

    describe('Google OAuth Authentication', () => {
        it('should successfully authenticate with valid Google OAuth', async () => {
            const mockUser: UserAccount = {
                id: 'user-123',
                email: 'google@example.com',
                googleId: 'google_abc123',
                authMethod: 'google',
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true
            };

            mockUserRepository.findByGoogleId.mockResolvedValue(mockUser);
            mockUserRepository.updateLastLogin.mockResolvedValue();

            const result = await authService.authenticateWithGoogle(
                'google_abc123',
                'google@example.com',
                'google_valid_token_12345'
            );

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(result.token).toBeDefined();
            expect(result.refreshToken).toBeDefined();
        });

        it('should create new user for first-time Google authentication', async () => {
            const mockUser: UserAccount = {
                id: 'user-123',
                email: 'newgoogle@example.com',
                googleId: 'google_new123',
                authMethod: 'google',
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true
            };

            mockUserRepository.findByGoogleId.mockResolvedValue(null); // User doesn't exist
            mockUserRepository.create.mockResolvedValue(mockUser);
            mockUserRepository.updateLastLogin.mockResolvedValue();

            const result = await authService.authenticateWithGoogle(
                'google_new123',
                'newgoogle@example.com',
                'google_valid_token_12345'
            );

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(mockUserRepository.create).toHaveBeenCalledWith({
                email: 'newgoogle@example.com',
                googleId: 'google_new123',
                authMethod: 'google',
                emailVerified: true,
                isActive: true
            });
        });

        it('should reject invalid Google OAuth token', async () => {
            const result = await authService.authenticateWithGoogle(
                'google_abc123',
                'google@example.com',
                'invalid_token'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid Google OAuth token');
        });
    });

    describe('Facebook OAuth Authentication', () => {
        it('should successfully authenticate with valid Facebook OAuth', async () => {
            const mockUser: UserAccount = {
                id: 'user-123',
                email: 'facebook@example.com',
                facebookId: 'facebook_abc123',
                authMethod: 'facebook',
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true
            };

            mockUserRepository.findByFacebookId.mockResolvedValue(mockUser);
            mockUserRepository.updateLastLogin.mockResolvedValue();

            const result = await authService.authenticateWithFacebook(
                'facebook_abc123',
                'facebook@example.com',
                'facebook_valid_token_12345'
            );

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(result.token).toBeDefined();
            expect(result.refreshToken).toBeDefined();
        });

        it('should reject invalid Facebook OAuth token', async () => {
            const result = await authService.authenticateWithFacebook(
                'facebook_abc123',
                'facebook@example.com',
                'invalid_token'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid Facebook OAuth token');
        });
    });

    describe('Token Management', () => {
        it('should generate valid JWT tokens with correct structure', async () => {
            const mockUser: UserAccount = {
                id: 'user-123',
                email: 'test@example.com',
                passwordHash: await bcrypt.hash('ValidPass123', 10),
                authMethod: 'email',
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true
            };

            mockUserRepository.verifyPassword.mockResolvedValue(mockUser);
            mockUserRepository.updateLastLogin.mockResolvedValue();

            const result = await authService.authenticateWithEmail('test@example.com', 'ValidPass123');

            expect(result.success).toBe(true);
            expect(result.token).toBeDefined();
            expect(result.refreshToken).toBeDefined();

            // Verify token structure
            const decodedToken = jwt.decode(result.token!) as any;
            expect(decodedToken.userId).toBe('user-123');
            expect(decodedToken.email).toBe('test@example.com');
            expect(decodedToken.authMethod).toBe('email');
            expect(decodedToken.exp).toBeDefined();
            expect(decodedToken.iat).toBeDefined();
        });

        it('should verify valid tokens', async () => {
            const mockUser: UserAccount = {
                id: 'user-123',
                email: 'test@example.com',
                authMethod: 'email',
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true
            };

            // Create a valid token
            const payload = {
                userId: 'user-123',
                email: 'test@example.com',
                authMethod: 'email' as const
            };
            const token = jwt.sign(payload, 'vitracka-jwt-secret-key', { expiresIn: '1h' });

            mockUserRepository.findById.mockResolvedValue(mockUser);

            const result = await authService.verifyToken(token);

            expect(result.valid).toBe(true);
            expect(result.user).toEqual(mockUser);
        });

        it('should reject invalid tokens', async () => {
            const result = await authService.verifyToken('invalid-token');

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should refresh tokens successfully', async () => {
            const mockUser: UserAccount = {
                id: 'user-123',
                email: 'test@example.com',
                authMethod: 'email',
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true
            };

            // Create a valid refresh token
            const payload = {
                userId: 'user-123',
                email: 'test@example.com',
                authMethod: 'email' as const
            };
            const refreshToken = jwt.sign(payload, 'vitracka-refresh-secret-key', { expiresIn: '7d' });

            mockUserRepository.findById.mockResolvedValue(mockUser);

            const result = await authService.refreshToken(refreshToken);

            expect(result.success).toBe(true);
            expect(result.token).toBeDefined();
        });
    });

    describe('Biometric Authentication', () => {
        it('should successfully authenticate with valid biometric data', async () => {
            const mockUser: UserAccount = {
                id: 'user-123',
                email: 'test@example.com',
                authMethod: 'email',
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true
            };

            mockUserRepository.findById.mockResolvedValue(mockUser);
            mockUserRepository.updateLastLogin.mockResolvedValue();

            const result = await authService.authenticateWithBiometric({
                userId: 'user-123',
                biometricData: 'valid_biometric_signature_data_12345',
                deviceId: 'device-abc-123'
            });

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(result.token).toBeDefined();
            expect(result.refreshToken).toBeDefined();
        });

        it('should reject invalid biometric data', async () => {
            const mockUser: UserAccount = {
                id: 'user-123',
                email: 'test@example.com',
                authMethod: 'email',
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true
            };

            mockUserRepository.findById.mockResolvedValue(mockUser);

            const result = await authService.authenticateWithBiometric({
                userId: 'user-123',
                biometricData: 'short', // Too short to be valid
                deviceId: 'device-abc-123'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Biometric authentication failed');
        });
    });

    describe('Password Hashing and Verification', () => {
        it('should hash passwords securely', async () => {
            const password = 'TestPassword123';
            const hashedPassword = await bcrypt.hash(password, 10);

            expect(hashedPassword).not.toBe(password);
            expect(hashedPassword.length).toBeGreaterThan(20);
            expect(hashedPassword.startsWith('$2b$')).toBe(true);

            // Verify the hash works
            const isValid = await bcrypt.compare(password, hashedPassword);
            expect(isValid).toBe(true);

            // Verify wrong password fails
            const isInvalid = await bcrypt.compare('WrongPassword', hashedPassword);
            expect(isInvalid).toBe(false);
        });

        it('should validate password strength correctly', async () => {
            // Access private method for testing
            const validatePasswordStrength = (authService as any).validatePasswordStrength.bind(authService);

            // Valid passwords
            expect(validatePasswordStrength('ValidPass123')).toBe(true);
            expect(validatePasswordStrength('AnotherGood1')).toBe(true);
            expect(validatePasswordStrength('Complex@Pass1')).toBe(true);

            // Invalid passwords
            expect(validatePasswordStrength('short')).toBe(false); // Too short
            expect(validatePasswordStrength('nouppercase123')).toBe(false); // No uppercase
            expect(validatePasswordStrength('NOLOWERCASE123')).toBe(false); // No lowercase
            expect(validatePasswordStrength('NoNumbers')).toBe(false); // No numbers
            expect(validatePasswordStrength('')).toBe(false); // Empty
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            mockUserRepository.verifyPassword.mockRejectedValue(new Error('Database connection failed'));

            const result = await authService.authenticateWithEmail('test@example.com', 'ValidPass123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Authentication failed');
        });

        it('should handle repository errors during registration', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null);
            mockUserRepository.create.mockRejectedValue(new Error('Database error'));

            const result = await authService.registerWithEmail('test@example.com', 'ValidPass123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Registration failed');
        });
    });
});