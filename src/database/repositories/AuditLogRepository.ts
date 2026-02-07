/**
 * Audit Log Repository
 * Handles database operations for comprehensive audit logging
 */

import { Pool } from 'pg';
import {
    AuditLogEntry,
    AuditLogFilter,
    AuditLogSummary,
    AuditEventType,
    AuditSeverity,
    SafetyAuditEvent
} from '../../types/audit';

export class AuditLogRepository {
    constructor(private pool: Pool) { }

    /**
     * Create a new audit log entry
     */
    async createAuditEntry(entry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> {
        const query = `
            INSERT INTO audit_logs (
                timestamp, event_type, severity, user_id, agent_id, session_id,
                action, description, metadata, is_safety_related, requires_admin_review,
                admin_reviewed, data_classification, retention_period, request_id,
                ip_address, user_agent, error_code, error_message, stack_trace
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
            ) RETURNING *
        `;

        const values = [
            entry.timestamp,
            entry.eventType,
            entry.severity,
            entry.userId || null,
            entry.agentId || null,
            entry.sessionId || null,
            entry.action,
            entry.description,
            JSON.stringify(entry.metadata),
            entry.isSafetyRelated,
            entry.requiresAdminReview,
            entry.adminReviewed,
            entry.dataClassification,
            entry.retentionPeriod,
            entry.requestId || null,
            entry.ipAddress || null,
            entry.userAgent || null,
            entry.errorCode || null,
            entry.errorMessage || null,
            entry.stackTrace || null
        ];

        const result = await this.pool.query(query, values);
        return this.mapRowToAuditEntry(result.rows[0]);
    }

    /**
     * Create a safety-specific audit entry
     */
    async createSafetyAuditEntry(entry: Omit<SafetyAuditEvent, 'id'>): Promise<SafetyAuditEvent> {
        const query = `
            INSERT INTO audit_logs (
                timestamp, event_type, severity, user_id, agent_id, session_id,
                action, description, metadata, is_safety_related, requires_admin_review,
                admin_reviewed, data_classification, retention_period, request_id,
                ip_address, user_agent
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            ) RETURNING *
        `;

        const metadata = {
            ...entry.metadata,
            triggerType: entry.triggerType,
            triggerContent: entry.triggerContent,
            interventionResponse: entry.interventionResponse,
            escalationLevel: entry.escalationLevel,
            followUpRequired: entry.followUpRequired,
            adminNotificationSent: entry.adminNotificationSent
        };

        const values = [
            entry.timestamp,
            entry.eventType,
            entry.severity,
            entry.userId || null,
            entry.agentId || null,
            entry.sessionId || null,
            entry.action,
            entry.description,
            JSON.stringify(metadata),
            true, // Always safety-related
            true, // Always requires admin review
            entry.adminReviewed,
            entry.dataClassification,
            entry.retentionPeriod,
            entry.requestId || null,
            entry.ipAddress || null,
            entry.userAgent || null
        ];

        const result = await this.pool.query(query, values);
        return this.mapRowToSafetyAuditEntry(result.rows[0]);
    }

    /**
     * Retrieve audit entries with filtering
     */
    async getAuditEntries(filter: AuditLogFilter, limit: number = 100, offset: number = 0): Promise<AuditLogEntry[]> {
        let query = `
            SELECT * FROM audit_logs
            WHERE 1=1
        `;
        const values: any[] = [];
        let paramCount = 0;

        // Apply filters
        if (filter.eventTypes && filter.eventTypes.length > 0) {
            paramCount++;
            query += ` AND event_type = ANY($${paramCount})`;
            values.push(filter.eventTypes);
        }

        if (filter.severity && filter.severity.length > 0) {
            paramCount++;
            query += ` AND severity = ANY($${paramCount})`;
            values.push(filter.severity);
        }

        if (filter.userId) {
            paramCount++;
            query += ` AND user_id = $${paramCount}`;
            values.push(filter.userId);
        }

        if (filter.agentId) {
            paramCount++;
            query += ` AND agent_id = $${paramCount}`;
            values.push(filter.agentId);
        }

        if (filter.startDate) {
            paramCount++;
            query += ` AND timestamp >= $${paramCount}`;
            values.push(filter.startDate);
        }

        if (filter.endDate) {
            paramCount++;
            query += ` AND timestamp <= $${paramCount}`;
            values.push(filter.endDate);
        }

        if (filter.isSafetyRelated !== undefined) {
            paramCount++;
            query += ` AND is_safety_related = $${paramCount}`;
            values.push(filter.isSafetyRelated);
        }

        if (filter.requiresAdminReview !== undefined) {
            paramCount++;
            query += ` AND requires_admin_review = $${paramCount}`;
            values.push(filter.requiresAdminReview);
        }

        if (filter.adminReviewed !== undefined) {
            paramCount++;
            query += ` AND admin_reviewed = $${paramCount}`;
            values.push(filter.adminReviewed);
        }

        query += ` ORDER BY timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        values.push(limit, offset);

        const result = await this.pool.query(query, values);
        return result.rows.map(row => this.mapRowToAuditEntry(row));
    }

    /**
     * Get audit log summary statistics
     */
    async getAuditSummary(filter: AuditLogFilter): Promise<AuditLogSummary> {
        let baseQuery = `
            SELECT 
                COUNT(*) as total_entries,
                COUNT(*) FILTER (WHERE is_safety_related = true) as safety_related_entries,
                COUNT(*) FILTER (WHERE requires_admin_review = true AND admin_reviewed = false) as pending_admin_review,
                COUNT(*) FILTER (WHERE severity = 'error' OR severity = 'critical') as error_entries,
                COUNT(*) FILTER (WHERE severity = 'critical') as critical_entries,
                MIN(timestamp) as earliest,
                MAX(timestamp) as latest
            FROM audit_logs
            WHERE 1=1
        `;

        const values: any[] = [];
        let paramCount = 0;

        // Apply same filters as getAuditEntries
        if (filter.startDate) {
            paramCount++;
            baseQuery += ` AND timestamp >= $${paramCount}`;
            values.push(filter.startDate);
        }

        if (filter.endDate) {
            paramCount++;
            baseQuery += ` AND timestamp <= $${paramCount}`;
            values.push(filter.endDate);
        }

        if (filter.userId) {
            paramCount++;
            baseQuery += ` AND user_id = $${paramCount}`;
            values.push(filter.userId);
        }

        const summaryResult = await this.pool.query(baseQuery, values);
        const summaryRow = summaryResult.rows[0];

        // Get event type counts
        const eventTypeQuery = `
            SELECT event_type, COUNT(*) as count
            FROM audit_logs
            WHERE 1=1 ${values.length > 0 ? 'AND timestamp >= $1' + (values.length > 1 ? ' AND timestamp <= $2' : '') : ''}
            GROUP BY event_type
        `;
        const eventTypeResult = await this.pool.query(eventTypeQuery, values.slice(0, 2));

        // Get severity counts
        const severityQuery = `
            SELECT severity, COUNT(*) as count
            FROM audit_logs
            WHERE 1=1 ${values.length > 0 ? 'AND timestamp >= $1' + (values.length > 1 ? ' AND timestamp <= $2' : '') : ''}
            GROUP BY severity
        `;
        const severityResult = await this.pool.query(severityQuery, values.slice(0, 2));

        const eventTypeCounts: Record<AuditEventType, number> = {} as any;
        eventTypeResult.rows.forEach(row => {
            eventTypeCounts[row.event_type as AuditEventType] = parseInt(row.count);
        });

        const severityCounts: Record<AuditSeverity, number> = {} as any;
        severityResult.rows.forEach(row => {
            severityCounts[row.severity as AuditSeverity] = parseInt(row.count);
        });

        return {
            totalEntries: parseInt(summaryRow.total_entries),
            safetyRelatedEntries: parseInt(summaryRow.safety_related_entries),
            pendingAdminReview: parseInt(summaryRow.pending_admin_review),
            errorEntries: parseInt(summaryRow.error_entries),
            criticalEntries: parseInt(summaryRow.critical_entries),
            eventTypeCounts,
            severityCounts,
            timeRange: {
                earliest: summaryRow.earliest,
                latest: summaryRow.latest
            }
        };
    }

    /**
     * Mark audit entries as reviewed by admin
     */
    async markAsReviewed(entryIds: string[], reviewedBy: string): Promise<void> {
        const query = `
            UPDATE audit_logs 
            SET admin_reviewed = true, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1
            WHERE id = ANY($2)
        `;
        await this.pool.query(query, [reviewedBy, entryIds]);
    }

    /**
     * Get safety-related entries requiring admin review
     */
    async getSafetyEntriesForReview(limit: number = 50): Promise<SafetyAuditEvent[]> {
        const query = `
            SELECT * FROM audit_logs
            WHERE is_safety_related = true 
            AND requires_admin_review = true 
            AND admin_reviewed = false
            ORDER BY timestamp DESC
            LIMIT $1
        `;
        const result = await this.pool.query(query, [limit]);
        return result.rows.map(row => this.mapRowToSafetyAuditEntry(row));
    }

    /**
     * Clean up old audit entries based on retention period
     */
    async cleanupExpiredEntries(): Promise<number> {
        const query = `
            DELETE FROM audit_logs
            WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_period
            AND admin_reviewed = true
        `;
        const result = await this.pool.query(query);
        return result.rowCount || 0;
    }

    /**
     * Map database row to AuditLogEntry
     */
    private mapRowToAuditEntry(row: any): AuditLogEntry {
        return {
            id: row.id,
            timestamp: row.timestamp,
            eventType: row.event_type,
            severity: row.severity,
            userId: row.user_id,
            agentId: row.agent_id,
            sessionId: row.session_id,
            action: row.action,
            description: row.description,
            metadata: JSON.parse(row.metadata || '{}'),
            isSafetyRelated: row.is_safety_related,
            requiresAdminReview: row.requires_admin_review,
            adminReviewed: row.admin_reviewed,
            reviewedAt: row.reviewed_at,
            reviewedBy: row.reviewed_by,
            dataClassification: row.data_classification,
            retentionPeriod: row.retention_period,
            requestId: row.request_id,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            errorCode: row.error_code,
            errorMessage: row.error_message,
            stackTrace: row.stack_trace
        };
    }

    /**
     * Map database row to SafetyAuditEvent
     */
    private mapRowToSafetyAuditEntry(row: any): SafetyAuditEvent {
        const baseEntry = this.mapRowToAuditEntry(row);
        const metadata = JSON.parse(row.metadata || '{}');

        return {
            ...baseEntry,
            triggerType: metadata.triggerType,
            triggerContent: metadata.triggerContent,
            interventionResponse: metadata.interventionResponse,
            escalationLevel: metadata.escalationLevel,
            followUpRequired: metadata.followUpRequired,
            adminNotificationSent: metadata.adminNotificationSent
        };
    }

    async hardDeleteByUserId(userId: string): Promise<void> {
        const query = 'DELETE FROM audit_logs WHERE user_id = $1';
        await this.pool.query(query, [userId]);
    }

    async findByUserId(userId: string, limit?: number): Promise<AuditLogEntry[]> {
        let query = 'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY timestamp DESC';
        const values: any[] = [userId];

        if (limit) {
            query += ' LIMIT $2';
            values.push(limit);
        }

        const result = await this.pool.query(query, values);
        return result.rows.map((row: any) => this.mapRowToAuditEntry(row));
    }
}