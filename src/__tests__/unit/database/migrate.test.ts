/**
 * Unit Tests for Migration Runner
 * Tests database migration and seeding scripts
 * Requirements: 1.4, 4.2, 15.1
 */

import { MigrationRunner } from '../../../database/migrate';
import DatabaseConnection from '../../../database/connection';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('path');

describe('MigrationRunner', () => {
    let migrationRunner: MigrationRunner;
    let mockDb: any;
    let mockFs: jest.Mocked<typeof fs>;
    let mockPath: jest.Mocked<typeof path>;

    beforeEach(() => {
        // Get the mocked instance from the global mock
        mockDb = (DatabaseConnection.getInstance as jest.Mock)();
        migrationRunner = new MigrationRunner();
        mockFs = fs as jest.Mocked<typeof fs>;
        mockPath = path as jest.Mocked<typeof path>;
        jest.clearAllMocks();
    });

    describe('runMigrations', () => {
        it('should create migrations table if it does not exist', async () => {
            mockPath.join.mockReturnValue('/mock/migrations');
            mockFs.readdirSync.mockReturnValue([]);
            mockDb.query.mockResolvedValue({ rows: [] });

            await migrationRunner.runMigrations();

            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE IF NOT EXISTS migrations')
            );
        });

        it('should run new migrations in order', async () => {
            const migrationFiles = ['001_initial_schema.sql', '002_add_indexes.sql'];

            mockPath.join.mockReturnValue('/mock/migrations');
            mockPath.basename
                .mockReturnValueOnce('001_initial_schema')
                .mockReturnValueOnce('002_add_indexes');
            mockFs.readdirSync.mockReturnValue(migrationFiles as any);
            mockFs.readFileSync.mockReturnValue('CREATE TABLE test;');

            // Mock that no migrations have been run
            mockDb.query
                .mockResolvedValueOnce({ rows: [] }) // Create migrations table
                .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Check 001 migration
                .mockResolvedValueOnce({ rows: [] }) // Run 001 migration
                .mockResolvedValueOnce({ rows: [] }) // Record 001 migration
                .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Check 002 migration
                .mockResolvedValueOnce({ rows: [] }) // Run 002 migration
                .mockResolvedValueOnce({ rows: [] }); // Record 002 migration

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await migrationRunner.runMigrations();

            expect(mockFs.readFileSync).toHaveBeenCalledTimes(2);
            expect(consoleSpy).toHaveBeenCalledWith('Running migration: 001_initial_schema');
            expect(consoleSpy).toHaveBeenCalledWith('Running migration: 002_add_indexes');
            expect(consoleSpy).toHaveBeenCalledWith('All migrations completed successfully');

            consoleSpy.mockRestore();
        });

        it('should skip already run migrations', async () => {
            const migrationFiles = ['001_initial_schema.sql'];

            mockPath.join.mockReturnValue('/mock/migrations');
            mockPath.basename.mockReturnValue('001_initial_schema');
            mockFs.readdirSync.mockReturnValue(migrationFiles as any);

            // Mock that migration has already been run
            mockDb.query
                .mockResolvedValueOnce({ rows: [] }) // Create migrations table
                .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Check migration (already run)

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await migrationRunner.runMigrations();

            expect(consoleSpy).toHaveBeenCalledWith('Migration 001_initial_schema already applied, skipping...');
            expect(mockFs.readFileSync).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should handle migration errors', async () => {
            const migrationFiles = ['001_initial_schema.sql'];

            mockPath.join.mockReturnValue('/mock/migrations');
            mockPath.basename.mockReturnValue('001_initial_schema');
            mockFs.readdirSync.mockReturnValue(migrationFiles as any);
            mockFs.readFileSync.mockReturnValue('INVALID SQL;');

            mockDb.query
                .mockResolvedValueOnce({ rows: [] }) // Create migrations table
                .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Check migration
                .mockRejectedValueOnce(new Error('SQL syntax error')); // Run migration fails

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await expect(migrationRunner.runMigrations()).rejects.toThrow('SQL syntax error');
            expect(consoleSpy).toHaveBeenCalledWith(
                'Migration 001_initial_schema failed:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });

        it('should filter and sort migration files correctly', async () => {
            const allFiles = [
                '002_add_indexes.sql',
                '001_initial_schema.sql',
                'README.md', // Should be filtered out
                '003_add_constraints.sql',
                'backup.txt' // Should be filtered out
            ];

            mockPath.join.mockReturnValue('/mock/migrations');
            mockPath.basename
                .mockReturnValueOnce('001_initial_schema')
                .mockReturnValueOnce('002_add_indexes')
                .mockReturnValueOnce('003_add_constraints');
            mockFs.readdirSync.mockReturnValue(allFiles as any);
            mockFs.readFileSync.mockReturnValue('CREATE TABLE test;');

            // Mock all migrations as not run
            mockDb.query.mockImplementation((query: string) => {
                if (query.includes('CREATE TABLE IF NOT EXISTS migrations')) {
                    return Promise.resolve({ rows: [] });
                }
                if (query.includes('SELECT COUNT(*) as count FROM migrations')) {
                    return Promise.resolve({ rows: [{ count: '0' }] });
                }
                return Promise.resolve({ rows: [] });
            });

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await migrationRunner.runMigrations();

            // Should run in order: 001, 002, 003
            expect(consoleSpy).toHaveBeenCalledWith('Running migration: 001_initial_schema');
            expect(consoleSpy).toHaveBeenCalledWith('Running migration: 002_add_indexes');
            expect(consoleSpy).toHaveBeenCalledWith('Running migration: 003_add_constraints');

            // Should not process non-SQL files
            expect(mockFs.readFileSync).toHaveBeenCalledTimes(3);

            consoleSpy.mockRestore();
        });
    });

    describe('seedDatabase', () => {
        it('should run seed files in order', async () => {
            const seedFiles = ['test_data.sql', 'sample_users.sql'];

            mockPath.join.mockReturnValue('/mock/seeds');
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue(seedFiles as any);
            mockFs.readFileSync.mockReturnValue('INSERT INTO test VALUES (1);');
            mockDb.query.mockResolvedValue({ rows: [] });

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await migrationRunner.seedDatabase();

            expect(mockFs.readFileSync).toHaveBeenCalledTimes(2);
            expect(consoleSpy).toHaveBeenCalledWith('Running seed: test_data.sql');
            expect(consoleSpy).toHaveBeenCalledWith('Running seed: sample_users.sql');
            expect(consoleSpy).toHaveBeenCalledWith('Database seeding completed successfully');

            consoleSpy.mockRestore();
        });

        it('should skip seeding when seeds directory does not exist', async () => {
            mockPath.join.mockReturnValue('/mock/seeds');
            mockFs.existsSync.mockReturnValue(false);

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await migrationRunner.seedDatabase();

            expect(consoleSpy).toHaveBeenCalledWith('No seeds directory found, skipping seeding');
            expect(mockFs.readdirSync).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should handle seed errors', async () => {
            const seedFiles = ['bad_seed.sql'];

            mockPath.join.mockReturnValue('/mock/seeds');
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue(seedFiles as any);
            mockFs.readFileSync.mockReturnValue('INVALID SQL;');
            mockDb.query.mockRejectedValue(new Error('Seed failed'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await expect(migrationRunner.seedDatabase()).rejects.toThrow('Seed failed');
            expect(consoleSpy).toHaveBeenCalledWith(
                'Seed bad_seed.sql failed:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });

        it('should filter seed files to only include SQL files', async () => {
            const allFiles = [
                'test_data.sql',
                'README.md', // Should be filtered out
                'users.sql',
                'backup.txt' // Should be filtered out
            ];

            mockPath.join.mockReturnValue('/mock/seeds');
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue(allFiles as any);
            mockFs.readFileSync.mockReturnValue('INSERT INTO test VALUES (1);');
            mockDb.query.mockResolvedValue({ rows: [] });

            await migrationRunner.seedDatabase();

            // Should only process SQL files
            expect(mockFs.readFileSync).toHaveBeenCalledTimes(2);
        });
    });

    describe('private methods', () => {
        it('should check if migration has been run', async () => {
            mockDb.query.mockResolvedValue({ rows: [{ count: '1' }] });

            // Access private method through any cast for testing
            const hasRun = await (migrationRunner as any).hasMigrationRun('test_migration');

            expect(hasRun).toBe(true);
            expect(mockDb.query).toHaveBeenCalledWith(
                'SELECT COUNT(*) as count FROM migrations WHERE name = $1',
                ['test_migration']
            );
        });

        it('should record migration execution', async () => {
            mockDb.query.mockResolvedValue({ rows: [] });

            // Access private method through any cast for testing
            await (migrationRunner as any).recordMigration('test_migration');

            expect(mockDb.query).toHaveBeenCalledWith(
                'INSERT INTO migrations (name) VALUES ($1)',
                ['test_migration']
            );
        });
    });
});