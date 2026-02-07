/**
 * Session Manager
 * Manages user sessions and token lifecycle
 * Implements secure session handling for Requirements 19.1, 19.2, 19.3
 */

import { UserAccount } from '../types';

export interface UserSession {
    userId: string;
    sessionId: string;
    deviceId?: string;
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    lastActivity: Date;
    isActive: boolean;
}

export interface SessionOptions {
    maxSessions?: number; // Maximum concurrent sessions per user
    sessionTimeout?: number; // Session timeout in milliseconds
    extendOnActivity?: boolean; // Extend session on user activity
}

export class SessionManager {
    private sessions: Map<string, UserSession> = new Map();
    private userSessions: Map<string, Set<string>> = new Map(); // userId -> sessionIds
    private options: SessionOptions;

    constructor(options: SessionOptions = {}) {
        this.options = {
            maxSessions: 5,
            sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
            extendOnActivity: true,
            ...options
        };

        // Clean up expired sessions every hour
        setInterval(() => this.cleanupExpiredSessions(), 60 * 60 * 1000);
    }

    /**
     * Create a new session for a user
     */
    createSession(
        user: UserAccount,
        deviceId?: string,
        deviceInfo?: string,
        ipAddress?: string,
        userAgent?: string
    ): UserSession {
        const sessionId = this.generateSessionId();
        const now = new Date();

        const session: UserSession = {
            userId: user.id,
            sessionId,
            deviceId,
            deviceInfo,
            ipAddress,
            userAgent,
            createdAt: now,
            lastActivity: now,
            isActive: true
        };

        // Check if user has too many active sessions
        this.enforceSessionLimit(user.id);

        // Store session
        this.sessions.set(sessionId, session);

        // Track user sessions
        if (!this.userSessions.has(user.id)) {
            this.userSessions.set(user.id, new Set());
        }
        this.userSessions.get(user.id)!.add(sessionId);

        return session;
    }

    /**
     * Get session by session ID
     */
    getSession(sessionId: string): UserSession | null {
        const session = this.sessions.get(sessionId);

        if (!session || !session.isActive) {
            return null;
        }

        // Check if session has expired
        if (this.isSessionExpired(session)) {
            this.invalidateSession(sessionId);
            return null;
        }

        return session;
    }

    /**
     * Update session activity
     */
    updateActivity(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);

        if (!session || !session.isActive) {
            return false;
        }

        if (this.options.extendOnActivity) {
            session.lastActivity = new Date();
        }

        return true;
    }

    /**
     * Invalidate a specific session
     */
    invalidateSession(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);

        if (!session) {
            return false;
        }

        session.isActive = false;
        this.sessions.delete(sessionId);

        // Remove from user sessions tracking
        const userSessionSet = this.userSessions.get(session.userId);
        if (userSessionSet) {
            userSessionSet.delete(sessionId);
            if (userSessionSet.size === 0) {
                this.userSessions.delete(session.userId);
            }
        }

        return true;
    }

    /**
     * Invalidate all sessions for a user
     */
    invalidateUserSessions(userId: string): number {
        const userSessionSet = this.userSessions.get(userId);

        if (!userSessionSet) {
            return 0;
        }

        let invalidatedCount = 0;
        for (const sessionId of userSessionSet) {
            if (this.invalidateSession(sessionId)) {
                invalidatedCount++;
            }
        }

        return invalidatedCount;
    }

    /**
     * Get all active sessions for a user
     */
    getUserSessions(userId: string): UserSession[] {
        const userSessionSet = this.userSessions.get(userId);

        if (!userSessionSet) {
            return [];
        }

        const sessions: UserSession[] = [];
        for (const sessionId of userSessionSet) {
            const session = this.getSession(sessionId);
            if (session) {
                sessions.push(session);
            }
        }

        return sessions;
    }

    /**
     * Check if session has expired
     */
    private isSessionExpired(session: UserSession): boolean {
        const now = new Date();
        const sessionAge = now.getTime() - session.lastActivity.getTime();
        return sessionAge > this.options.sessionTimeout!;
    }

    /**
     * Enforce maximum session limit per user
     */
    private enforceSessionLimit(userId: string): void {
        const userSessionSet = this.userSessions.get(userId);

        if (!userSessionSet || userSessionSet.size < this.options.maxSessions!) {
            return;
        }

        // Find oldest session and remove it
        let oldestSession: UserSession | null = null;
        let oldestSessionId: string | null = null;

        for (const sessionId of userSessionSet) {
            const session = this.sessions.get(sessionId);
            if (session && (!oldestSession || session.createdAt < oldestSession.createdAt)) {
                oldestSession = session;
                oldestSessionId = sessionId;
            }
        }

        if (oldestSessionId) {
            this.invalidateSession(oldestSessionId);
        }
    }

    /**
     * Clean up expired sessions
     */
    private cleanupExpiredSessions(): void {
        const now = new Date();
        const expiredSessions: string[] = [];

        for (const [sessionId, session] of this.sessions) {
            if (this.isSessionExpired(session)) {
                expiredSessions.push(sessionId);
            }
        }

        for (const sessionId of expiredSessions) {
            this.invalidateSession(sessionId);
        }

        console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2);
        return `sess_${timestamp}_${randomPart}`;
    }

    /**
     * Get session statistics
     */
    getSessionStats(): {
        totalSessions: number;
        activeUsers: number;
        averageSessionsPerUser: number;
    } {
        return {
            totalSessions: this.sessions.size,
            activeUsers: this.userSessions.size,
            averageSessionsPerUser: this.userSessions.size > 0
                ? this.sessions.size / this.userSessions.size
                : 0
        };
    }
}

// Export singleton instance
export const sessionManager = new SessionManager();