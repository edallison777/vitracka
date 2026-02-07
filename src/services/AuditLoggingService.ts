/**
 * Comprehensive Audit Logging Service
 * Handles all system audit logging with safety-first approach
 */

import { Pool } from 'pg';
import {
    AuditLogEntry,
    AuditLogFilter,
    AuditLogSummary,
    AuditEventType,
    AuditSeverity,
    SafetyAuditEvent,
    AuditConfiguration
} from '../types/audit';
import { AuditLogRepository } from '../database/repositories/AuditLogRepository';

export class AuditLoggingService {
    private repository: AuditLogRepository;
    private configuration: AuditConfiguration | null = null;

    constructor(private pool: Pool) {
        this.repository = new AuditLogRepository(pool);
    }

    /**
     * Log a general system event
     */
    async logEvent(params: {
        eventType: AuditEventType;
        severity: AuditSeverity;
        action: string;
        description: string;
        userId?: string;
        agentId?: string;
        sessionId?: string;
        metadata?: Record<string, any>;
        requestId?: string;
        ipAddress?: string;
        userAgent?: string;
        dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
    }): Promise<AuditLogEntry> {
        const config = await this.getConfiguration();

        // Check if this event type is enabled
        if (!config.enabledEventTypes.includes(params.eventType)) {
            // Still log critical events even if disabled
            if (params.severity !== 'critical') {
                return this.createNoOpEntry(params);
            }
        }

        const entry: Omit<AuditLogEntry, 'id'> = {
            timestamp: new Date(),
            eventType: params.eventType,
            severity: params.severity,
            userId: params.userId,
            agentId: params.agentId,
            sessionId: params.sessionId,
            action: params.action,
            description: params.description,
            metadata: params.metadata || {},
            isSafetyRelated: this.isSafetyRelatedEvent(params.eventType, params.metadata),
            requiresAdminReview: this.requiresAdminReview(params.severity, params.eventType),
            adminReviewed: false,
            dataClassification: params.dataClassification || this.determineDataClassification(params.eventType),
            retentionPeriod: config.defaultRetentionPeriod,
            requestId: params.requestId,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent
        };

        const loggedEntry = await this.repository.createAuditEntry(entry);

        // Handle real-time alerting for critical events
        if (config.realTimeAlerting && (params.severity === 'critical' || entry.isSafetyRelated)) {
            await this.sendRealTimeAlert(loggedEntry);
        }

        return loggedEntry;
    }

