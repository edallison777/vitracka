/**
 * Data Portability Service
 * Handles user data export and deletion requests for GDPR compliance
 */

import {
    DataExportRequest,
    DataDeletionRequest,
    UserDataExport,
    DataPortabilityResult,
    DataType,
    ConsentRecord,
    PrivacySettings
} from '../types/privacy';
import { UserAccountRepository } from '../database/repositories/UserAccountRepository';
import { UserSupportProfileRepository } from '../database/repositories/UserSupportProfileRepository';
import { WeightEntryRepository } from '../database/repositories/WeightEntryRepository';
import { EatingPlanRepository } from '../database/repositories/EatingPlanRepository';
import { BreachEventRepository } from '../database/repositories/BreachEventRepository';
import { SafetyInterventionRepository } from '../database/repositories/SafetyInterventionRepository';
import { NotificationSettingsRepository } from '../database/repositories/NotificationSettingsRepository';
import { AuditLogRepository } from '../database/repositories/AuditLogRepository';
import { AuditLoggingService } from './AuditLoggingService';
import DatabaseConnection from '../database/connection';
import * as crypto from 'crypto';

export class DataPortabilityService {
    private userAccountRepo: UserAccountRepository;
    private userProfileRepo: UserSupportProfileRepository;
    private weightEntryRepo: WeightEntryRepository;
    private eatingPlanRepo: EatingPlanRepository;
    private breachEventRepo: BreachEventRepository;
    private safetyInterventionRepo: SafetyInterventionRepository;
    private notificationSettingsRepo: NotificationSettingsRepository;
    private auditLogRepo: AuditLogRepository;
    private auditService: AuditLoggingService;

    constructor() {
        this.userAccountRepo = new UserAccountRepository();
        this.userProfileRepo = new UserSupportProfileRepository();
        this.weightEntryRepo = new WeightEntryRepository();
        this.eatingPlanRepo = new EatingPlanRepository();
        this.breachEventRepo = new BreachEventRepository();
        this.safetyInterventionRepo = new SafetyInterventionRepository();
        this.notificationSettingsRepo = new NotificationSettingsRepository();

        // Get database connection for repositories that need it
        const db = DatabaseConnection.getInstance();
        const pool = db.getPool();
        this.auditLogRepo = new AuditLogRepository(pool);
        this.auditService = new AuditLoggingService(pool);
    }

    /**
     * Process data export request
     */
    async processDataExportRequest(request: DataExportRequest): Promise<DataPortabilityResult> {
        const startTime = Date.now();
        const requestId = request.requestId;

        try {
            // Log the export request
            await this.auditService.logEvent({
                eventType: 'data_export',
                severity: 'info',
                action: 'data_export_started',
                description: `User data export request initiated`,
                userId: request.userId,
                metadata: {
                    requestId,
                    format: request.format,
                    dataTypes: request.dataTypes || 'all'
                }
            });

            // Collect all user data
            const userData = await this.collectUserData(request.userId, request.dataTypes);

            // Create export package
            const exportData: UserDataExport = {
                userId: request.userId,
                exportedAt: new Date(),
                format: request.format,
                data: userData,
                metadata: {
                    totalRecords: this.countTotalRecords(userData),
                    dataTypes: request.dataTypes || this.getAllDataTypes(),
                    exportVersion: '1.0',
                    checksums: this.generateChecksums(userData)
                }
            };

            // Calculate processing time
            const processingTimeMs = Date.now() - startTime;
            const processingTimeDays = processingTimeMs / (1000 * 60 * 60 * 24);
            const completedWithinTimeframe = processingTimeDays <= 30; // GDPR requirement: 30 days

            // Log completion
            await this.auditService.logEvent({
                eventType: 'data_export',
                severity: 'info',
                action: 'data_export_completed',
                description: `User data export completed successfully`,
                userId: request.userId,
                metadata: {
                    requestId,
                    processingTimeMs,
                    totalRecords: exportData.metadata.totalRecords,
                    completedWithinTimeframe
                }
            });

            return {
                success: true,
                requestId,
                processedAt: new Date(),
                completedWithinTimeframe,
                timeframeDays: Math.ceil(processingTimeDays)
            };

        } catch (error) {
            await this.auditService.logError({
                error: error as Error,
                context: 'DataPortabilityService.processDataExportRequest',
                userId: request.userId
            });

            return {
                success: false,
                requestId,
                processedAt: new Date(),
                completedWithinTimeframe: false,
                timeframeDays: 0,
                errors: [(error as Error).message]
            };
        }
    }

