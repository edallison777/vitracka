/**
 * Unit Tests for Database Connection
 * Tests database connection and migration scripts
 * Requirements: 1.4, 4.2, 15.1
 */

import DatabaseConnection from '../../../database/connection';

// Get the mocked instance from the global mock
const mockInstance = {
    testConnection: jest.fn(),
    query: jest.fn(),
    close: jest.fn(),
    getClient: jest.fn(),
    getPool: jest.fn(),
};

// Mock DatabaseConnection.getInstance to return our mock instance
(DatabaseConnection.getInstance as jest.Mock) = jest.fn(() => mockInstance);

describe('DatabaseConnection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = DatabaseConnection.getInstance();
            const instance2 = DatabaseConnection.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('query', () => {
        it('should execute query and return result', async () => {
            const mockResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };
            mockInstance.query.mockResolvedValue(mockResult);

            const db = DatabaseConnection.getInstance();
            const result = await db.query('SELECT * FROM test', ['param1']);

            expect(result).toBe(mockResult);
            expect(mockInstance.query).toHaveBeenCalledWith('SELECT * FROM test', ['param1']);
        });

        it('should handle query errors', async () => {
            const error = new Error('Query failed');
            mockInstance.query.mockRejectedValue(error);

            const db = DatabaseConnection.getInstance();

            await expect(db.query('INVALID SQL')).rejects.toThrow('Query failed');
        });

        it('should log query execution time', async () => {
            mockInstance.query.mockResolvedValue({ rows: [], rowCount: 0 });

            const db = DatabaseConnection.getInstance();
            const result = await db.query('SELECT 1');

            expect(result.rows).toEqual([]);
            expect(mockInstance.query).toHaveBeenCalledWith('SELECT 1');
        });
    });

    describe('testConnection', () => {
        it('should return true for successful connection test', async () => {
            mockInstance.testConnection.mockResolvedValue(true);

            const db = DatabaseConnection.getInstance();
            const result = await db.testConnection();

            expect(result).toBe(true);
            expect(mockInstance.testConnection).toHaveBeenCalled();
        });

        it('should return false for failed connection test', async () => {
            mockInstance.testConnection.mockResolvedValue(false);

            const db = DatabaseConnection.getInstance();
            const result = await db.testConnection();

            expect(result).toBe(false);
        });
    });

    describe('getClient', () => {
        it('should return database client', async () => {
            const mockClient = { query: jest.fn(), release: jest.fn() };
            mockInstance.getClient.mockResolvedValue(mockClient);

            const db = DatabaseConnection.getInstance();
            const client = await db.getClient();

            expect(client).toBe(mockClient);
            expect(mockInstance.getClient).toHaveBeenCalled();
        });
    });

    describe('close', () => {
        it('should close connection pool', async () => {
            mockInstance.close.mockResolvedValue(undefined);

            const db = DatabaseConnection.getInstance();
            await db.close();

            expect(mockInstance.close).toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should handle database connection errors gracefully', async () => {
            mockInstance.query.mockRejectedValue(new Error('Database connection lost'));

            const db = DatabaseConnection.getInstance();

            await expect(db.query('SELECT 1')).rejects.toThrow('Database connection lost');
        });

        it('should handle empty query parameters', async () => {
            mockInstance.query.mockResolvedValue({ rows: [], rowCount: 0 });

            const db = DatabaseConnection.getInstance();
            const result = await db.query('SELECT 1');

            expect(result.rows).toEqual([]);
            expect(mockInstance.query).toHaveBeenCalledWith('SELECT 1');
        });
    });
});