/**
 * Unit Tests for Currency Handling Service
 * Tests multi-currency support, exchange rates, and regional pricing
 */

import { CurrencyHandlingService } from '../../../services/CurrencyHandlingService';
import { MobileInternationalizationService } from '../../../services/internationalizationService';
import {
    SupportedCurrency,
    RegionalSettings
} from '../../../types/internationalization';

// Mock dependencies
jest.mock('../../../services/internationalizationService');

describe('CurrencyHandlingService', () => {
    let service: CurrencyHandlingService;
    let mockInternationalizationService: jest.Mocked<MobileInternationalizationService>;

    beforeEach(() => {
        mockInternationalizationService = MobileInternationalizationService.getInstance() as jest.Mocked<MobileInternationalizationService>;
        service = new CurrencyHandlingService(mockInternationalizationService);
        jest.clearAllMocks();
    });

    describe('formatCurrency', () => {
        it('should format currency according to user locale', () => {
            const testCases = [
                {
                    amount: 123.45,
                    currency: 'GBP',
                    locale: 'en-GB',
                    expected: /£.*123\.45/
                },
                {
                    amount: 123.45,
                    currency: 'USD',
                    locale: 'en-US',
                    expected: /\$.*123\.45/
                },
                {
                    amount: 123.45,
                    currency: 'EUR',
                    locale: 'de-DE',
                    expected: /123,45.*€/
                },
                {
                    amount: 123.45,
                    currency: 'CAD',
                    locale: 'en-CA',
                    expected: /C\$.*123\.45/
                },
                {
                    amount: 123.45,
                    currency: 'AUD',
                    locale: 'en-AU',
                    expected: /A\$.*123\.45/
                }
            ];

            testCases.forEach(testCase => {
                mockInternationalizationService.formatCurrency.mockReturnValue(
                    testCase.expected.source.replace(/[\/\\]/g, '').replace(/\.\*/g, '123.45')
                );

                const result = service.formatCurrency(
                    testCase.amount,
                    testCase.currency,
                    testCase.locale
                );

                expect(result).toMatch(testCase.expected);
            });
        });

        it('should handle zero and negative amounts', () => {
            const testCases = [
                { amount: 0, currency: 'GBP', expected: '£0.00' },
                { amount: -50.25, currency: 'USD', expected: '-$50.25' },
                { amount: 0.01, currency: 'EUR', expected: '€0.01' }
            ];

            testCases.forEach(testCase => {
                mockInternationalizationService.formatCurrency.mockReturnValue(testCase.expected);

                const result = service.formatCurrency(testCase.amount, testCase.currency);

                expect(result).toBe(testCase.expected);
            });
        });

        it('should handle large amounts with proper thousands separators', () => {
            const testCases = [
                {
                    amount: 1234567.89,
                    currency: 'GBP',
                    locale: 'en-GB',
                    expected: '£1,234,567.89'
                },
                {
                    amount: 1234567.89,
                    currency: 'EUR',
                    locale: 'de-DE',
                    expected: '1.234.567,89 €'
                }
            ];

            testCases.forEach(testCase => {
                mockInternationalizationService.formatCurrency.mockReturnValue(testCase.expected);

                const result = service.formatCurrency(
                    testCase.amount,
                    testCase.currency,
                    testCase.locale
                );

                expect(result).toBe(testCase.expected);
            });
        });
    });

    describe('convertCurrency', () => {
        beforeEach(() => {
            // Mock exchange rates
            service.setExchangeRates({
                'GBP': 1.0,    // Base currency
                'USD': 1.27,
                'EUR': 1.17,
                'CAD': 1.71,
                'AUD': 1.91
            });
        });

        it('should convert between different currencies', () => {
            const testCases = [
                {
                    amount: 100,
                    fromCurrency: 'GBP',
                    toCurrency: 'USD',
                    expected: 127
                },
                {
                    amount: 100,
                    fromCurrency: 'USD',
                    toCurrency: 'GBP',
                    expected: 78.74 // 100 / 1.27
                },
                {
                    amount: 100,
                    fromCurrency: 'EUR',
                    toCurrency: 'USD',
                    expected: 108.55 // (100 / 1.17) * 1.27
                }
            ];

            testCases.forEach(testCase => {
                const result = service.convertCurrency(
                    testCase.amount,
                    testCase.fromCurrency,
                    testCase.toCurrency
                );

                expect(result).toBeCloseTo(testCase.expected, 2);
            });
        });

        it('should return same amount for same currency conversion', () => {
            const amount = 123.45;
            const currency = 'GBP';

            const result = service.convertCurrency(amount, currency, currency);

            expect(result).toBe(amount);
        });

        it('should handle conversion with precision', () => {
            const amount = 99.99;
            const result = service.convertCurrency(amount, 'GBP', 'USD');

            // Should maintain reasonable precision
            expect(result).toBeCloseTo(126.99, 2);
            expect(Number.isFinite(result)).toBe(true);
        });
    });

    describe('getRegionalPricing', () => {
        it('should return pricing for different regions', async () => {
            const mockPricingTiers = [
                {
                    tierName: 'Basic',
                    monthlyPrice: 9.99,
                    yearlyPrice: 99.99,
                    currency: 'GBP',
                    region: 'GB'
                },
                {
                    tierName: 'Premium',
                    monthlyPrice: 19.99,
                    yearlyPrice: 199.99,
                    currency: 'GBP',
                    region: 'GB'
                }
            ];

            jest.spyOn(service, 'fetchRegionalPricing').mockResolvedValue(mockPricingTiers);

            const result = await service.getRegionalPricing('GB', 'GBP');

            expect(result).toEqual(mockPricingTiers);
            expect(result[0].currency).toBe('GBP');
            expect(result[0].region).toBe('GB');
        });

        it('should convert pricing to user currency', async () => {
            const mockGBPPricing = [
                {
                    tierName: 'Basic',
                    monthlyPrice: 9.99,
                    yearlyPrice: 99.99,
                    currency: 'GBP',
                    region: 'GB'
                }
            ];

            jest.spyOn(service, 'fetchRegionalPricing').mockResolvedValue(mockGBPPricing);

            const result = await service.getRegionalPricing('US', 'USD');

            // Should convert GBP prices to USD
            expect(result[0].monthlyPrice).toBeCloseTo(12.69, 2); // 9.99 * 1.27
            expect(result[0].yearlyPrice).toBeCloseTo(126.99, 2); // 99.99 * 1.27
            expect(result[0].currency).toBe('USD');
        });
    });

    describe('calculateTaxes', () => {
        it('should calculate VAT for EU regions', () => {
            const testCases = [
                {
                    amount: 100,
                    region: 'GB',
                    expectedTaxRate: 0.20,
                    expectedTax: 20,
                    expectedTotal: 120
                },
                {
                    amount: 100,
                    region: 'DE',
                    expectedTaxRate: 0.19,
                    expectedTax: 19,
                    expectedTotal: 119
                },
                {
                    amount: 100,
                    region: 'FR',
                    expectedTaxRate: 0.20,
                    expectedTax: 20,
                    expectedTotal: 120
                }
            ];

            testCases.forEach(testCase => {
                const result = service.calculateTaxes(testCase.amount, testCase.region);

                expect(result).toMatchObject({
                    subtotal: testCase.amount,
                    taxRate: testCase.expectedTaxRate,
                    taxAmount: testCase.expectedTax,
                    total: testCase.expectedTotal,
                    taxType: 'VAT'
                });
            });
        });

        it('should calculate sales tax for US regions', () => {
            const amount = 100;
            const region = 'US';

            const result = service.calculateTaxes(amount, region);

            expect(result).toMatchObject({
                subtotal: amount,
                taxRate: expect.any(Number),
                taxAmount: expect.any(Number),
                total: expect.any(Number),
                taxType: 'Sales Tax'
            });

            expect(result.total).toBeGreaterThan(amount);
        });

        it('should handle tax-free regions', () => {
            const amount = 100;
            const region = 'AE'; // UAE - no VAT on digital services

            const result = service.calculateTaxes(amount, region);

            expect(result).toMatchObject({
                subtotal: amount,
                taxRate: 0,
                taxAmount: 0,
                total: amount,
                taxType: 'None'
            });
        });
    });

    describe('validatePaymentAmount', () => {
        it('should validate minimum payment amounts by currency', () => {
            const testCases = [
                {
                    amount: 0.50,
                    currency: 'GBP',
                    expected: { isValid: true, minimumAmount: 0.30 }
                },
                {
                    amount: 0.25,
                    currency: 'GBP',
                    expected: { isValid: false, minimumAmount: 0.30 }
                },
                {
                    amount: 0.50,
                    currency: 'USD',
                    expected: { isValid: true, minimumAmount: 0.50 }
                },
                {
                    amount: 0.40,
                    currency: 'USD',
                    expected: { isValid: false, minimumAmount: 0.50 }
                }
            ];

            testCases.forEach(testCase => {
                const result = service.validatePaymentAmount(testCase.amount, testCase.currency);

                expect(result.isValid).toBe(testCase.expected.isValid);
                expect(result.minimumAmount).toBe(testCase.expected.minimumAmount);
            });
        });

        it('should validate maximum payment amounts', () => {
            const testCases = [
                {
                    amount: 10000,
                    currency: 'GBP',
                    expected: { isValid: true, maximumAmount: 10000 }
                },
                {
                    amount: 15000,
                    currency: 'GBP',
                    expected: { isValid: false, maximumAmount: 10000 }
                }
            ];

            testCases.forEach(testCase => {
                const result = service.validatePaymentAmount(testCase.amount, testCase.currency);

                expect(result.isValid).toBe(testCase.expected.isValid);
                expect(result.maximumAmount).toBe(testCase.expected.maximumAmount);
            });
        });
    });

    describe('handleCurrencyChange', () => {
        it('should update user currency preferences', async () => {
            const userId = 'user-123';
            const newCurrency = 'EUR';
            const currentRegion = 'DE';

            mockInternationalizationService.updateConfiguration.mockResolvedValue();
            mockInternationalizationService.getCurrentConfiguration.mockReturnValue({
                language: 'de',
                currency: 'EUR',
                region: 'DE',
                timezone: 'Europe/Berlin',
                dateFormat: 'DD.MM.YYYY',
                timeFormat: '24h',
                units: {
                    weight: 'kg',
                    height: 'cm',
                    temperature: 'celsius'
                }
            });

            const result = await service.handleCurrencyChange(userId, newCurrency, currentRegion);

            expect(result).toMatchObject({
                success: true,
                newCurrency: 'EUR',
                exchangeRate: expect.any(Number),
                effectiveDate: expect.any(Date)
            });

            expect(mockInternationalizationService.updateConfiguration).toHaveBeenCalledWith({
                currency: newCurrency
            });
        });

        it('should validate currency compatibility with region', async () => {
            const userId = 'user-123';
            const incompatibleCurrency = 'JPY'; // Not supported in GB
            const currentRegion = 'GB';

            const result = await service.handleCurrencyChange(userId, incompatibleCurrency, currentRegion);

            expect(result).toMatchObject({
                success: false,
                error: 'Currency JPY not supported in region GB',
                supportedCurrencies: expect.arrayContaining(['GBP', 'USD', 'EUR'])
            });
        });
    });

    describe('getExchangeRateHistory', () => {
        it('should return historical exchange rates', async () => {
            const baseCurrency = 'GBP';
            const targetCurrency = 'USD';
            const days = 30;

            const mockHistory = Array.from({ length: days }, (_, i) => ({
                date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
                rate: 1.27 + (Math.random() - 0.5) * 0.1, // Simulate rate fluctuation
                source: 'Bank of England'
            }));

            jest.spyOn(service, 'fetchExchangeRateHistory').mockResolvedValue(mockHistory);

            const result = await service.getExchangeRateHistory(baseCurrency, targetCurrency, days);

            expect(result).toHaveLength(days);
            expect(result[0]).toMatchObject({
                date: expect.any(Date),
                rate: expect.any(Number),
                source: expect.any(String)
            });
        });
    });

    describe('subscription pricing localization', () => {
        it('should localize subscription prices for different regions', async () => {
            const testCases = [
                {
                    region: 'GB',
                    currency: 'GBP',
                    expectedBasicPrice: 9.99,
                    expectedPremiumPrice: 19.99
                },
                {
                    region: 'US',
                    currency: 'USD',
                    expectedBasicPrice: 12.69, // 9.99 * 1.27
                    expectedPremiumPrice: 25.39 // 19.99 * 1.27
                },
                {
                    region: 'DE',
                    currency: 'EUR',
                    expectedBasicPrice: 11.69, // 9.99 * 1.17
                    expectedPremiumPrice: 23.39 // 19.99 * 1.17
                }
            ];

            for (const testCase of testCases) {
                const pricing = await service.getLocalizedSubscriptionPricing(
                    testCase.region,
                    testCase.currency
                );

                const basicTier = pricing.find(tier => tier.tierName === 'Basic');
                const premiumTier = pricing.find(tier => tier.tierName === 'Premium');

                expect(basicTier?.monthlyPrice).toBeCloseTo(testCase.expectedBasicPrice, 2);
                expect(premiumTier?.monthlyPrice).toBeCloseTo(testCase.expectedPremiumPrice, 2);
                expect(basicTier?.currency).toBe(testCase.currency);
            }
        });

        it('should include regional tax calculations in pricing', async () => {
            const region = 'GB';
            const currency = 'GBP';

            const pricing = await service.getLocalizedSubscriptionPricing(region, currency);

            const basicTier = pricing.find(tier => tier.tierName === 'Basic');

            expect(basicTier).toMatchObject({
                monthlyPrice: expect.any(Number),
                monthlyPriceWithTax: expect.any(Number),
                taxRate: 0.20,
                taxAmount: expect.any(Number),
                currency: 'GBP'
            });

            expect(basicTier!.monthlyPriceWithTax).toBeGreaterThan(basicTier!.monthlyPrice);
        });
    });

    describe('payment method validation', () => {
        it('should validate payment methods by region', () => {
            const testCases = [
                {
                    region: 'GB',
                    paymentMethod: 'card',
                    expected: { isSupported: true, processingFee: 0.029 }
                },
                {
                    region: 'DE',
                    paymentMethod: 'sepa',
                    expected: { isSupported: true, processingFee: 0.008 }
                },
                {
                    region: 'US',
                    paymentMethod: 'ach',
                    expected: { isSupported: true, processingFee: 0.008 }
                },
                {
                    region: 'GB',
                    paymentMethod: 'alipay',
                    expected: { isSupported: false, reason: 'Not available in region' }
                }
            ];

            testCases.forEach(testCase => {
                const result = service.validatePaymentMethod(testCase.region, testCase.paymentMethod);

                expect(result.isSupported).toBe(testCase.expected.isSupported);
                if (testCase.expected.isSupported) {
                    expect(result.processingFee).toBe(testCase.expected.processingFee);
                } else {
                    expect(result.reason).toBe(testCase.expected.reason);
                }
            });
        });
    });
});