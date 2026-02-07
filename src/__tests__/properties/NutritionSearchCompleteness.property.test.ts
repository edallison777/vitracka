/**
 * Property-Based Tests for Nutrition Search Completeness
 * Feature: vitracka-weight-management, Property 10: Nutrition Search Completeness
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import fc from 'fast-check';
import { NutritionScoutService } from '../../services/NutritionScoutService';
import { NutritionSearchQuery, NutritionSearchResult } from '../../types/nutrition';

describe('Nutrition Search Completeness Property Tests', () => {
    let nutritionScout: NutritionScoutService;

    beforeEach(() => {
        nutritionScout = new NutritionScoutService();
    });

    /**
     * Property 10: Nutrition Search Completeness
     * For any nutritional search query, the system should return relevant food items 
     * with pricing information and suggest healthier or cheaper alternatives when available, 
     * while avoiding extreme restriction strategies
     */
    it('should return complete nutrition search results with pricing and alternatives', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    searchTerm: fc.constantFrom('apple', 'bread', 'milk', 'chicken', 'rice'),
                    category: fc.option(fc.constantFrom('produce', 'dairy', 'meat', 'grains'), { nil: undefined }),
                    maxCalories: fc.option(fc.integer({ min: 50, max: 500 }), { nil: undefined }),
                    minProtein: fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
                    includeAlternatives: fc.boolean()
                }),
                async (query: NutritionSearchQuery) => {
                    // Feature: vitracka-weight-management, Property 10: Nutrition Search Completeness
                    const results = await nutritionScout.searchNutrition(query);

                    // Should return array of results
                    expect(Array.isArray(results)).toBe(true);

                    // Each result should have complete structure
                    results.forEach((result: NutritionSearchResult) => {
                        // Should have nutrition item with required fields
                        expect(result.item).toBeDefined();
                        expect(result.item.id).toBeDefined();
                        expect(result.item.name).toBeDefined();
                        expect(result.item.category).toBeDefined();
                        expect(result.item.nutritionPer100g).toBeDefined();

                        // Nutrition data should be valid
                        const nutrition = result.item.nutritionPer100g;
                        expect(nutrition.calories).toBeGreaterThanOrEqual(0);
                        expect(nutrition.calories).toBeLessThan(9000);
                        expect(nutrition.protein).toBeGreaterThanOrEqual(0);
                        expect(nutrition.carbohydrates).toBeGreaterThanOrEqual(0);
                        expect(nutrition.fat).toBeGreaterThanOrEqual(0);

                        // Should avoid extreme restriction strategies (very low calorie items)
                        if (result.item.category !== 'beverages') {
                            expect(nutrition.calories).toBeGreaterThanOrEqual(10);
                        }

                        // Should have pricing information (Requirement 6.2)
                        expect(result.pricing).toBeDefined();
                        expect(Array.isArray(result.pricing)).toBe(true);

                        if (result.pricing.length > 0) {
                            result.pricing.forEach(pricing => {
                                expect(pricing.retailer).toBeDefined();
                                expect(pricing.price).toBeGreaterThan(0);
                                expect(pricing.currency).toBeDefined();
                                expect(pricing.unit).toBeDefined();
                                expect(pricing.availability).toMatch(/^(in_stock|out_of_stock|limited)$/);
                                expect(pricing.lastUpdated).toBeInstanceOf(Date);
                            });
                        }

                        // Should have alternatives structure
                        expect(result.alternatives).toBeDefined();
                        expect(result.alternatives.healthier).toBeDefined();
                        expect(result.alternatives.cheaper).toBeDefined();
                        expect(Array.isArray(result.alternatives.healthier)).toBe(true);
                        expect(Array.isArray(result.alternatives.cheaper)).toBe(true);

                        // If alternatives requested, should provide them when available (Requirement 6.3)
                        if (query.includeAlternatives && results.length > 1) {
                            const hasHealthierAlternatives = result.alternatives.healthier.length > 0;
                            const hasCheaperAlternatives = result.alternatives.cheaper.length > 0;

                            // At least one type of alternative should be available when multiple results exist
                            if (results.length > 3) {
                                expect(hasHealthierAlternatives || hasCheaperAlternatives).toBe(true);
                            }
                        }

                        // Relevance score should be valid
                        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
                        expect(result.relevanceScore).toBeLessThanOrEqual(1);
                    });

                    // Results should be relevant to search term
                    if (results.length > 0) {
                        const searchTermLower = query.searchTerm.toLowerCase();
                        const hasRelevantResults = results.some(result =>
                            result.item.name.toLowerCase().includes(searchTermLower) ||
                            result.item.category.toLowerCase().includes(searchTermLower) ||
                            result.relevanceScore > 0.5
                        );
                        expect(hasRelevantResults).toBe(true);
                    }

                    // Should respect category filter if provided
                    if (query.category && results.length > 0) {
                        const allMatchCategory = results.every(result =>
                            result.item.category === query.category
                        );
                        expect(allMatchCategory).toBe(true);
                    }

                    // Should respect calorie limit if provided
                    if (query.maxCalories && results.length > 0) {
                        const allWithinCalorieLimit = results.every(result =>
                            result.item.nutritionPer100g.calories <= query.maxCalories!
                        );
                        expect(allWithinCalorieLimit).toBe(true);
                    }

                    // Should respect protein minimum if provided
                    if (query.minProtein && results.length > 0) {
                        const allMeetProteinMin = results.every(result =>
                            result.item.nutritionPer100g.protein >= query.minProtein!
                        );
                        expect(allMeetProteinMin).toBe(true);
                    }
                }
            ),
            { numRuns: 20 }
        );
    }, 15000);

    /**
     * Property: Healthier alternatives should actually be healthier
     */
    it('should provide genuinely healthier alternatives when available', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    searchTerm: fc.constantFrom('apple', 'bread', 'milk', 'chicken'),
                    includeAlternatives: fc.constant(true)
                }),
                async (query: NutritionSearchQuery) => {
                    const results = await nutritionScout.searchNutrition(query);

                    results.forEach(result => {
                        result.alternatives.healthier.forEach(alternative => {
                            const original = result.item.nutritionPer100g;
                            const healthier = alternative.nutritionPer100g;

                            // At least one health metric should be better
                            const hasLowerCalories = healthier.calories < original.calories;
                            const hasHigherProtein = healthier.protein > original.protein;
                            const hasHigherFiber = (healthier.fiber || 0) > (original.fiber || 0);

                            expect(hasLowerCalories || hasHigherProtein || hasHigherFiber).toBe(true);
                        });
                    });
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property: Cheaper alternatives should actually be cheaper
     */
    it('should provide genuinely cheaper alternatives when available', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    searchTerm: fc.constantFrom('apple', 'bread', 'milk', 'chicken'),
                    includeAlternatives: fc.constant(true)
                }),
                async (query: NutritionSearchQuery) => {
                    const results = await nutritionScout.searchNutrition(query);

                    results.forEach(result => {
                        if (result.pricing.length > 0 && result.alternatives.cheaper.length > 0) {
                            const originalPrice = result.pricing[0].price;

                            // Find pricing for cheaper alternatives
                            const cheaperResults = results.filter(r =>
                                result.alternatives.cheaper.some(alt => alt.id === r.item.id)
                            );

                            cheaperResults.forEach(cheaperResult => {
                                if (cheaperResult.pricing.length > 0) {
                                    expect(cheaperResult.pricing[0].price).toBeLessThan(originalPrice);
                                }
                            });
                        }
                    });
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property: Should handle empty or invalid search terms gracefully
     */
    it('should handle edge cases gracefully', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    searchTerm: fc.constantFrom('', '   ', '!@#$%', 'x'.repeat(1000)),
                    includeAlternatives: fc.boolean()
                }),
                async (query: NutritionSearchQuery) => {
                    // Should not throw errors
                    const results = await nutritionScout.searchNutrition(query);
                    expect(Array.isArray(results)).toBe(true);

                    // For invalid search terms, should return empty or minimal results
                    if (query.searchTerm.trim().length === 0 || query.searchTerm.length > 100) {
                        expect(results.length).toBeLessThanOrEqual(2);
                    }
                }
            ),
            { numRuns: 30 }
        );
    });
});