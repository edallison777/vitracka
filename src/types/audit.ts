/**
 * Audit logging type definitions
 * Types for comprehensive system audit trails and logging
 */

export type AuditEventType =
    | 'agent_interaction'
    | 'safety_intervention'
    | 'user_authentication'
    | 'profile_update'
    | 'weight_entry'
    | 'eating_plan_change'
    | 'breach_event'
    | 'gamification_reward'
    | 'notification_sent'
    | 'cost_analysis'
    | 'system_decision'
    | 'data_export'
    | 'data_deletion'
    | 'admin_action';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogEntry {
    id: string;
    timestamp: Date;
    eventType: AuditEventType;
    severity: AuditSeverity;
    userId?: string;
    agentId?: string;
    sessionId?: string;

    // Event details
    action: string;
    description: string;
    metadata: Record<string, any>;

    // Safety-specific fields
    isSafetyRelated: boolean;
    requiresAdminReview: boolean;
    adminReviewed: boolean;
    reviewedAt?: Date;
    reviewedBy?: string;

    // Data security compliance
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
    retentionPeriod: number; // days

    // Request/response tracking
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;

    // Error tracking
    errorCode?: string;
    errorMessage?: string;
    stackTrace?: string;
}

export interface AuditLogFilter {
    eventTypes?: AuditEventType[];
    severity?: AuditSeverity[];
    userId?: string;
    agentId?: string;
    startDate?: Date;
    endDate?: Date;
    isSafetyRelated?: boolean;
    requiresAdminReview?: boolean;
    adminReviewed?: boolean;
}

export interface AuditLogSummary {
    totalEntries: number;
    safetyRelatedEntries: number;
    pendingAdminReview: number;
    errorEntries: number;
    criticalEntries: number;
    eventTypeCounts: Record<AuditEventType, number>;
    severityCounts: Record<AuditSeverity, number>;
    timeRange: {
        earliest: Date;
        latest: Date;
    };
}

export interface AuditConfiguration {
    enabledEventTypes: AuditEventType[];
    defaultRetentionPeriod: number; // days
    autoReviewThreshold: AuditSeverity;
    safetyEventAutoEscalation: boolean;
    complianceMode: 'standard' | 'strict' | 'minimal';
    encryptionEnabled: boolean;
    realTimeAlerting: boolean;
}

export interface SafetyAuditEvent extends AuditLogEntry {
    triggerType: 'eating_disorder' | 'self_harm' | 'depression' | 'medical_emergency';
    triggerContent: string;
    interventionResponse: string;
    escalationLevel: 'low' | 'medium' | 'high' | 'critical';
    followUpRequired: boolean;
    adminNotificationSent: boolean;
}