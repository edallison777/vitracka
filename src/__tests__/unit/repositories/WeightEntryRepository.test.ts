/**
 * Unit Tests for WeightEntryRepository
 * Tests data validation, constraints, and edge cases
 * Requirements: 4.2, 15.1
 */

import { WeightEntryRepository } from '../../../database/repositories';
import { WeightEntry, WeightUnit, MoodLevel } from '../../../types';
import DatabaseConnection from '../../../database/connection';

describe('WeightEntryRepository', () => {
    let repository: WeightEntryRepository;
    let mockDb: any;

    beforeEach(() => {
        // Get the mocked instance from the global mock
        mockDb = (DatabaseConnection.getInstance as jest.Mock)();
        repository = new WeightEntryRepository();
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a weight entry with all fields', async () => {
            const entryData = {
                userId: 'user-123',
                weight: 75.5,
                unit: 'kg' as WeightUnit,
                notes: 'Morning weight after workout',
                mood: 'good' as MoodLevel,
                confidence: 4
            };

            const mockResult = {
                rows: [{
                    id: 'entry-123',
                    user_id: 'user-123',
                    weight: 75.5,
                    unit: 'kg',
                    timestamp: new Date(),
                    notes: 'Morning weight after workout',
                    mood: 'good',
                    confidence: 4
                }]
            };

            mockDb.query.mockResolvedValue(mockResult);

            const result = await repository.create(entryData);

            expect(result.userId).toBe('user-123');
            expect(result.weight).toBe(75.5);
            expect(result.unit).toBe('kg');
            expect(result.notes).toBe('Morning weight after workout');
            expect(result.mood).toBe('good');
            expect(result.confidence).toBe(4);
            expect(result.timestamp).toBeInstanceOf(Date);
        });

        it('should create a weight entry with minimal required fields', async () => {
            const entryData = {
                userId: 'user-123',
                weight: 150.0,
                unit: 'lbs' as WeightUnit,
                confidence: 3
            };

            const mockResult = {
                rows: [{
                    id: 'entry-123',
                    user_id: 'user-123',
                    weight: 150.0,
                    unit: 'lbs',
                    timestamp: new Date(),
                    notes: null,
                    mood: null,
                    confidence: 3
                }]
            };

            mockDb.query.mockResolvedValue(mockResult);

            const result = await repository.create(entryData);

            expect(result.userId).toBe('user-123');
            expect(result.weight).toBe(150.0);
            expect(result.unit).toBe('lbs');
            expect(result.notes).toBeNull();
            expect(result.mood).toBeNull();
            expect(result.confidence).toBe(3);
        });
    });

    describe('findByUserId', () => {
        it('should find weight entries for a user ordered by timestamp desc', async () => {
            const mockResults = {
                rows: [
                    {
                        id: 'entry-2',
                        user_id: 'user-123',
                        weight: 74.8,
                        unit: 'kg',
                        timestamp: new Date('2023-12-02'),
                        notes: 'Recent entry',
                        mood: 'great',
                        confidence: 5
                    },
                    {
                        id: 'entry-1',
                        user_id: 'user-123',
                        weight: 75.5,
                        unit: 'kg',
                        timestamp: new Date('2023-12-01'),
                        notes: 'Older entry',
                        mood: 'good',
                        confidence: 4
                    }
                ]
            };

            mockDb.query.mockResolvedValue(mockResults);

            const results = await repository.findByUserId('user-123');

            expect(results).toHaveLength(2);
            expect(results[0].weight).toBe(74.8); // Most recent first
            expect(results[1].weight).toBe(75.5);
            expect(mockDb.query).toHaveBeenCalledWith(
                'SELECT * FROM weight_entries WHERE user_id = $1 ORDER BY timestamp DESC',
                ['user-123']
            );
        });

        it('should apply limit and offset when provided', async () => {
            mockDb.query.mockResolvedValue({ rows: [] });

            await repository.findByUserId('user-123', 10, 5);

            expect(mockDb.query).toHaveBeenCalledWith(
                'SELECT * FROM weight_entries WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
                ['user-123', 10, 5]
            );
        });
    });

    describe('getLatestEntry', () => {
        it('should return the most recent weight entry', async () => {
            const mockResult = {
                rows: [{
                    id: 'entry-latest',
                    user_id: 'user-123',
                    weight: 74.2,
                    unit: 'kg',
                    timestamp: new Date(),
                    notes: 'Latest weight',
                    mood: 'okay',
                    confidence: 3
                }]
            };

            mockDb.query.mockResolvedValue(mockResult);

            const result = await repository.getLatestEntry('user-123');

            expect(result).not.toBeNull();
            expect(result!.weight).toBe(74.2);
            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringMatching(/ORDER BY timestamp DESC\s+LIMIT 1/),
                ['user-123']
            );
        });

        it('should return null when no entries exist', async () => {
            mockDb.query.mockResolvedValue({ rows: [] });

            const result = await repository.getLatestEntry('user-123');

            expect(result).toBeNull();
        });
    });

    describe('findByUserIdInDateRange', () => {
        it('should find entries within date range ordered by timestamp asc', async () => {
            const startDate = new Date('2023-12-01');
            const endDate = new Date('2023-12-31');

            mockDb.query.mockResolvedValue({ rows: [] });

            await repository.findByUserIdInDateRange('user-123', startDate, endDate);

            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('timestamp >= $2 AND timestamp <= $3'),
                ['user-123', startDate, endDate]
            );
        });
    });

    describe('update', () => {
        it('should update weight entry fields', async () => {
            const updates = {
                weight: 76.0,
                notes: 'Updated notes',
                mood: 'great' as MoodLevel,
                confidence: 5
            };

            const mockResult = {
                rows: [{
                    id: 'entry-123',
                    user_id: 'user-123',
                    weight: 76.0,
                    unit: 'kg',
                    timestamp: new Date(),
                    notes: 'Updated notes',
                    mood: 'great',
                    confidence: 5
                }]
            };

            mockDb.query.mockResolvedValue(mockResult);

            const result = await repository.update('entry-123', updates);

            expect(result).not.toBeNull();
            expect(result!.weight).toBe(76.0);
            expect(result!.notes).toBe('Updated notes');
            expect(result!.mood).toBe('great');
            expect(result!.confidence).toBe(5);
        });

        it('should return null when entry not found', async () => {
            mockDb.query.mockResolvedValue({ rows: [] });

            const result = await repository.update('nonexistent-id', { weight: 75.0 });

            expect(result).toBeNull();
        });
    });

    describe('validation and edge cases', () => {
        it('should handle weight validation constraints', async () => {
            // Test would normally be handled by database constraints
            const entryData = {
                userId: 'user-123',
                weight: -5.0, // Invalid negative weight
                unit: 'kg' as WeightUnit,
                confidence: 3
            };

            mockDb.query.mockRejectedValue(new Error('CHECK constraint failed: weight > 0'));

            await expect(repository.create(entryData)).rejects.toThrow('CHECK constraint failed');
        });

        it('should handle confidence validation constraints', async () => {
            const entryData = {
                userId: 'user-123',
                weight: 75.0,
                unit: 'kg' as WeightUnit,
                confidence: 10 // Invalid confidence > 5
            };

            mockDb.query.mockRejectedValue(new Error('CHECK constraint failed: confidence >= 1 AND confidence <= 5'));

            await expect(repository.create(entryData)).rejects.toThrow('CHECK constraint failed');
        });

        it('should handle invalid unit values', async () => {
            const entryData = {
                userId: 'user-123',
                weight: 75.0,
                unit: 'invalid' as WeightUnit,
                confidence: 3
            };

            mockDb.query.mockRejectedValue(new Error('CHECK constraint failed: unit IN (kg, lbs)'));

            await expect(repository.create(entryData)).rejects.toThrow('CHECK constraint failed');
        });

        it('should handle invalid mood values', async () => {
            const entryData = {
                userId: 'user-123',
                weight: 75.0,
                unit: 'kg' as WeightUnit,
                mood: 'invalid' as MoodLevel,
                confidence: 3
            };

            mockDb.query.mockRejectedValue(new Error('CHECK constraint failed: mood IN (great, good, okay, struggling)'));

            await expect(repository.create(entryData)).rejects.toThrow('CHECK constraint failed');
        });

        it('should handle database connection errors gracefully', async () => {
            mockDb.query.mockRejectedValue(new Error('Database connection lost'));

            await expect(repository.findByUserId('user-123')).rejects.toThrow('Database connection lost');
        });

        it('should handle empty results gracefully', async () => {
            mockDb.query.mockResolvedValue({ rows: [] });

            const results = await repository.findByUserId('nonexistent-user');

            expect(results).toEqual([]);
        });
    });

    describe('getWeightTrend', () => {
        it('should get weight trend for specified number of days', async () => {
            mockDb.query.mockResolvedValue({ rows: [] });

            await repository.getWeightTrend('user-123', 30);

            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining("INTERVAL '30 days'"),
                ['user-123']
            );
        });

        it('should default to 30 days when no days specified', async () => {
            mockDb.query.mockResolvedValue({ rows: [] });

            await repository.getWeightTrend('user-123');

            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining("INTERVAL '30 days'"),
                ['user-123']
            );
        });
    });
});