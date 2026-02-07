/**
 * Authentication Routes
 * Express routes for authentication endpoints
 * Implements Requirements 19.1, 19.2, 19.3
 */

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/AuthMiddleware';

const router = Router();
const authController = new AuthController();

// Rate limiting for authentication routes
const authRateLimit = authMiddleware.rateLimitAuth(5, 15); // 5 attempts per 15 minutes

// Public routes (no authentication required)
router.post('/login', authRateLimit, authController.login.bind(authController));
router.post('/register', authRateLimit, authController.register.bind(authController));
router.post('/google', authRateLimit, authController.googleAuth.bind(authController));
router.post('/facebook', authRateLimit, authController.facebookAuth.bind(authController));
router.post('/biometric', authRateLimit, authController.biometricAuth.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));
router.post('/verify', authController.verifyToken.bind(authController));

// Protected routes (authentication required)
router.get('/me', authMiddleware.verifyToken.bind(authMiddleware), authController.getCurrentUser.bind(authController));
router.post('/logout', authMiddleware.verifyToken.bind(authMiddleware), authController.logout.bind(authController));

export default router;