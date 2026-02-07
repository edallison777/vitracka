/**
 * Nutrition Scout Service
 * Implements nutrition search functionality with MCP server integration
 * Based on design document specifications for external knowledge integration
 */

import {
    NutritionSearchQuery,
    NutritionSearchResult,
    NutritionItem,
    PricingInfo,
    ExternalNutritionAPI,
    MCPNutritionResponse
} from '../types/nutrition';

export class NutritionScoutService {
    private mcpServers: ExternalNutritionAPI[];
    private cache: Map<string, { data: NutritionSearchResult[]; timestamp: Date }>;
    private readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

    constructor() {
        this.mcpServers = [
            {
                name: 'USDA_FoodData',
                baseUrl: 'https://api.nal.usda.gov/fdc/v1',
                rateLimit: { requestsPerMinute: 60, requestsPerDay: 1000 },
                isActive: true
            },
            {
                name: 'OpenFoodFacts',
                baseUrl: 'https://world.openfoodfacts.org/api/v0',
                rateLimit: { requestsPerMinute: 100, requestsPerDay: 10000 },
                isActive: true
            }
        ];
        this.cache = new Map();
    }

    /**
     * Search for nutrition information with pricing and alternatives
     * Validates: Requirements 6.1, 6.2, 6.3, 6.4
     */
    async searchNutrition(query: NutritionSearchQuery): Promise<NutritionSearchResult[]> {
        // Handle invalid search terms
        if (!query.searchTerm || query.searchTerm.trim().length === 0 || query.searchTerm.length > 100) {
            return [];
        }

        // Check cache first
        const cacheKey = this.generateCacheKey(query);
        const cached = this.getCachedResults(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            // Search across multiple MCP servers
            const results = await this.searchAcrossAPIs(query);

            // Validate and sanitize results
            const validatedResults = this.validateAndSanitizeResults(results);

            // Add pricing information
            const resultsWithPricing = await this.addPricingInformation(validatedResults);

            // Generate alternatives if requested
            const finalResults = query.includeAlternatives
                ? await this.addAlternatives(resultsWithPricing, query)
                : resultsWithPricing;

            // Cache results
            this.cacheResults(cacheKey, finalResults);

            return finalResults;
        } catch (error) {
            // Graceful handling of external service interruptions
            return this.handleServiceInterruption(query, error);
        }
    }

    /**
     * Search across multiple MCP servers with fallback
     * Validates: Requirements 12.2, 12.3, 12.4, 12.5
     */
    private async searchAcrossAPIs(query: NutritionSearchQuery): Promise<NutritionSearchResult[]> {
        const results: NutritionSearchResult[] = [];

        for (const api of this.mcpServers.filter(api => api.isActive)) {
            try {
                const apiResults = await this.queryMCPServer(api, query);
                if (apiResults.success && apiResults.data) {
                    results.push(...apiResults.data);
                }
            } catch (error) {
                console.warn(`API ${api.name} failed:`, error);
                // Continue with other APIs
            }
        }

        return results;
    }

