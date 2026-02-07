/**
 * User Account Repository
 * Data access layer for user authentication and account management
 */

import { UserAccount, AuthMethod } from '../../types';
import DatabaseConnection from '../connection';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

export class UserAccountRepository {
    private db = DatabaseConnection.getInstance();

    async create(userData: Omit<UserAccount, 'id' | 'createdAt' | 'lastLoginAt'>): Promise<UserAccount> {
        const id = uuidv4();
        const now = new Date();

        // Hash password if provided
        let passwordHash = userData.passwordHash;
        if (passwordHash && userData.authMethod === 'email') {
            passwordHash = await bcrypt.hash(passwordHash, 10);
        }

        const query = `
      INSERT INTO user_accounts (
        id, email, password_hash, google_id, facebook_id, 
        auth_method, email_verified, is_active, created_at, last_login_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

        const values = [
            id,
            userData.email || null,
            passwordHash || null,
            userData.googleId || null,
            userData.facebookId || null,
            userData.authMethod,
            userData.emailVerified,
            userData.isActive,
            now,
            null
        ];

        const result = await this.db.query(query, values);
        return this.mapRowToUserAccount(result.rows[0]);
    }

    async findById(id: string): Promise<UserAccount | null> {
        const query = 'SELECT * FROM user_accounts WHERE id = $1';
        const result = await this.db.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToUserAccount(result.rows[0]);
    }

    async findByEmail(email: string): Promise<UserAccount | null> {
        const query = 'SELECT * FROM user_accounts WHERE email = $1';
        const result = await this.db.query(query, [email]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToUserAccount(result.rows[0]);
    }

    async findByGoogleId(googleId: string): Promise<UserAccount | null> {
        const query = 'SELECT * FROM user_accounts WHERE google_id = $1';
        const result = await this.db.query(query, [googleId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToUserAccount(result.rows[0]);
    }

    async findByFacebookId(facebookId: string): Promise<UserAccount | null> {
        const query = 'SELECT * FROM user_accounts WHERE facebook_id = $1';
        const result = await this.db.query(query, [facebookId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToUserAccount(result.rows[0]);
    }

    async updateLastLogin(id: string): Promise<void> {
        const query = 'UPDATE user_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1';
        await this.db.query(query, [id]);
    }

    async verifyPassword(email: string, password: string): Promise<UserAccount | null> {
        const user = await this.findByEmail(email);
        if (!user || !user.passwordHash) {
            return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        return isValid ? user : null;
    }

    async updateEmailVerification(id: string, verified: boolean): Promise<void> {
        const query = 'UPDATE user_accounts SET email_verified = $1 WHERE id = $2';
        await this.db.query(query, [verified, id]);
    }

    async deactivateAccount(id: string): Promise<void> {
        const query = 'UPDATE user_accounts SET is_active = false WHERE id = $1';
        await this.db.query(query, [id]);
    }

    async softDelete(id: string): Promise<void> {
        const query = 'UPDATE user_accounts SET is_active = false, deleted_at = CURRENT_TIMESTAMP WHERE id = $1';
        await this.db.query(query, [id]);
    }

    async hardDelete(id: string): Promise<void> {
        const query = 'DELETE FROM user_accounts WHERE id = $1';
        await this.db.query(query, [id]);
    }

    private mapRowToUserAccount(row: any): UserAccount {
        return {
            id: row.id,
            email: row.email,
            passwordHash: row.password_hash,
            googleId: row.google_id,
            facebookId: row.facebook_id,
            authMethod: row.auth_method as AuthMethod,
            emailVerified: row.email_verified,
            createdAt: new Date(row.created_at),
            lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : new Date(),
            isActive: row.is_active
        };
    }
}