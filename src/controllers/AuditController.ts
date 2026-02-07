/**
 * Audit Controller
 * Handles admin-facing audit log management and review operations
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { AuditLoggingService } from '../services/AuditLoggingService';
import { AuditLogFilter, AuditEventType, AuditSeverity } from '../types/audit';

export class AuditController {
    private auditService: AuditLoggingService;

    constructor() {
        // In a real implementation, this would be injected
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL
        });
        this.auditService = new AuditLoggingService(pool);
    }

    /**
     * Get audit entries with filtering and pagination
     */
    async getAuditEntries(req: Request, res: Response): Promise<void> {
        try {
            const {
                eventTypes,
                severity,
                userId,
                agentId,
                startDate,
                endDate,
                isSafetyRelated,
                requiresAdminReview,
                adminReviewed,
                limit = 100,
                offset = 0
            } = req.query;

            const filter: AuditLogFilter = {};

            if (eventTypes) {
                filter.eventTypes = Array.isArray(eventTypes)
                    ? eventTypes as AuditEventType[]
                    : [eventTypes as AuditEventType];
            }

            if (severity) {
                filter.severity = Array.isArray(severity)
                    ? severity as AuditSeverity[]
                    : [severity as AuditSeverity];
            }

            if (userId) filter.userId = userId as string;
            if (agentId) filter.agentId = agentId as string;
            if (startDate) filter.startDate = new Date(startDate as string);
            if (endDate) filter.endDate = new Date(endDate as string);
            if (isSafetyRelated !== undefined) filter.isSafetyRelated = isSafetyRelated === 'true';
            if (requiresAdminReview !== undefined) filter.requiresAdminReview = requiresAdminReview === 'true';
            if (adminReviewed !== undefined) filter.adminReviewed = adminReviewed === 'true';

            const entries = await this.auditService.getAuditEntries(
                filter,
                parseInt(limit as string),
                parseInt(offset as string)
            );

            // Log the admin access
            await this.auditService.logEvent({
                eventType: 'admin_action',
                severity: 'info',
                action: 'audit_entries_accessed',
                description: `Admin accessed audit entries with filter`,
                userId: req.user?.id,
                metadata: {
                    filter,
                    resultCount: entries.length,
                    accessedBy: req.user?.email
                },
                requestId: req.headers['x-request-id'] as string,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                data: entries,
                pagination: {
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                    hasMore: entries.length === parseInt(limit as string)
                }
            });
        } catch (error) {
            await this.auditService.logError({
                error: error as Error,
                context: 'AuditController.getAuditEntries',
                userId: req.user?.id,
                requestId: req.headers['x-request-id'] as string,
                severity: 'error'
            });

            res.status(500).json({
                success: false,
                error: 'Failed to retrieve audit entries'
            });
        }
    }

    /**
     * Get audit summary statistics
     */
    async getAuditSummary(req: Request, res: Response): Promise<void> {
        try {
            const {
                startDate,
                endDate,
                userId
            } = req.query;

            const filter: AuditLogFilter = {};
            if (startDate) filter.startDate = new Date(startDate as string);
            if (endDate) filter.endDate = new Date(endDate as string);
            if (userId) filter.userId = userId as string;

            const summary = await this.auditService.getAuditSummary(filter);

            // Log the admin access
            await this.auditService.logEvent({
                eventType: 'admin_action',
                severity: 'info',
                action: 'audit_summary_accessed',
                description: `Admin accessed audit summary`,
                userId: req.user?.id,
                metadata: {
                    filter,
                    accessedBy: req.user?.email
                },
                requestId: req.headers['x-request-id'] as string,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            await this.auditService.logError({
                error: error as Error,
                context: 'AuditController.getAuditSummary',
                userId: req.user?.id,
                requestId: req.headers['x-request-id'] as string,
                severity: 'error'
            });

            res.status(500).json({
                success: false,
                error: 'Failed to retrieve audit summary'
            });
        }
    }

    /**
     * Get safety entries requiring admin review
     */
    async getSafetyEntriesForReview(req: Request, res: Response): Promise<void> {
        try {
            const { limit = 50 } = req.query;

            const entries = await this.auditService.getSafetyEntriesForReview(
                parseInt(limit as string)
            );

            // Log the admin access to safety entries
            await this.auditService.logEvent({
                eventType: 'admin_action',
                severity: 'info',
                action: 'safety_entries_accessed',
                description: `Admin accessed safety entries for review`,
                userId: req.user?.id,
                metadata: {
                    entryCount: entries.length,
                    accessedBy: req.user?.email
                },
                requestId: req.headers['x-request-id'] as string,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                data: entries
            });
        } catch (error) {
            await this.auditService.logError({
                error: error as Error,
                context: 'AuditController.getSafetyEntriesForReview',
                userId: req.user?.id,
                requestId: req.headers['x-request-id'] as string,
                severity: 'error'
            });

            res.status(500).json({
                success: false,
                error: 'Failed to retrieve safety entries'
            });
        }
    }

    /**
     * Mark audit entries as reviewed
     */
    async markAsReviewed(req: Request, res: Response): Promise<void> {
        try {
            const { entryIds } = req.body;

            if (!Array.isArray(entryIds) || entryIds.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'Entry IDs array is required'
                });
                return;
            }

            const reviewedBy = req.user?.email || req.user?.id || 'unknown';
            await this.auditService.markAsReviewed(entryIds, reviewedBy);

            res.json({
                success: true,
                message: `Marked ${entryIds.length} entries as reviewed`
            });
        } catch (error) {
            await this.auditService.logError({
                error: error as Error,
                context: 'AuditController.markAsReviewed',
                userId: req.user?.id,
                requestId: req.headers['x-request-id'] as string,
                severity: 'error'
            });

            res.status(500).json({
                success: false,
                error: 'Failed to mark entries as reviewed'
            });
        }
    }

    /**
     * Get current audit configuration
     */
    async getConfiguration(req: Request, res: Response): Promise<void> {
        try {
            // This would typically call a method on the audit service
            // For now, return a placeholder response
            const config = {
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

            // Log the config access
            await this.auditService.logEvent({
                eventType: 'admin_action',
                severity: 'info',
                action: 'audit_config_accessed',
                description: `Admin accessed audit configuration`,
                userId: req.user?.id,
                metadata: {
                    accessedBy: req.user?.email
                },
                requestId: req.headers['x-request-id'] as string,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                data: config
            });
        } catch (error) {
            await this.auditService.logError({
                error: error as Error,
                context: 'AuditController.getConfiguration',
                userId: req.user?.id,
                requestId: req.headers['x-request-id'] as string,
                severity: 'error'
            });

            res.status(500).json({
                success: false,
                error: 'Failed to retrieve audit configuration'
            });
        }
    }

    /**
     * Update audit configuration
     */
    async updateConfiguration(req: Request, res: Response): Promise<void> {
        try {
            const updates = req.body;

            // Log the configuration change
            await this.auditService.logEvent({
                eventType: 'admin_action',
                severity: 'warning',
                action: 'audit_config_updated',
                description: `Admin updated audit configuration`,
                userId: req.user?.id,
                metadata: {
                    updates,
                    updatedBy: req.user?.email
                },
                requestId: req.headers['x-request-id'] as string,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                message: 'Audit configuration updated successfully'
            });
        } catch (error) {
            await this.auditService.logError({
                error: error as Error,
                context: 'AuditController.updateConfiguration',
                userId: req.user?.id,
                requestId: req.headers['x-request-id'] as string,
                severity: 'error'
            });

            res.status(500).json({
                success: false,
                error: 'Failed to update audit configuration'
            });
        }
    }

    /**
     * Trigger manual cleanup of expired entries
     */
    async cleanupExpiredEntries(req: Request, res: Response): Promise<void> {
        try {
            const deletedCount = await this.auditService.cleanupExpiredEntries();

            res.json({
                success: true,
                message: `Cleaned up ${deletedCount} expired audit entries`
            });
        } catch (error) {
            await this.auditService.logError({
                error: error as Error,
                context: 'AuditController.cleanupExpiredEntries',
                userId: req.user?.id,
                requestId: req.headers['x-request-id'] as string,
                severity: 'error'
            });

            res.status(500).json({
                success: false,
                error: 'Failed to cleanup expired entries'
            });
        }
    }

    /**
     * Export audit data for compliance
     */
    async exportAuditData(req: Request, res: Response): Promise<void> {
        try {
            const {
                startDate,
                endDate,
                format = 'json'
            } = req.query;

            const filter: AuditLogFilter = {};
            if (startDate) filter.startDate = new Date(startDate as string);
            if (endDate) filter.endDate = new Date(endDate as string);

            // Get all entries for export (no limit)
            const entries = await this.auditService.getAuditEntries(filter, 10000, 0);

            // Log the export action
            await this.auditService.logEvent({
                eventType: 'data_export',
                severity: 'warning',
                action: 'audit_data_exported',
                description: `Admin exported audit data`,
                userId: req.user?.id,
                metadata: {
                    filter,
                    entryCount: entries.length,
                    format,
                    exportedBy: req.user?.email
                },
                requestId: req.headers['x-request-id'] as string,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            if (format === 'csv') {
                // Convert to CSV format
                const csvHeader = 'ID,Timestamp,Event Type,Severity,User ID,Agent ID,Action,Description\n';
                const csvData = entries.map(entry =>
                    `${entry.id},${entry.timestamp.toISOString()},${entry.eventType},${entry.severity},${entry.userId || ''},${entry.agentId || ''},${entry.action},"${entry.description.replace(/"/g, '""')}"`
                ).join('\n');

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=audit_export.csv');
                res.send(csvHeader + csvData);
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename=audit_export.json');
                res.json({
                    exportedAt: new Date(),
                    filter,
                    entryCount: entries.length,
                    entries
                });
            }
        } catch (error) {
            await this.auditService.logError({
                error: error as Error,
                context: 'AuditController.exportAuditData',
                userId: req.user?.id,
                requestId: req.headers['x-request-id'] as string,
                severity: 'error'
            });

            res.status(500).json({
                success: false,
                error: 'Failed to export audit data'
            });
        }
    }
}