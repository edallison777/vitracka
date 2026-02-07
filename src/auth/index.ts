/**
 * Authentication Module Index
 * Exports all authentication-related components
 * Implements Requirements 19.1, 19.2, 19.3
 */

export { AuthenticationService } from '../services/AuthenticationService';
export { AuthController } from '../controllers/AuthController';
export { AuthMiddleware, authMiddleware } from '../middleware/AuthMiddleware';
export { SessionManager, sessionManager } from '../services/SessionManager';
export { default as authRoutes } from '../routes/authRoutes';

export type {
    AuthenticationResult,
    TokenPayload,
    BiometricAuthRequest
} from '../services/AuthenticationService';

export type {
    UserSession,
    SessionOptions
} from '../services/SessionManager';