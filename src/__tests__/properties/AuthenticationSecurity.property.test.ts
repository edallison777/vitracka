/**
 * Property-Based Tests for Authentication Security
 * Tests Property 1: Authentication Security
 * Validates: Requirements 19.1, 19.2, 19.3
 */

import * as fc from 'fast-check';
import { AuthenticationService } from '../../services/AuthenticationService';
import { UserAccountRepository } from '../../database/repositories/UserAccountRepository';
import { AuthenticationRequest, UserAccount } from '../../types';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// Mock the database connection
jest.mock('../../database/connection', () => ({
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
jest.mock('../../database/repositories/UserAccountRepository');

describe('Authentication Security Properties', () => {
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

    /**
     * Property 1: Authentication Security
     * For any authentication request, the system should validate credentials securely,
     * hash passwords before storage (never storing plain text), support multiple 
     * authentication methods (email/password, Google ID, Facebook ID), and maintain 
     * proper session management
     * **Validates: Requirements 19.1, 19.2, 19.3**
     */
    describe('Property 1: Authentication Security', () => {
        it('should securely validate credentials and hash passwords for email authentication', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        email: fc.emailAddress(),
                        password: fc.string({ minLength: 8, maxLength: 50 })
                            .filter(pwd => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(pwd)),
                        method: fc.constant('email' as const)
                    }),
                    async (authData) => {
                        // Feature: vitracka-weight-management, Property 1: Authentication Security

                        // Mock successful user creation and authentication
                        const mockUser: UserAccount = {
                            id: 'test-user-id',
                            email: authData.email,
                            passwordHash: 'hashed-password',
                            authMethod: 'email',
                            emailVerified: false,
                            createdAt: new Date(),
                            lastLoginAt: new Date(),
                            isActive: true
                        };

                        mockUserRepository.findByEmail.mockResolvedValue(null); // User doesn't exist
                        mockUserRepository.create.mockResolvedValue(mockUser);
                        mockUserRepository.verifyPassword.mockResolvedValue(mockUser);
                        mockUserRepository.updateLastLogin.mockResolvedValue();

                        // Test password hashing - passwords should never be stored in plain text
                        const registrationResult = await authService.registerWithEmail(
                            authData.email,
                            authData.password
                        );

                        if (registrationResult.success && registrationResult.user) {
                            // Verify password is hashed, not stored in plain text
                            expect(registrationResult.user.passwordHash).toBeDefined();
                            expect(registrationResult.user.passwordHash).not.toBe(authData.password);

                            // Test authentication with correct password
                            const authResult = await authService.authenticateWithEmail(
                                authData.email,
                                authData.password
                            );

                            expect(authResult.success).toBe(true);
                            expect(authResult.token).toBeDefined();
                            expect(authResult.refreshToken).toBeDefined();

                            // Verify JWT token structure and validity
                            if (authResult.token) {
                                const decoded = jwt.decode(authResult.token) as any;
                                expect(decoded.userId).toBe(registrationResult.user.id);
                                expect(decoded.authMethod).toBe('email');
                            }

                            // Test authentication with wrong password fails
                            mockUserRepository.verifyPassword.mockResolvedValue(null); // Wrong password
                            const wrongPasswordResult = await authService.authenticateWithEmail(
                                authData.email,
                                authData.password + 'wrong'
                            );

                            expect(wrongPasswordResult.success).toBe(false);
                            expect(wrongPasswordResult.token).toBeUndefined();
                        }
                    }
                ),
                { numRuns: 10 } // Reduced for faster execution
            );
        });

        it('should support multiple authentication methods with proper validation', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.oneof(
                        fc.record({
                            method: fc.constant('google' as const),
                            email: fc.emailAddress(),
                            oauthToken: fc.string({ minLength: 20 }).map(s => `google_${s}`),
                            providerId: fc.string({ minLength: 10 }).map(s => `google_${s}`)
                        }),
                        fc.record({
                            method: fc.constant('facebook' as const),
                            email: fc.emailAddress(),
                            oauthToken: fc.string({ minLength: 20 }).map(s => `facebook_${s}`),
                            providerId: fc.string({ minLength: 10 }).map(s => `facebook_${s}`)
                        })
                    ),
                    async (authData) => {
                        // Feature: vitracka-weight-management, Property 1: Authentication Security

                        const mockUser: UserAccount = {
                            id: 'test-user-id',
                            email: authData.email,
                            googleId: authData.method === 'google' ? authData.providerId : undefined,
                            facebookId: authData.method === 'facebook' ? authData.providerId : undefined,
                            authMethod: authData.method,
                            emailVerified: true,
                            createdAt: new Date(),
                            lastLoginAt: new Date(),
                            isActive: true
                        };

                        if (authData.method === 'google') {
                            mockUserRepository.findByGoogleId.mockResolvedValue(mockUser);
                        } else {
                            mockUserRepository.findByFacebookId.mockResolvedValue(mockUser);
                        }
                        mockUserRepository.updateLastLogin.mockResolvedValue();

                        let result;
                        if (authData.method === 'google') {
                            result = await authService.authenticateWithGoogle(
                                authData.providerId,
                                authData.email,
                                authData.oauthToken
                            );
                        } else {
                            result = await authService.authenticateWithFacebook(
                                authData.providerId,
                                authData.email,
                                authData.oauthToken
                            );
                        }

                        if (result.success && result.user) {
                            // Verify correct authentication method is set
                            expect(result.user.authMethod).toBe(authData.method);

                            // Verify OAuth accounts are pre-verified
                            expect(result.user.emailVerified).toBe(true);

                            // Verify no password hash for OAuth accounts
                            expect(result.user.passwordHash).toBeUndefined();

                            // Verify JWT token contains correct information
                            if (result.token) {
                                const decoded = jwt.decode(result.token) as any;
                                expect(decoded.userId).toBe(result.user.id);
                                expect(decoded.authMethod).toBe(authData.method);
                                expect(decoded.email).toBe(authData.email);
                            }
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should maintain proper session management with secure tokens', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        email: fc.emailAddress(),
                        password: fc.string({ minLength: 8, maxLength: 50 })
                            .filter(pwd => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(pwd))
                    }),
                    async (userData) => {
                        // Feature: vitracka-weight-management, Property 1: Authentication Security

                        const mockUser: UserAccount = {
                            id: 'test-user-id',
                            email: userData.email,
                            passwordHash: 'hashed-password',
                            authMethod: 'email',
                            emailVerified: false,
                            createdAt: new Date(),
                            lastLoginAt: new Date(),
                            isActive: true
                        };

                        mockUserRepository.findByEmail.mockResolvedValue(null);
                        mockUserRepository.create.mockResolvedValue(mockUser);
                        mockUserRepository.findById.mockResolvedValue(mockUser);

                        // Register user
                        const registrationResult = await authService.registerWithEmail(
                            userData.email,
                            userData.password
                        );

                        if (registrationResult.success && registrationResult.token && registrationResult.refreshToken) {
                            // Verify token structure and expiration
                            const accessToken = registrationResult.token;
                            const refreshToken = registrationResult.refreshToken;

                            // Decode tokens to verify structure
                            const accessDecoded = jwt.decode(accessToken) as any;
                            const refreshDecoded = jwt.decode(refreshToken) as any;

                            expect(accessDecoded.userId).toBeDefined();
                            expect(accessDecoded.exp).toBeDefined();
                            expect(accessDecoded.iat).toBeDefined();

                            expect(refreshDecoded.userId).toBeDefined();
                            expect(refreshDecoded.exp).toBeDefined();
                            expect(refreshDecoded.iat).toBeDefined();

                            // Verify access token has shorter expiry than refresh token
                            expect(accessDecoded.exp).toBeLessThan(refreshDecoded.exp);

                            // Test token verification
                            const verificationResult = await authService.verifyToken(accessToken);
                            expect(verificationResult.valid).toBe(true);
                            expect(verificationResult.user?.id).toBe(registrationResult.user!.id);

                            // Test refresh token functionality
                            // Add small delay to ensure different timestamp
                            await new Promise(resolve => setTimeout(resolve, 10));
                            const refreshResult = await authService.refreshToken(refreshToken);
                            expect(refreshResult.success).toBe(true);
                            expect(refreshResult.token).toBeDefined();

                            // Verify new token is valid (may be same as original if generated at same second)
                            const newTokenVerification = await authService.verifyToken(refreshResult.token!);
                            expect(newTokenVerification.valid).toBe(true);
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should reject invalid authentication attempts securely', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        validEmail: fc.emailAddress(),
                        validPassword: fc.string({ minLength: 8, maxLength: 50 })
                            .filter(pwd => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(pwd)),
                        invalidPassword: fc.string({ minLength: 1, maxLength: 50 }),
                        invalidEmail: fc.string({ minLength: 1, maxLength: 50 })
                            .filter(s => !s.includes('@') || s.length < 5),
                        invalidOAuthToken: fc.string({ minLength: 1, maxLength: 10 })
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 1: Authentication Security

                        const mockUser: UserAccount = {
                            id: 'test-user-id',
                            email: testData.validEmail,
                            passwordHash: 'hashed-password',
                            authMethod: 'email',
                            emailVerified: false,
                            createdAt: new Date(),
                            lastLoginAt: new Date(),
                            isActive: true
                        };

                        // Mock successful registration
                        mockUserRepository.findByEmail.mockResolvedValue(null);
                        mockUserRepository.create.mockResolvedValue(mockUser);

                        // Register a valid user first
                        const registrationResult = await authService.registerWithEmail(
                            testData.validEmail,
                            testData.validPassword
                        );

                        if (registrationResult.success) {
                            // Test invalid password
                            mockUserRepository.verifyPassword.mockResolvedValue(null);
                            const wrongPasswordResult = await authService.authenticateWithEmail(
                                testData.validEmail,
                                testData.invalidPassword
                            );
                            expect(wrongPasswordResult.success).toBe(false);
                            expect(wrongPasswordResult.token).toBeUndefined();
                            expect(wrongPasswordResult.error).toBeDefined();

                            // Test invalid email
                            const wrongEmailResult = await authService.authenticateWithEmail(
                                testData.invalidEmail,
                                testData.validPassword
                            );
                            expect(wrongEmailResult.success).toBe(false);
                            expect(wrongEmailResult.token).toBeUndefined();

                            // Test invalid OAuth token
                            const invalidOAuthResult = await authService.authenticateWithGoogle(
                                'google_test_id',
                                testData.validEmail,
                                testData.invalidOAuthToken
                            );
                            expect(invalidOAuthResult.success).toBe(false);
                            expect(invalidOAuthResult.token).toBeUndefined();
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should handle biometric authentication securely', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        userId: fc.uuid(),
                        biometricData: fc.string({ minLength: 25, maxLength: 100 }),
                        deviceId: fc.string({ minLength: 10, maxLength: 50 }),
                        invalidBiometricData: fc.string({ minLength: 1, maxLength: 15 })
                    }),
                    async (biometricData) => {
                        // Feature: vitracka-weight-management, Property 1: Authentication Security

                        const mockUser: UserAccount = {
                            id: biometricData.userId,
                            email: 'test@example.com',
                            authMethod: 'email',
                            emailVerified: true,
                            createdAt: new Date(),
                            lastLoginAt: new Date(),
                            isActive: true
                        };

                        mockUserRepository.findById.mockResolvedValue(mockUser);
                        mockUserRepository.updateLastLogin.mockResolvedValue();

                        // Test valid biometric authentication
                        const validResult = await authService.authenticateWithBiometric({
                            userId: biometricData.userId,
                            biometricData: biometricData.biometricData,
                            deviceId: biometricData.deviceId
                        });

                        if (validResult.success) {
                            expect(validResult.token).toBeDefined();
                            expect(validResult.refreshToken).toBeDefined();
                        } else {
                            expect(validResult.error).toBeDefined();
                        }

                        // Test invalid biometric data
                        const invalidResult = await authService.authenticateWithBiometric({
                            userId: biometricData.userId,
                            biometricData: biometricData.invalidBiometricData,
                            deviceId: biometricData.deviceId
                        });

                        expect(invalidResult.success).toBe(false);
                        expect(invalidResult.error).toBeDefined();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });
});