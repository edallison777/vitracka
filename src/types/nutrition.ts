/**
 * Nutrition Types
 * Based on design document specifications for nutrition search and MCP integration
 */

export interface NutritionItem {
    id: string;
    name: string;
    brand?: string;
    category: string;
    nutritionPer100g: {
        calories: number;
        protein: number;
        carbohydrates: number;
        fat: number;
        fiber?: number;
        sugar?: number;
        sodium?: number;
    };
    servingSize?: {
        amount: number;
        unit: string;
    };
    barcode?: string;
}

export interface PricingInfo {
    retailer: string;
    price: number;
    currency: string;
    unit: string;
    availability: 'in_stock' | 'out_of_stock' | 'limited';
    lastUpdated: Date;
}

export interface NutritionSearchResult {
    item: NutritionItem;
    pricing: PricingInfo[];
    alternatives: {
        healthier: NutritionItem[];
        cheaper: NutritionItem[];
    };
    relevanceScore: number;
}

export interface NutritionSearchQuery {
    searchTerm: string;
    category?: string;
    maxCalories?: number;
    minProtein?: number;
    maxPrice?: number;
    includeAlternatives: boolean;
}

export interface ExternalNutritionAPI {
    name: string;
    baseUrl: string;
    apiKey?: string;
    rateLimit: {
        requestsPerMinute: number;
        requestsPerDay: number;
    };
    isActive: boolean;
}

export interface MCPNutritionResponse {
    success: boolean;
    data?: NutritionSearchResult[];
    error?: string;
    source: string;
    timestamp: Date;
    cached: boolean;
}