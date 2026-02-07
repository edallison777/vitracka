/**
 * Test Setup Configuration
 * Mock database setup for testing without real PostgreSQL connection
 */

import DatabaseConnection from '../../database/connection';

// Mock the database connection for testing
jest.mock('../../database/connection', () => {
    const mockInstance = {
        testConnection: jest.fn().mockResolvedValue(true),
        query: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
        getClient: jest.fn(),
        getPool: jest.fn(),
    };

    return {
        __esModule: true,
        default: {
            getInstance: jest.fn(() => mockInstance),
        },
    };
});

// Mock the repositories to avoid database dependencies
jest.mock('../../database/repositories/UserSupportProfileRepository', () => {
    return {
        UserSupportProfileRepository: jest.fn().mockImplementation(() => ({
            create: jest.fn(),
            findByUserId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        })),
    };
});

export { };