    /**
     * Process data deletion request
     */
    async processDataDeletionRequest(request: DataDeletionRequest): Promise<DataPortabilityResult> {
        const startTime = Date.now();
        const requestId = request.requestId;

        try {
            // Log the deletion request
            await this.auditService.logEvent({
                eventType: 'data_deletion',
                severity: 'warning',
                action: 'data_deletion_started',
                description: `User data deletion request initiated`,
                userId: request.userId,
                metadata: {
                    requestId,
                    deletionType: request.deletionType,
                    retainAuditLogs: request.retainAuditLogs
                }
            });

            // Verify user identity if required
            if (request.verificationRequired && !request.verifiedAt) {
                throw new Error('User identity verification required before data deletion');
            }

            // Perform deletion based on type
            if (request.deletionType === 'soft') {
                await this.performSoftDeletion(request.userId);
            } else {
                await this.performHardDeletion(request.userId, request.retainAuditLogs);
            }

            // Calculate processing time
            const processingTimeMs = Date.now() - startTime;
            const processingTimeDays = processingTimeMs / (1000 * 60 * 60 * 24);
            const completedWithinTimeframe = processingTimeDays <= 30; // GDPR requirement: 30 days

            // Log completion
            await this.auditService.logEvent({
                eventType: 'data_deletion',
                severity: 'warning',
                action: 'data_deletion_completed',
                description: `User data deletion completed successfully`,
                userId: request.userId,
                metadata: {
                    requestId,
                    processingTimeMs,
                    deletionType: request.deletionType,
                    completedWithinTimeframe
                }
            });

            return {
                success: true,
                requestId,
                processedAt: new Date(),
                completedWithinTimeframe,
                timeframeDays: Math.ceil(processingTimeDays)
            };

        } catch (error) {
            await this.auditService.logError({
                error: error as Error,
                context: 'DataPortabilityService.processDataDeletionRequest',
                userId: request.userId
            });

            return {
                success: false,
                requestId,
                processedAt: new Date(),
                completedWithinTimeframe: false,
                timeframeDays: 0,
                errors: [(error as Error).message]
            };
        }
    }

    /**
     * Collect all user data for export
     */
    private async collectUserData(userId: string, dataTypes?: DataType[]): Promise<any> {
        const requestedTypes = dataTypes || this.getAllDataTypes();
        const userData: any = {};

        if (requestedTypes.includes('profile')) {
            userData.profile = await this.userProfileRepo.findByUserId(userId);
        }

        if (requestedTypes.includes('weight_entries')) {
            userData.weightEntries = await this.weightEntryRepo.findByUserId(userId);
        }

        if (requestedTypes.includes('eating_plans')) {
            userData.eatingPlans = await this.eatingPlanRepo.findByUserId(userId);
        }

        if (requestedTypes.includes('breach_events')) {
            userData.breachEvents = await this.breachEventRepo.findByUserId(userId);
        }

        if (requestedTypes.includes('safety_interventions')) {
            userData.safetyInterventions = await this.safetyInterventionRepo.findByUserId(userId);
        }

        if (requestedTypes.includes('notification_settings')) {
            userData.notificationSettings = await this.notificationSettingsRepo.findByUserId(userId);
        }

        if (requestedTypes.includes('audit_logs')) {
            userData.auditLogs = await this.auditLogRepo.findByUserId(userId);
        }

        return userData;
    }

    /**
     * Perform soft deletion (mark as deleted, retain data)
     */
    private async performSoftDeletion(userId: string): Promise<void> {
        // Mark user account as deleted
        await this.userAccountRepo.softDelete(userId);

        // Mark related data as deleted but retain for audit purposes
        await this.userProfileRepo.softDelete(userId);
        await this.weightEntryRepo.softDeleteByUserId(userId);
        await this.eatingPlanRepo.softDeleteByUserId(userId);
        await this.breachEventRepo.softDeleteByUserId(userId);
        await this.safetyInterventionRepo.softDeleteByUserId(userId);
        await this.notificationSettingsRepo.softDeleteByUserId(userId);
    }

