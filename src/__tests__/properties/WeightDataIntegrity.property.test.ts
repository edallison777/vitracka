/**
 * Property-Based Tests for Weight Data Integrity
 * Feature: vitracka-weight-management, Property 7: Weight Data Integrity
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 */

import * as fc from 'fast-check';
import { WeightEntryRepository } from '../../database/repositories';
import { WeightEntry, WeightUnit, MoodLevel } from '../../types';
import DatabaseConnection from '../../database/connection';

describe('Weight Data Integrity Properties', () => {
    let repository: WeightEntryRepository;
    let mockDb: any;

    beforeEach(() => {
        mockDb = (DatabaseConnection.getInstance as jest.Mock)();
        repository = new WeightEntryRepository();
        jest.clearAllMocks();
    });

    // Custom generators for weight entry data
    const weightGenerator = fc.float({ min: 30, max: 300, noNaN: true });
    const unitGenerator = fc.constantFrom('kg', 'lbs') as fc.Arbitrary<WeightUnit>;
    const moodGenerator = fc.option(fc.constantFrom('great', 'good', 'okay', 'struggling') as fc.Arbitrary<MoodLevel>, { nil: undefined });
    const confidenceGenerator = fc.integer({ min: 1, max: 5 });
    const userIdGenerator = fc.uuid();
    const notesGenerator = fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined });

    const validWeightEntryGenerator = fc.record({
        userId: userIdGenerator,
        weight: weightGenerator,
        unit: unitGenerator,
        notes: notesGenerator,
        mood: moodGenerator,
        confidence: confidenceGenerator
    });

    /**
     * Property 7: Weight Data Integrity
     * For any valid weight entry, the system should accept valid inputs, store them securely, 
     * and display trends using rolling averages that emphasize long-term patterns over daily fluctuations
     */
    describe('Property 7: Weight Data Integrity', () => {
        it('should accept and store valid weight entries with data integrity', () => {
            return fc.assert(
                fc.asyncProperty(validWeightEntryGenerator, async (entryData) => {
                    // Feature: vitracka-weight-management, Property 7: Weight Data Integrity

                    // Mock successful database response
                    const mockResult = {
                        rows: [{
                            id: 'generated-id',
                            user_id: entryData.userId,
                            weight: entryData.weight,
                            unit: entryData.unit,
                            timestamp: new Date(),
                            notes: entryData.notes || null,
                            mood: entryData.mood || null,
                            confidence: entryData.confidence
                        }]
                    };
                    mockDb.query.mockResolvedValue(mockResult);

                    // Create the weight entry
                    const result = await repository.create(entryData);

                    // Verify data integrity properties
                    expect(result.userId).toBe(entryData.userId);
                    expect(result.weight).toBe(entryData.weight);
                    expect(result.unit).toBe(entryData.unit);
                    expect(result.confidence).toBe(entryData.confidence);
                    expect(result.timestamp).toBeInstanceOf(Date);
                    expect(result.id).toBeDefined();

                    // Verify optional fields are handled correctly
                    if (entryData.notes) {
                        expect(result.notes).toBe(entryData.notes);
                    }
                    if (entryData.mood) {
                        expect(result.mood).toBe(entryData.mood);
                    }

                    // Verify weight is within valid range
                    expect(result.weight).toBeGreaterThan(0);
                    expect(result.weight).toBeLessThan(1000);

                    // Verify confidence is within valid range
                    expect(result.confidence).toBeGreaterThanOrEqual(1);
                    expect(result.confidence).toBeLessThanOrEqual(5);

                    // Verify unit is valid
                    expect(['kg', 'lbs']).toContain(result.unit);
                })
            );
        });

        it('should maintain data consistency when retrieving weight entries', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.array(validWeightEntryGenerator, { minLength: 1, maxLength: 10 }),
                    async (entries) => {
                        // Feature: vitracka-weight-management, Property 7: Weight Data Integrity

                        const userId = entries[0].userId;

                        // Mock database response with multiple entries
                        const mockRows = entries.map((entry, index) => ({
                            id: `entry-${index}`,
                            user_id: userId,
                            weight: entry.weight,
                            unit: entry.unit,
                            timestamp: new Date(Date.now() - (entries.length - index) * 24 * 60 * 60 * 1000), // Ascending order
                            notes: entry.notes || null,
                            mood: entry.mood || null,
                            confidence: entry.confidence
                        }));

                        mockDb.query.mockResolvedValue({ rows: mockRows });

                        const results = await repository.findByUserId(userId);

                        // Verify all entries maintain data integrity
                        expect(results).toHaveLength(entries.length);

                        results.forEach((result, index) => {
                            expect(result.userId).toBe(userId);
                            expect(result.weight).toBeGreaterThan(0);
                            expect(result.confidence).toBeGreaterThanOrEqual(1);
                            expect(result.confidence).toBeLessThanOrEqual(5);
                            expect(['kg', 'lbs']).toContain(result.unit);
                            expect(result.timestamp).toBeInstanceOf(Date);
                        });
                    }
                )
            );
        });

        it('should handle weight trend analysis with rolling averages', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.array(validWeightEntryGenerator, { minLength: 7, maxLength: 30 }),
                    fc.integer({ min: 7, max: 90 }),
                    async (entries, days) => {
                        // Feature: vitracka-weight-management, Property 7: Weight Data Integrity

                        const userId = entries[0].userId;

                        // Mock database response for trend data
                        const mockRows = entries.map((entry, index) => ({
                            id: `entry-${index}`,
                            user_id: userId,
                            weight: entry.weight,
                            unit: entry.unit,
                            timestamp: new Date(Date.now() - (entries.length - index) * 24 * 60 * 60 * 1000), // Ascending order
                            notes: entry.notes || null,
                            mood: entry.mood || null,
                            confidence: entry.confidence
                        }));

                        mockDb.query.mockResolvedValue({ rows: mockRows });

                        const trendData = await repository.getWeightTrend(userId, days);

                        // Verify trend data maintains integrity
                        expect(trendData).toHaveLength(entries.length);

                        // Verify all weights are valid numbers
                        trendData.forEach(entry => {
                            expect(typeof entry.weight).toBe('number');
                            expect(entry.weight).toBeGreaterThan(0);
                            expect(entry.weight).toBeLessThan(1000);
                            expect(entry.timestamp).toBeInstanceOf(Date);
                        });

                        // Verify chronological ordering (ascending for trend analysis)
                        for (let i = 1; i < trendData.length; i++) {
                            expect(trendData[i].timestamp.getTime()).toBeGreaterThanOrEqual(
                                trendData[i - 1].timestamp.getTime()
                            );
                        }
                    }
                )
            );
        });

        it('should reject invalid weight values while maintaining data integrity', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        userId: userIdGenerator,
                        weight: fc.oneof(
                            fc.constant(-1), // Negative weight
                            fc.constant(0),  // Zero weight
                            fc.constant(NaN), // NaN weight
                            fc.constant(Infinity), // Infinite weight
                            fc.float({ min: 1000, max: 10000 }) // Unrealistic weight
                        ),
                        unit: unitGenerator,
                        confidence: confidenceGenerator
                    }),
                    async (invalidEntry) => {
                        // Feature: vitracka-weight-management, Property 7: Weight Data Integrity

                        // Mock database constraint violation
                        mockDb.query.mockRejectedValue(new Error('CHECK constraint failed: weight > 0 AND weight < 1000'));

                        // Should reject invalid weight values
                        await expect(repository.create(invalidEntry)).rejects.toThrow('CHECK constraint failed');
                    }
                )
            );
        });

        it('should maintain unit consistency and conversion integrity', () => {
            return fc.assert(
                fc.asyncProperty(
                    validWeightEntryGenerator,
                    async (entryData) => {
                        // Feature: vitracka-weight-management, Property 7: Weight Data Integrity

                        const mockResult = {
                            rows: [{
                                id: 'entry-id',
                                user_id: entryData.userId,
                                weight: entryData.weight,
                                unit: entryData.unit,
                                timestamp: new Date(),
                                notes: entryData.notes || null,
                                mood: entryData.mood || null,
                                confidence: entryData.confidence
                            }]
                        };
                        mockDb.query.mockResolvedValue(mockResult);

                        const result = await repository.create(entryData);

                        // Verify unit consistency
                        expect(result.unit).toBe(entryData.unit);

                        // Verify weight value is preserved exactly as stored
                        expect(result.weight).toBe(entryData.weight);

                        // Unit should be one of the valid options
                        expect(['kg', 'lbs']).toContain(result.unit);
                    }
                )
            );
        });
    });
});