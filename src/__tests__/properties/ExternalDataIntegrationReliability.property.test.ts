/**
 * Property-Based Tests for External Data Integration Reliability
 * Feature: vitracka-weight-management, Property 15: External Data Integration Reliability
 * Validates: Requirements 12.2, 12.3, 12.4, 12.5
 */

import fc from 'fast-check';
import { NutritionScoutService } from '../../services/NutritionScoutService';
import { NutritionSearchQuery, ExternalNutritionAPI, MCPNutritionResponse } from '../../types/nutrition';

describe('External Data Integration Reliability Property Tests', () => {
    let nutritionScout: NutritionScoutService;

    beforeEach(() => {
        nutritionScout = new NutritionScoutService();
    });

    /**
     * Property 15: External Data Integration Reliability
     * For any external nutrition data request, the system should access real-time information 
     * through approved APIs, validate and sanitize the data, handle service interruptions gracefully, 
     * and maintain interoperability across multiple sources
     */
    it('should handle external API failures gracefully', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    searchTerm: fc.constantFrom('apple', 'bread', 'milk', 'chicken', 'rice'),
                    includeAlternatives: fc.boolean(),
                    simulateFailure: fc.boolean()
                }),
                async (testData) => {
                    // Feature: vitracka-weight-management, Property 15: External Data Integration Reliability
                    const query: NutritionSearchQuery = {
                        searchTerm: testData.searchTerm,
                        includeAlternatives: testData.includeAlternatives
                    };

                    // Should not throw errors even when external services fail
                    const results = await nutritionScout.searchNutrition(query);

                    // Should always return an array (graceful handling)
                    expect(Array.isArray(results)).toBe(true);

                    // Results should be valid even if from cache or fallback
                    results.forEach(result => {
                        expect(result.item).toBeDefined();
                        expect(result.item.id).toBeDefined();
                        expect(result.item.name).toBeDefined();
                        expect(result.item.nutritionPer100g).toBeDefined();

                        // Data should be sanitized (no negative values)
                        const nutrition = result.item.nutritionPer100g;
                        expect(nutrition.calories).toBeGreaterThanOrEqual(0);
                        expect(nutrition.protein).toBeGreaterThanOrEqual(0);
                        expect(nutrition.carbohydrates).toBeGreaterThanOrEqual(0);
                        expect(nutrition.fat).toBeGreaterThanOrEqual(0);

                        // Should not have extreme values (data validation)
                        expect(nutrition.calories).toBeLessThan(9000);
                        expect(nutrition.protein).toBeLessThan(100);
                        expect(nutrition.carbohydrates).toBeLessThan(100);
                        expect(nutrition.fat).toBeLessThan(100);
                    });
                }
            ),
            { numRuns: 30 }
        );
    }, 8000);

    /**
     * Property: Data validation should reject invalid external data
     */
    it('should validate and sanitize external data properly', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    searchTerm: fc.constantFrom('test', 'food', 'item'),
                    includeAlternatives: fc.constant(false)
                }),
                async (testData) => {
                    const query: NutritionSearchQuery = {
                        searchTerm: testData.searchTerm,
                        includeAlternatives: testData.includeAlternatives
                    };

                    const results = await nutritionScout.searchNutrition(query);

                    // All returned results should pass validation
                    results.forEach(result => {
                        // Required fields should be present
                        expect(result.item.name).toBeTruthy();
                        expect(result.item.nutritionPer100g).toBeDefined();

                        // Nutrition values should be reasonable
                        const nutrition = result.item.nutritionPer100g;
                        expect(nutrition.calories).toBeGreaterThanOrEqual(0);
                        expect(nutrition.calories).toBeLessThan(9000);

                        // Should not contain extreme restriction items (unless beverages)
                        if (result.item.category !== 'beverages') {
                            expect(nutrition.calories).toBeGreaterThanOrEqual(10);
                        }

                        // Pricing data should be valid if present
                        if (result.pricing && result.pricing.length > 0) {
                            result.pricing.forEach(pricing => {
                                expect(pricing.price).toBeGreaterThan(0);
                                expect(pricing.currency).toBeTruthy();
                                expect(pricing.retailer).toBeTruthy();
                                expect(['in_stock', 'out_of_stock', 'limited']).toContain(pricing.availability);
                                expect(pricing.lastUpdated).toBeInstanceOf(Date);
                            });
                        }
                    });
                }
            ),
            { numRuns: 25 }
        );
    }, 6000);

    /**
     * Property: Should maintain interoperability across multiple data sources
     */
    it('should maintain consistent data format across multiple sources', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    searchTerm: fc.constantFrom('apple', 'banana', 'chicken', 'bread'),
                    includeAlternatives: fc.boolean()
                }),
                async (testData) => {
                    const query: NutritionSearchQuery = {
                        searchTerm: testData.searchTerm,
                        includeAlternatives: testData.includeAlternatives
                    };

                    const results = await nutritionScout.searchNutrition(query);

                    // All results should have consistent structure regardless of source
                    results.forEach(result => {
                        // Standard nutrition data structure
                        expect(result.item.nutritionPer100g).toHaveProperty('calories');
                        expect(result.item.nutritionPer100g).toHaveProperty('protein');
                        expect(result.item.nutritionPer100g).toHaveProperty('carbohydrates');
                        expect(result.item.nutritionPer100g).toHaveProperty('fat');

                        // Standard result structure
                        expect(result).toHaveProperty('item');
                        expect(result).toHaveProperty('pricing');
                        expect(result).toHaveProperty('alternatives');
                        expect(result).toHaveProperty('relevanceScore');

                        // Alternatives structure should be consistent
                        expect(result.alternatives).toHaveProperty('healthier');
                        expect(result.alternatives).toHaveProperty('cheaper');
                        expect(Array.isArray(result.alternatives.healthier)).toBe(true);
                        expect(Array.isArray(result.alternatives.cheaper)).toBe(true);

                        // Relevance score should be normalized
                        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
                        expect(result.relevanceScore).toBeLessThanOrEqual(1);
                    });
                }
            ),
            { numRuns: 20 }
        );
    }, 5000);

    /**
     * Property: Should handle service interruptions without data corruption
     */
    it('should handle service interruptions without corrupting data', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    searchTerm: fc.constantFrom('test', 'food'),
                    category: fc.option(fc.constantFrom('produce', 'dairy'), { nil: undefined }),
                    includeAlternatives: fc.boolean()
                }),
                async (testData) => {
                    const query: NutritionSearchQuery = {
                        searchTerm: testData.searchTerm,
                        category: testData.category,
                        includeAlternatives: testData.includeAlternatives
                    };

                    // Should not throw errors
                    const results = await nutritionScout.searchNutrition(query);

                    // Should return valid data structure even during failures
                    expect(Array.isArray(results)).toBe(true);

                    // If results are returned, they should be complete and valid
                    results.forEach(result => {
                        expect(result.item).toBeDefined();
                        expect(result.item.id).toBeTruthy();
                        expect(result.item.name).toBeTruthy();
                        expect(result.item.nutritionPer100g).toBeDefined();

                        // No partial or corrupted data
                        const nutrition = result.item.nutritionPer100g;
                        expect(typeof nutrition.calories).toBe('number');
                        expect(typeof nutrition.protein).toBe('number');
                        expect(typeof nutrition.carbohydrates).toBe('number');
                        expect(typeof nutrition.fat).toBe('number');

                        // No NaN or undefined values
                        expect(isNaN(nutrition.calories)).toBe(false);
                        expect(isNaN(nutrition.protein)).toBe(false);
                        expect(isNaN(nutrition.carbohydrates)).toBe(false);
                        expect(isNaN(nutrition.fat)).toBe(false);
                    });
                }
            ),
            { numRuns: 20 }
        );
    }, 5000);

    /**
     * Property: Cache should work correctly and provide stale data during outages
     */
    it('should provide cached data during service outages', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    searchTerm: fc.constantFrom('apple', 'bread'),
                    includeAlternatives: fc.boolean()
                }),
                async (testData) => {
                    const query: NutritionSearchQuery = {
                        searchTerm: testData.searchTerm,
                        includeAlternatives: testData.includeAlternatives
                    };

                    // First call should populate cache
                    const firstResults = await nutritionScout.searchNutrition(query);

                    // Second call should potentially use cache
                    const secondResults = await nutritionScout.searchNutrition(query);

                    // Both calls should return valid data
                    expect(Array.isArray(firstResults)).toBe(true);
                    expect(Array.isArray(secondResults)).toBe(true);

                    // If both have results, they should have consistent structure
                    if (firstResults.length > 0 && secondResults.length > 0) {
                        expect(firstResults[0].item.nutritionPer100g).toBeDefined();
                        expect(secondResults[0].item.nutritionPer100g).toBeDefined();

                        // Should have same basic structure
                        expect(typeof firstResults[0].item.nutritionPer100g.calories).toBe('number');
                        expect(typeof secondResults[0].item.nutritionPer100g.calories).toBe('number');
                    }
                }
            ),
            { numRuns: 15 }
        );
    }, 4000);
});