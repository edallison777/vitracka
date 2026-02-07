/**
 * Privacy and Data Portability Types
 * Based on GDPR and data protection requirements
 */

export interface DataExportRequest {
    userId: string;
    requestId: string;
    requestedAt: Date;
    format: 'json' | 'csv' | 'xml';
    includeDeleted?: boolean;
    dataTypes?: DataType[];
    status: 'pending' | 'processing' | 'completed' | 'failed';
    completedAt?: Date;
    downloadUrl?: string;
    expiresAt?: Date;
}

export interface DataDeletionRequest {
    userId: string;
    requestId: string;
    requestedAt: Date;
    deletionType: 'soft' | 'hard';
    retainAuditLogs: boolean;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    completedAt?: Date;
    verificationRequired: boolean;
    verifiedAt?: Date;
}

export interface UserDataExport {
    userId: string;
    exportedAt: Date;
    format: 'json' | 'csv' | 'xml';
    data: {
        profile: any;
        weightEntries: any[];
        eatingPlans: any[];
        breachEvents: any[];
        safetyInterventions: any[];
        gamificationData: any[];
        notificationSettings: any;
        auditLogs?: any[];
    };
    metadata: {
        totalRecords: number;
        dataTypes: DataType[];
        exportVersion: string;
        checksums: Record<string, string>;
    };
}

export type DataType =
    | 'profile'
    | 'weight_entries'
    | 'eating_plans'
    | 'breach_events'
    | 'safety_interventions'
    | 'gamification_data'
    | 'notification_settings'
    | 'audit_logs';

export interface ConsentRecord {
    userId: string;
    consentType: 'data_processing' | 'marketing' | 'analytics' | 'third_party_sharing';
    granted: boolean;
    grantedAt?: Date;
    revokedAt?: Date;
    version: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface PrivacySettings {
    userId: string;
    dataRetentionPeriod: number; // days
    allowAnalytics: boolean;
    allowMarketing: boolean;
    allowThirdPartySharing: boolean;
    anonymizeData: boolean;
    updatedAt: Date;
}

export interface DataPortabilityResult {
    success: boolean;
    requestId: string;
    processedAt: Date;
    completedWithinTimeframe: boolean;
    timeframeDays: number;
    errors?: string[];
    warnings?: string[];
}