    /**
     * Log a safety-specific event with enhanced tracking
     */
    async logSafetyEvent(params: {
        eventType: AuditEventType;
        severity: AuditSeverity;
        action: string;
        description: string;
        userId: string;
        agentId: string;
        sessionId?: string;
        triggerType: 'eating_disorder' | 'self_harm' | 'depression' | 'medical_emergency';
        triggerContent: string;
        interventionResponse: string;
        escalationLevel: 'low' | 'medium' | 'high' | 'critical';
        followUpRequired: boolean;
        adminNotificationSent: boolean;
        requestId?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<SafetyAuditEvent> {
        const entry: Omit<SafetyAuditEvent, 'id'> = {
            timestamp: new Date(),
            eventType: params.eventType,
            severity: params.severity,
            userId: params.userId,
            agentId: params.agentId,
            sessionId: params.sessionId,
            action: params.action,
            description: params.description,
            metadata: {
                originalTrigger: params.triggerContent,
                responseGenerated: params.interventionResponse,
                escalationPath: params.escalationLevel,
                requiresFollowUp: params.followUpRequired
            },
            isSafetyRelated: true,
            requiresAdminReview: true,
            adminReviewed: false,
            dataClassification: 'restricted', // Safety events are always restricted
            retentionPeriod: 2555, // 7 years for safety events
            requestId: params.requestId,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            triggerType: params.triggerType,
            triggerContent: params.triggerContent,
            interventionResponse: params.interventionResponse,
            escalationLevel: params.escalationLevel,
            followUpRequired: params.followUpRequired,
            adminNotificationSent: params.adminNotificationSent
        };

        const loggedEntry = await this.repository.createSafetyAuditEntry(entry);

        // Always send real-time alerts for safety events
        await this.sendRealTimeAlert(loggedEntry);

        return loggedEntry;
    }

    /**
     * Log agent interaction
     */
    async logAgentInteraction(params: {
        agentId: string;
        userId: string;
        sessionId: string;
        action: string;
        userInput: string;
        agentResponse: string;
        processingTime: number;
        requestId?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<AuditLogEntry> {
        return this.logEvent({
            eventType: 'agent_interaction',
            severity: 'info',
            action: params.action,
            description: `Agent ${params.agentId} processed user interaction`,
            userId: params.userId,
            agentId: params.agentId,
            sessionId: params.sessionId,
            metadata: {
                userInput: this.sanitizeUserInput(params.userInput),
                agentResponse: params.agentResponse,
                processingTimeMs: params.processingTime,
                interactionType: params.action
            },
            requestId: params.requestId,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            dataClassification: 'confidential'
        });
    }

    /**
     * Log system decision
     */
    async logSystemDecision(params: {
        decision: string;
        reasoning: string;
        agentId?: string;
        userId?: string;
        metadata?: Record<string, any>;
        severity?: AuditSeverity;
    }): Promise<AuditLogEntry> {
        return this.logEvent({
            eventType: 'system_decision',
            severity: params.severity || 'info',
            action: 'system_decision',
            description: `System decision: ${params.decision}`,
            userId: params.userId,
            agentId: params.agentId,
            metadata: {
                decision: params.decision,
                reasoning: params.reasoning,
                ...params.metadata
            },
            dataClassification: 'internal'
        });
    }

    /**
     * Log error with stack trace
     */
    async logError(params: {
        error: Error;
        context: string;
        userId?: string;
        agentId?: string;
        sessionId?: string;
        requestId?: string;
        severity?: 'error' | 'critical';
    }): Promise<AuditLogEntry> {
        return this.logEvent({
            eventType: 'system_decision',
            severity: params.severity || 'error',
            action: 'error_occurred',
            description: `Error in ${params.context}: ${params.error.message}`,
            userId: params.userId,
            agentId: params.agentId,
            sessionId: params.sessionId,
            metadata: {
                errorName: params.error.name,
                errorMessage: params.error.message,
                context: params.context,
                stackTrace: params.error.stack
            },
            requestId: params.requestId,
            dataClassification: 'internal'
        });
    }

    /**
     * Get audit entries with filtering
     */
    async getAuditEntries(filter: AuditLogFilter, limit: number = 100, offset: number = 0): Promise<AuditLogEntry[]> {
        return this.repository.getAuditEntries(filter, limit, offset);
    }

    /**
     * Get audit summary statistics
     */
    async getAuditSummary(filter: AuditLogFilter): Promise<AuditLogSummary> {
        return this.repository.getAuditSummary(filter);
    }

    /**
     * Get safety entries requiring admin review
     */
    async getSafetyEntriesForReview(limit: number = 50): Promise<SafetyAuditEvent[]> {
        return this.repository.getSafetyEntriesForReview(limit);
    }

    /**
     * Mark entries as reviewed by admin
     */
    async markAsReviewed(entryIds: string[], reviewedBy: string): Promise<void> {
        await this.repository.markAsReviewed(entryIds, reviewedBy);

        // Log the review action
        await this.logEvent({
            eventType: 'admin_action',
            severity: 'info',
            action: 'audit_review',
            description: `Admin ${reviewedBy} reviewed ${entryIds.length} audit entries`,
            metadata: {
                reviewedEntries: entryIds.length,
                reviewedBy: reviewedBy,
                reviewedAt: new Date()
            },
            dataClassification: 'internal'
        });
    }

    /**
     * Cleanup expired audit entries
     */
    async cleanupExpiredEntries(): Promise<number> {
        const deletedCount = await this.repository.cleanupExpiredEntries();

        // Log the cleanup operation
        await this.logEvent({
            eventType: 'system_decision',
            severity: 'info',
            action: 'audit_cleanup',
            description: `Cleaned up ${deletedCount} expired audit entries`,
            agentId: 'system',
            metadata: {
                deletedCount,
                cleanupDate: new Date()
            },
            dataClassification: 'internal'
        });

        return deletedCount;
    }

    /**
     * Get audit configuration
     */
    private async getConfiguration(): Promise<AuditConfiguration> {
        if (this.configuration) {
            return this.configuration;
        }

        // Load from database or use defaults
        const query = `SELECT * FROM audit_configuration ORDER BY created_at DESC LIMIT 1`;
        const result = await this.pool.query(query);

        if (result.rows.length > 0) {
            const row = result.rows[0];
            this.configuration = {
                enabledEventTypes: row.enabled_event_types,
                defaultRetentionPeriod: row.default_retention_period,
                autoReviewThreshold: row.auto_review_threshold,
                safetyEventAutoEscalation: row.safety_event_auto_escalation,
                complianceMode: row.compliance_mode,
                encryptionEnabled: row.encryption_enabled,
                realTimeAlerting: row.real_time_alerting
            };
        } else {
            // Default configuration
            this.configuration = {
                enabledEventTypes: [
                    'agent_interaction', 'safety_intervention', 'user_authentication',
                    'profile_update', 'weight_entry', 'eating_plan_change', 'breach_event',
                    'gamification_reward', 'notification_sent', 'cost_analysis',
                    'system_decision', 'data_export', 'data_deletion', 'admin_action'
                ],
                defaultRetentionPeriod: 365,
                autoReviewThreshold: 'error',
                safetyEventAutoEscalation: true,
                complianceMode: 'standard',
                encryptionEnabled: true,
                realTimeAlerting: true
            };
        }

        return this.configuration;
    }

    /**
     * Determine if an event is safety-related
     */
    private isSafetyRelatedEvent(eventType: AuditEventType, metadata?: Record<string, any>): boolean {
        if (eventType === 'safety_intervention') {
            return true;
        }

        // Check metadata for safety indicators
        if (metadata) {
            const safetyKeywords = ['trigger', 'intervention', 'escalation', 'safety', 'crisis'];
            const metadataString = JSON.stringify(metadata).toLowerCase();
            return safetyKeywords.some(keyword => metadataString.includes(keyword));
        }

        return false;
    }

    /**
     * Determine if an event requires admin review
     */
    private requiresAdminReview(severity: AuditSeverity, eventType: AuditEventType): boolean {
        // Always require review for critical events and safety interventions
        if (severity === 'critical' || eventType === 'safety_intervention') {
            return true;
        }

        // Require review for error-level events
        if (severity === 'error') {
            return true;
        }

        // Require review for sensitive operations
        const sensitiveEvents: AuditEventType[] = ['data_export', 'data_deletion', 'admin_action'];
        return sensitiveEvents.includes(eventType);
    }

    /**
     * Determine data classification based on event type
     */
    private determineDataClassification(eventType: AuditEventType): 'public' | 'internal' | 'confidential' | 'restricted' {
        switch (eventType) {
            case 'safety_intervention':
                return 'restricted';
            case 'agent_interaction':
            case 'user_authentication':
            case 'profile_update':
            case 'weight_entry':
                return 'confidential';
            case 'system_decision':
            case 'cost_analysis':
            case 'admin_action':
                return 'internal';
            default:
                return 'internal';
        }
    }

    /**
     * Sanitize user input for logging (remove sensitive data)
     */
    private sanitizeUserInput(input: string): string {
        // Remove potential sensitive information while preserving structure for analysis
        return input
            .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_NUMBER]') // Credit cards
            .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email
            .replace(/\b\d{10,}\b/g, '[PHONE]'); // Phone numbers
    }

    /**
     * Send real-time alert for critical events
     */
    private async sendRealTimeAlert(entry: AuditLogEntry | SafetyAuditEvent): Promise<void> {
        // Implementation would integrate with notification system
        // For now, just log that an alert should be sent
        console.warn(`AUDIT ALERT: ${entry.severity.toUpperCase()} - ${entry.description}`, {
            id: entry.id,
            eventType: entry.eventType,
            timestamp: entry.timestamp,
            userId: entry.userId,
            agentId: entry.agentId
        });
    }

    /**
     * Create a no-op entry for disabled event types
     */
    private createNoOpEntry(params: any): AuditLogEntry {
        return {
            id: 'noop',
            timestamp: new Date(),
            eventType: params.eventType,
            severity: params.severity,
            action: params.action,
            description: 'Event logging disabled for this type',
            metadata: {},
            isSafetyRelated: false,
            requiresAdminReview: false,
            adminReviewed: true,
            dataClassification: 'public',
            retentionPeriod: 0
        };
    }
}