    /**
     * Perform hard deletion (permanently remove data)
     */
    private async performHardDeletion(userId: string, retainAuditLogs: boolean): Promise<void> {
        // Delete user data permanently
        await this.userProfileRepo.hardDelete(userId);
        await this.weightEntryRepo.hardDeleteByUserId(userId);
        await this.eatingPlanRepo.hardDeleteByUserId(userId);
        await this.breachEventRepo.hardDeleteByUserId(userId);
        await this.safetyInterventionRepo.hardDeleteByUserId(userId);
        await this.notificationSettingsRepo.hardDeleteByUserId(userId);

        // Delete audit logs unless retention is required
        if (!retainAuditLogs) {
            await this.auditLogRepo.hardDeleteByUserId(userId);
        }

        // Delete user account last
        await this.userAccountRepo.hardDelete(userId);
    }

    /**
     * Count total records in user data
     */
    private countTotalRecords(userData: any): number {
        let count = 0;

        if (userData.profile) count += 1;
        if (userData.weightEntries) count += userData.weightEntries.length;
        if (userData.eatingPlans) count += userData.eatingPlans.length;
        if (userData.breachEvents) count += userData.breachEvents.length;
        if (userData.safetyInterventions) count += userData.safetyInterventions.length;
        if (userData.notificationSettings) count += 1;
        if (userData.auditLogs) count += userData.auditLogs.length;

        return count;
    }

    /**
     * Generate checksums for data integrity
     */
    private generateChecksums(userData: any): Record<string, string> {
        const checksums: Record<string, string> = {};

        Object.keys(userData).forEach(key => {
            const dataString = JSON.stringify(userData[key]);
            checksums[key] = crypto.createHash('sha256').update(dataString).digest('hex');
        });

        return checksums;
    }

    /**
     * Get all available data types
     */
    private getAllDataTypes(): DataType[] {
        return [
            'profile',
            'weight_entries',
            'eating_plans',
            'breach_events',
            'safety_interventions',
            'gamification_data',
            'notification_settings',
            'audit_logs'
        ];
    }

    /**
     * Validate data export completeness
     */
    async validateDataExportCompleteness(userId: string, exportData: UserDataExport): Promise<boolean> {
        try {
            // Verify all requested data types are present
            const requestedTypes = exportData.metadata.dataTypes;
            const actualTypes = Object.keys(exportData.data);

            for (const type of requestedTypes) {
                const dataKey = type === 'profile' ? 'profile' :
                    type === 'weight_entries' ? 'weightEntries' :
                        type === 'eating_plans' ? 'eatingPlans' :
                            type === 'breach_events' ? 'breachEvents' :
                                type === 'safety_interventions' ? 'safetyInterventions' :
                                    type === 'notification_settings' ? 'notificationSettings' :
                                        type === 'audit_logs' ? 'auditLogs' : type;

                if (!actualTypes.includes(dataKey)) {
                    return false;
                }
            }

            // Verify checksums
            const currentChecksums = this.generateChecksums(exportData.data);
            for (const [key, expectedChecksum] of Object.entries(exportData.metadata.checksums)) {
                if (currentChecksums[key] !== expectedChecksum) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate data deletion completeness
     */
    async validateDataDeletionCompleteness(userId: string, deletionType: 'soft' | 'hard'): Promise<boolean> {
        try {
            if (deletionType === 'soft') {
                // Check that user account is marked as deleted
                const user = await this.userAccountRepo.findById(userId);
                return user ? !user.isActive : true;
            } else {
                // Check that user data no longer exists
                const user = await this.userAccountRepo.findById(userId);
                const profile = await this.userProfileRepo.findByUserId(userId);
                const weightEntries = await this.weightEntryRepo.findByUserId(userId);

                return !user && !profile && weightEntries.length === 0;
            }
        } catch (error) {
            return false;
        }
    }
}