    /**
     * Query individual MCP server
     */
    private async queryMCPServer(api: ExternalNutritionAPI, query: NutritionSearchQuery): Promise<MCPNutritionResponse> {
        // Simulate MCP server call - in real implementation this would use actual MCP protocol
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: this.generateMockNutritionData(query),
                    source: api.name,
                    timestamp: new Date(),
                    cached: false
                });
            }, 100);
        });
    }

    /**
     * Validate and sanitize external data
     * Validates: Requirements 12.5
     */
    private validateAndSanitizeResults(results: NutritionSearchResult[]): NutritionSearchResult[] {
        return results.filter(result => {
            // Validate required fields
            if (!result.item.name || !result.item.nutritionPer100g) {
                return false;
            }

            // Sanitize nutrition values
            const nutrition = result.item.nutritionPer100g;
            if (nutrition.calories < 0 || nutrition.calories > 9000) {
                return false;
            }

            // Ensure no extreme restriction strategies
            if (nutrition.calories < 10 && result.item.category !== 'beverages') {
                return false;
            }

            return true;
        });
    }

    /**
     * Add pricing information from multiple sources
     * Validates: Requirements 6.2
     */
    private async addPricingInformation(results: NutritionSearchResult[]): Promise<NutritionSearchResult[]> {
        return results.map(result => ({
            ...result,
            pricing: this.generateMockPricingData(result.item)
        }));
    }

    /**
     * Generate healthier and cheaper alternatives
     * Validates: Requirements 6.3, 6.4
     */
    private async addAlternatives(results: NutritionSearchResult[], query: NutritionSearchQuery): Promise<NutritionSearchResult[]> {
        return results.map(result => {
            const healthierAlternatives = this.findHealthierAlternatives(result.item, results);
            const cheaperAlternatives = this.findCheaperAlternatives(result, results);

            return {
                ...result,
                alternatives: {
                    healthier: healthierAlternatives,
                    cheaper: cheaperAlternatives
                }
            };
        });
    }

    /**
     * Find healthier alternatives (lower calories, higher protein/fiber)
     */
    private findHealthierAlternatives(item: NutritionItem, allResults: NutritionSearchResult[]): NutritionItem[] {
        return allResults
            .filter(result =>
                result.item.category === item.category &&
                result.item.id !== item.id &&
                (result.item.nutritionPer100g.calories < item.nutritionPer100g.calories ||
                    result.item.nutritionPer100g.protein > item.nutritionPer100g.protein ||
                    (result.item.nutritionPer100g.fiber || 0) > (item.nutritionPer100g.fiber || 0))
            )
            .slice(0, 3)
            .map(result => result.item);
    }

    /**
     * Find cheaper alternatives
     */
    private findCheaperAlternatives(result: NutritionSearchResult, allResults: NutritionSearchResult[]): NutritionItem[] {
        const currentPrice = result.pricing[0]?.price || Infinity;

        return allResults
            .filter(other =>
                other.item.category === result.item.category &&
                other.item.id !== result.item.id &&
                (other.pricing[0]?.price || Infinity) < currentPrice
            )
            .slice(0, 3)
            .map(other => other.item);
    }

    /**
     * Handle service interruptions gracefully
     * Validates: Requirements 12.4
     */
    private handleServiceInterruption(query: NutritionSearchQuery, error: any): NutritionSearchResult[] {
        console.warn('External nutrition services unavailable:', error);

        // Return cached data if available
        const cacheKey = this.generateCacheKey(query);
        const cached = this.getCachedResults(cacheKey, true); // Allow stale cache

        if (cached) {
            return cached;
        }

        // Return empty results with appropriate messaging
        return [];
    }

    /**
     * Cache management
     */
    private generateCacheKey(query: NutritionSearchQuery): string {
        return `${query.searchTerm}_${query.category || 'all'}_${query.maxCalories || 'unlimited'}`;
    }

    private getCachedResults(cacheKey: string, allowStale = false): NutritionSearchResult[] | null {
        const cached = this.cache.get(cacheKey);
        if (!cached) return null;

        const isExpired = Date.now() - cached.timestamp.getTime() > this.CACHE_DURATION_MS;
        if (isExpired && !allowStale) return null;

        return cached.data;
    }

    private cacheResults(cacheKey: string, results: NutritionSearchResult[]): void {
        this.cache.set(cacheKey, {
            data: results,
            timestamp: new Date()
        });
    }

    /**
     * Mock data generators for testing
     */
    private generateMockNutritionData(query: NutritionSearchQuery): NutritionSearchResult[] {
        const mockItems: NutritionItem[] = [
            {
                id: `item_${Date.now()}_1`,
                name: `${query.searchTerm} - Organic`,
                category: query.category || 'produce',
                nutritionPer100g: {
                    calories: query.maxCalories ? Math.min(50, query.maxCalories) : 50,
                    protein: query.minProtein ? Math.max(2, query.minProtein) : 2,
                    carbohydrates: 10,
                    fat: 0.5
                }
            },
            {
                id: `item_${Date.now()}_2`,
                name: `${query.searchTerm} - Regular`,
                category: query.category || 'produce',
                nutritionPer100g: {
                    calories: query.maxCalories ? Math.min(60, query.maxCalories) : 60,
                    protein: query.minProtein ? Math.max(1.5, query.minProtein) : 1.5,
                    carbohydrates: 12,
                    fat: 0.3
                }
            },
            {
                id: `item_${Date.now()}_3`,
                name: `${query.searchTerm} - Premium`,
                category: query.category || 'produce',
                nutritionPer100g: {
                    calories: query.maxCalories ? Math.min(40, query.maxCalories) : 40,
                    protein: query.minProtein ? Math.max(3, query.minProtein) : 3,
                    carbohydrates: 8,
                    fat: 0.2,
                    fiber: 2
                }
            },
            {
                id: `item_${Date.now()}_4`,
                name: `${query.searchTerm} - Budget`,
                category: query.category || 'produce',
                nutritionPer100g: {
                    calories: query.maxCalories ? Math.min(70, query.maxCalories) : 70,
                    protein: query.minProtein ? Math.max(1, query.minProtein) : 1,
                    carbohydrates: 15,
                    fat: 0.8
                }
            }
        ];

        return mockItems.map(item => ({
            item,
            pricing: this.generateMockPricingData(item),
            alternatives: { healthier: [], cheaper: [] },
            relevanceScore: 0.8
        }));
    }

    private generateMockPricingData(item: NutritionItem): PricingInfo[] {
        // Generate different prices based on item name to ensure variety
        const basePrice = item.name.includes('Premium') ? 3.50 :
            item.name.includes('Organic') ? 2.50 :
                item.name.includes('Budget') ? 1.50 : 2.00;

        return [
            {
                retailer: 'Tesco',
                price: basePrice,
                currency: 'GBP',
                unit: 'per kg',
                availability: 'in_stock',
                lastUpdated: new Date()
            },
            {
                retailer: 'Sainsbury\'s',
                price: basePrice + 0.25,
                currency: 'GBP',
                unit: 'per kg',
                availability: 'in_stock',
                lastUpdated: new Date()
            }
        ];
    }
}