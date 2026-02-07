/**
 * Currency Handling Service
 * Handles multi-currency support, exchange rates, and regional pricing
 */

import { MobileInternationalizationService } from './internationalizationService';
import {
    SupportedCurrency,
    RegionalSettings
} from '../types/internationalization';

export interface PricingTier {
    tierName: string;
    monthlyPrice: number;
    yearlyPrice: number;
    monthlyPriceWithTax?: number;
    yearlyPriceWithTax?: number;
    currency: string;
    region: string;
    taxRate?: number;
    taxAmount?: number;
}

export interface TaxCalculation {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    taxType: string;
}

export interface PaymentValidation {
    isValid: boolean;
    minimumAmount?: number;
    maximumAmount?: number;
    error?: string;
}

export interface CurrencyChangeResult {
    success: boolean;
    newCurrency?: string;
    exchangeRate?: number;
    effectiveDate?: Date;
    error?: string;
    supportedCurrencies?: string[];
}

export interface ExchangeRateHistory {
    date: Date;
    rate: number;
    source: string;
}

export interface PaymentMethodValidation {
    isSupported: boolean;
    processingFee?: number;
    reason?: string;
}

export class CurrencyHandlingService {
    private exchangeRates: Record<string, number> = {};
    private baseCurrency = 'GBP';

    // Regional tax rates
    private taxRates: Record<string, { rate: number; type: string }> = {
        'GB': { rate: 0.20, type: 'VAT' },
        'DE': { rate: 0.19, type: 'VAT' },
        'FR': { rate: 0.20, type: 'VAT' },
        'ES': { rate: 0.21, type: 'VAT' },
        'IT': { rate: 0.22, type: 'VAT' },
        'US': { rate: 0.08, type: 'Sales Tax' }, // Average US sales tax
        'CA': { rate: 0.13, type: 'HST' }, // Average Canadian HST
        'AU': { rate: 0.10, type: 'GST' },
        'AE': { rate: 0.00, type: 'None' }
    };

    // Minimum payment amounts by currency
    private minimumAmounts: Record<string, number> = {
        'GBP': 0.30,
        'USD': 0.50,
        'EUR': 0.50,
        'CAD': 0.50,
        'AUD': 0.50
    };

    // Maximum payment amounts by currency
    private maximumAmounts: Record<string, number> = {
        'GBP': 10000,
        'USD': 12700,
        'EUR': 11700,
        'CAD': 17100,
        'AUD': 19100
    };

    // Regional payment method support
    private paymentMethods: Record<string, Record<string, { supported: boolean; fee: number }>> = {
        'GB': {
            'card': { supported: true, fee: 0.029 },
            'paypal': { supported: true, fee: 0.034 },
            'apple_pay': { supported: true, fee: 0.029 },
            'google_pay': { supported: true, fee: 0.029 }
        },
        'DE': {
            'card': { supported: true, fee: 0.029 },
            'sepa': { supported: true, fee: 0.008 },
            'paypal': { supported: true, fee: 0.034 },
            'sofort': { supported: true, fee: 0.014 }
        },
        'US': {
            'card': { supported: true, fee: 0.029 },
            'ach': { supported: true, fee: 0.008 },
            'paypal': { supported: true, fee: 0.034 },
            'apple_pay': { supported: true, fee: 0.029 },
            'google_pay': { supported: true, fee: 0.029 }
        },
        'CA': {
            'card': { supported: true, fee: 0.029 },
            'paypal': { supported: true, fee: 0.034 },
            'apple_pay': { supported: true, fee: 0.029 },
            'google_pay': { supported: true, fee: 0.029 }
        },
        'AU': {
            'card': { supported: true, fee: 0.029 },
            'paypal': { supported: true, fee: 0.034 },
            'apple_pay': { supported: true, fee: 0.029 },
            'google_pay': { supported: true, fee: 0.029 }
        }
    };

    constructor(private internationalizationService: MobileInternationalizationService) {
        // Initialize with default exchange rates (would be fetched from API in production)
        this.exchangeRates = {
            'GBP': 1.0,    // Base currency
            'USD': 1.27,
            'EUR': 1.17,
            'CAD': 1.71,
            'AUD': 1.91
        };
    }

    /**
     * Format currency amount according to locale
     */
    formatCurrency(amount: number, currency: string, locale?: string): string {
        return this.internationalizationService.formatCurrency(amount, {
            currency,
            locale
        });
    }

    /**
     * Convert amount between currencies
     */
    convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
        if (fromCurrency === toCurrency) {
            return amount;
        }

        const fromRate = this.exchangeRates[fromCurrency];
        const toRate = this.exchangeRates[toCurrency];

        if (!fromRate || !toRate) {
            throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
        }

        // Convert to base currency first, then to target currency
        const baseAmount = amount / fromRate;
        const convertedAmount = baseAmount * toRate;

        return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Set exchange rates (would typically be fetched from external API)
     */
    setExchangeRates(rates: Record<string, number>): void {
        this.exchangeRates = { ...rates };
    }

    /**
     * Get regional pricing for subscription tiers
     */
    async getRegionalPricing(region: string, currency: string): Promise<PricingTier[]> {
        const basePricing = await this.fetchRegionalPricing(region);

        // Convert pricing to requested currency if different
        return basePricing.map(tier => ({
            ...tier,
            monthlyPrice: this.convertCurrency(tier.monthlyPrice, tier.currency, currency),
            yearlyPrice: this.convertCurrency(tier.yearlyPrice, tier.currency, currency),
            currency
        }));
    }

