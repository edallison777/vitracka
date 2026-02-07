/**
 * Audit Logging Routes
 * Admin-facing routes for audit log management and review
 */

import { Router } from 'express';
import { AuditController } from '../controllers/AuditController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

const router = Router();
const auditController = new AuditController();

// All audit routes require admin authentication
router.use(AuthMiddleware.requireAdmin);

// Get audit entries with filtering
router.get('/entries', auditController.getAuditEntries.bind(auditController));

// Get audit summary statistics
router.get('/summary', auditController.getAuditSummary.bind(auditController));

// Get safety entries requiring admin review
router.get('/safety/review', auditController.getSafetyEntriesForReview.bind(auditController));

// Mark entries as reviewed
router.post('/review', auditController.markAsReviewed.bind(auditController));

// Get audit configuration
router.get('/config', auditController.getConfiguration.bind(auditController));

// Update audit configuration
router.put('/config', auditController.updateConfiguration.bind(auditController));

// Trigger manual cleanup of expired entries
router.post('/cleanup', auditController.cleanupExpiredEntries.bind(auditController));

// Export audit data (for compliance)
router.get('/export', auditController.exportAuditData.bind(auditController));

export { router as auditRoutes };