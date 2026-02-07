/**
 * Unit Tests for UserAccountRepository
 * Tests data validation, constraints, and edge cases
 * Requirements: 1.4, 4.2, 15.1
 */

import { UserAccountRepository } from '../../../database/repositories';
import { UserAccount, AuthMethod } from '../../../types';
import DatabaseConnection from '../../../database/connection';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserAccountRepository', () => {
    let repository: UserAccountRepository;
    let mockDb: any;

    beforeEach(() => {
        // Get the mocked instance from the global mock
        mockDb = (DatabaseConnection.getInstance as jest.Mock)();
        repository = new UserAccountRepository();
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a user account with email authentication', async () => {
            const userData = {
                email: 'test@example.com',
                passwordHash: 'plainpassword',
                authMethod: 'email' as AuthMethod,
                emailVerified: false,
                isActive: true
            };

            const mockResult = {
                rows: [{
                    id: 'test-uuid',
                    email: 'test@example.com',
                    password_hash: '$2b$10$hashedpassword',
                    google_id: null,
                    facebook_id: null,
                    auth_method: 'email',
                    email_verified: false,
                    created_at: new Date(),
                    last_login_at: null,
                    is_active: true
                }]
            };

            mockDb.query.mockResolvedValue(mockResult);

            const result = await repository.create(userData);

            expect(result.email).toBe('test@example.com');
            expect(result.authMethod).toBe('email');
            expect(result.emailVerified).toBe(false);
            expect(result.isActive).toBe(true);
            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO user_accounts'),
                expect.arrayContaining([
                    expect.any(String), // id
                    'test@example.com',
                    expect.any(String), // hashed password
                    null, // google_id
                    null, // facebook_id
                    'email',
                    false,
                    true,
                    expect.any(Date),
                    null
                ])
            );
        });

        it('should create a user account with Google OAuth', async () => {
            const userData = {
                googleId: 'google_123456',
                authMethod: 'google' as AuthMethod,
                emailVerified: true,
                isActive: true
            };

            const mockResult = {
                rows: [{
                    id: 'test-uuid',
                    email: null,
                    password_hash: null,
                    google_id: 'google_123456',
                    facebook_id: null,
                    auth_method: 'google',
                    email_verified: true,
                    created_at: new Date(),
                    last_login_at: null,
                    is_active: true
                }]
            };

            mockDb.query.mockResolvedValue(mockResult);

            const result = await repository.create(userData);

            expect(result.googleId).toBe('google_123456');
            expect(result.authMethod).toBe('google');
            expect(result.emailVerified).toBe(true);
        });

        it('should hash password for email authentication', async () => {
            const userData = {
                email: 'test@example.com',
                passwordHash: 'plainpassword',
                authMethod: 'email' as AuthMethod,
                emailVerified: false,
                isActive: true
            };

            const mockResult = {
                rows: [{
                    id: 'test-uuid',
                    email: 'test@example.com',
                    password_hash: '$2b$10$hashedpassword',
                    google_id: null,
                    facebook_id: null,
                    auth_method: 'email',
                    email_verified: false,
                    created_at: new Date(),
                    last_login_at: null,
                    is_active: true
                }]
            };

            mockDb.query.mockResolvedValue(mockResult);
            mockBcrypt.hash.mockResolvedValue('$2b$10$hashedpassword' as never);

            await repository.create(userData);

            // Verify that the password was hashed (not stored as plain text)
            const queryCall = mockDb.query.mock.calls[0];
            const hashedPassword = queryCall[1][2]; // password_hash parameter
            expect(hashedPassword).not.toBe('plainpassword');
            expect(hashedPassword).toMatch(/^\$2b\$10\$/); // bcrypt hash format
            expect(mockBcrypt.hash).toHaveBeenCalledWith('plainpassword', 10);
        });
    });

    describe('findByEmail', () => {
        it('should find user by email', async () => {
            const mockResult = {
                rows: [{
                    id: 'test-uuid',
                    email: 'test@example.com',
                    password_hash: '$2b$10$hashedpassword',
                    google_id: null,
                    facebook_id: null,
                    auth_method: 'email',
                    email_verified: true,
                    created_at: new Date(),
                    last_login_at: new Date(),
                    is_active: true
                }]
            };

            mockDb.query.mockResolvedValue(mockResult);

            const result = await repository.findByEmail('test@example.com');

            expect(result).not.toBeNull();
            expect(result!.email).toBe('test@example.com');
            expect(mockDb.query).toHaveBeenCalledWith(
                'SELECT * FROM user_accounts WHERE email = $1',
                ['test@example.com']
            );
        });

        it('should return null when user not found', async () => {
            mockDb.query.mockResolvedValue({ rows: [] });

            const result = await repository.findByEmail('nonexistent@example.com');

            expect(result).toBeNull();
        });
    });

    describe('verifyPassword', () => {
        it('should verify correct password', async () => {
            const mockUser = {
                id: 'test-uuid',
                email: 'test@example.com',
                password_hash: '$2b$10$N9qo8uLOickgx2ZMRZoMye.Uo04/OjEKEHim.AWEwtOWbOcbz6flK', // 'password'
                google_id: null,
                facebook_id: null,
                auth_method: 'email',
                email_verified: true,
                created_at: new Date(),
                last_login_at: new Date(),
                is_active: true
            };

            mockDb.query.mockResolvedValue({ rows: [mockUser] });
            mockBcrypt.compare.mockResolvedValue(true as never);

            const result = await repository.verifyPassword('test@example.com', 'password');

            expect(result).not.toBeNull();
            expect(result!.email).toBe('test@example.com');
            expect(mockBcrypt.compare).toHaveBeenCalledWith('password', mockUser.password_hash);
        });

        it('should return null for incorrect password', async () => {
            const mockUser = {
                id: 'test-uuid',
                email: 'test@example.com',
                password_hash: '$2b$10$N9qo8uLOickgx2ZMRZoMye.Uo04/OjEKEHim.AWEwtOWbOcbz6flK', // 'password'
                google_id: null,
                facebook_id: null,
                auth_method: 'email',
                email_verified: true,
                created_at: new Date(),
                last_login_at: new Date(),
                is_active: true
            };

            mockDb.query.mockResolvedValue({ rows: [mockUser] });
            mockBcrypt.compare.mockResolvedValue(false as never);

            const result = await repository.verifyPassword('test@example.com', 'wrongpassword');

            expect(result).toBeNull();
        });

        it('should return null when user has no password hash', async () => {
            const mockUser = {
                id: 'test-uuid',
                email: 'test@example.com',
                password_hash: null, // OAuth user
                google_id: 'google_123',
                facebook_id: null,
                auth_method: 'google',
                email_verified: true,
                created_at: new Date(),
                last_login_at: new Date(),
                is_active: true
            };

            mockDb.query.mockResolvedValue({ rows: [mockUser] });

            const result = await repository.verifyPassword('test@example.com', 'anypassword');

            expect(result).toBeNull();
        });
    });

    describe('updateLastLogin', () => {
        it('should update last login timestamp', async () => {
            mockDb.query.mockResolvedValue({ rowCount: 1 });

            await repository.updateLastLogin('test-uuid');

            expect(mockDb.query).toHaveBeenCalledWith(
                'UPDATE user_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
                ['test-uuid']
            );
        });
    });

    describe('edge cases and validation', () => {
        it('should handle database connection errors', async () => {
            mockDb.query.mockRejectedValue(new Error('Database connection failed'));

            await expect(repository.findByEmail('test@example.com')).rejects.toThrow('Database connection failed');
        });

        it('should handle malformed email addresses gracefully', async () => {
            mockDb.query.mockResolvedValue({ rows: [] });

            const result = await repository.findByEmail('invalid-email');

            expect(result).toBeNull();
            expect(mockDb.query).toHaveBeenCalledWith(
                'SELECT * FROM user_accounts WHERE email = $1',
                ['invalid-email']
            );
        });

        it('should handle empty string inputs', async () => {
            mockDb.query.mockResolvedValue({ rows: [] });

            const result = await repository.findByEmail('');

            expect(result).toBeNull();
        });
    });
});