    /**
     * Fetch base regional pricing (mock implementation)
     */
    async fetchRegionalPricing(region: string): Promise<PricingTier[]> {
        // Mock implementation - would fetch from API in production
        return [
            {
                tierName: 'Basic',
                monthlyPrice: 9.99,
                yearlyPrice: 99.99,
                currency: 'GBP',
                region
            },
            {
                tierName: 'Premium',
                monthlyPrice: 19.99,
                yearlyPrice: 199.99,
                currency: 'GBP',
                region
            }
        ];
    }

    /**
     * Calculate taxes for a given amount and region
     */
    calculateTaxes(amount: number, region: string): TaxCalculation {
        const taxInfo = this.taxRates[region] || { rate: 0, type: 'None' };
        const taxAmount = Math.round(amount * taxInfo.rate * 100) / 100;
        const total = amount + taxAmount;

        return {
            subtotal: amount,
            taxRate: taxInfo.rate,
            taxAmount,
            total,
            taxType: taxInfo.type
        };
    }

    /**
     * Validate payment amount against currency limits
     */
    validatePaymentAmount(amount: number, currency: string): PaymentValidation {
        const minimumAmount = this.minimumAmounts[currency] || 0.50;
        const maximumAmount = this.maximumAmounts[currency] || 10000;

        const isValid = amount >= minimumAmount && amount <= maximumAmount;

        return {
            isValid,
            minimumAmount,
            maximumAmount,
            error: !isValid ?
                (amount < minimumAmount ?
                    `Amount below minimum of ${this.formatCurrency(minimumAmount, currency)}` :
                    `Amount exceeds maximum of ${this.formatCurrency(maximumAmount, currency)}`
                ) : undefined
        };
    }

    /**
     * Handle currency change for user
     */
    async handleCurrencyChange(userId: string, newCurrency: string, currentRegion: string): Promise<CurrencyChangeResult> {
        try {
            // Validate currency is supported in region
            const supportedCurrencies = this.getSupportedCurrenciesForRegion(currentRegion);

            if (!supportedCurrencies.includes(newCurrency)) {
                return {
                    success: false,
                    error: `Currency ${newCurrency} not supported in region ${currentRegion}`,
                    supportedCurrencies
                };
            }

            // Update user configuration
            await this.internationalizationService.updateConfiguration({
                currency: newCurrency
            });

            const exchangeRate = this.exchangeRates[newCurrency] || 1;

            return {
                success: true,
                newCurrency,
                exchangeRate,
                effectiveDate: new Date()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Get supported currencies for a region
     */
    private getSupportedCurrenciesForRegion(region: string): string[] {
        const regionCurrencies: Record<string, string[]> = {
            'GB': ['GBP', 'USD', 'EUR'],
            'US': ['USD', 'GBP', 'EUR'],
            'DE': ['EUR', 'GBP', 'USD'],
            'FR': ['EUR', 'GBP', 'USD'],
            'ES': ['EUR', 'GBP', 'USD'],
            'IT': ['EUR', 'GBP', 'USD'],
            'CA': ['CAD', 'USD', 'GBP'],
            'AU': ['AUD', 'USD', 'GBP']
        };

        return regionCurrencies[region] || ['GBP', 'USD', 'EUR'];
    }

    /**
     * Get exchange rate history (mock implementation)
     */
    async getExchangeRateHistory(baseCurrency: string, targetCurrency: string, days: number): Promise<ExchangeRateHistory[]> {
        return this.fetchExchangeRateHistory(baseCurrency, targetCurrency, days);
    }

    /**
     * Fetch exchange rate history (mock implementation)
     */
    async fetchExchangeRateHistory(baseCurrency: string, targetCurrency: string, days: number): Promise<ExchangeRateHistory[]> {
        // Mock implementation - would fetch from financial API in production
        const baseRate = this.exchangeRates[targetCurrency] || 1;

        return Array.from({ length: days }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            rate: baseRate + (Math.random() - 0.5) * 0.1, // Simulate rate fluctuation
            source: 'Bank of England'
        }));
    }

    /**
     * Get localized subscription pricing with taxes
     */
    async getLocalizedSubscriptionPricing(region: string, currency: string): Promise<PricingTier[]> {
        const basePricing = await this.getRegionalPricing(region, currency);

        return basePricing.map(tier => {
            const taxCalc = this.calculateTaxes(tier.monthlyPrice, region);
            const yearlyTaxCalc = this.calculateTaxes(tier.yearlyPrice, region);

            return {
                ...tier,
                monthlyPriceWithTax: taxCalc.total,
                yearlyPriceWithTax: yearlyTaxCalc.total,
                taxRate: taxCalc.taxRate,
                taxAmount: taxCalc.taxAmount
            };
        });
    }

    /**
     * Validate payment method for region
     */
    validatePaymentMethod(region: string, paymentMethod: string): PaymentMethodValidation {
        const regionMethods = this.paymentMethods[region];

        if (!regionMethods) {
            return {
                isSupported: false,
                reason: 'Region not supported'
            };
        }

        const methodInfo = regionMethods[paymentMethod];

        if (!methodInfo || !methodInfo.supported) {
            return {
                isSupported: false,
                reason: 'Not available in region'
            };
        }

        return {
            isSupported: true,
            processingFee: methodInfo.fee
        };
    }
}