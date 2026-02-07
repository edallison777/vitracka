/**
 * Unit Tests for Mobile InternationalizationService
 * Tests localization, currency formatting, and timezone management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileInternationalizationService } from '../../../services/internationalizationService';
import { LocalizationConfig } from '../../../types/internationalization';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-localize', () => ({
    getLocales: jest.fn(() => [
        {
            languageCode: 'en',
            countryCode: 'GB',
            languageTag: 'en-GB',
            isRTL: false
        }
    ])
}));
jest.mock('react-native-device-info', () => ({}));
jest.mock('../../../i18n', () => ({
    changeLanguage: jest.fn().mockResolvedValue(undefined)
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockRNLocalize = require('react-native-localize');

describe('MobileInternationalizationService', () => {
    let service: MobileInternationalizationService;

    beforeEach(() => {
        service = MobileInternationalizationService.getInstance();
        jest.clearAllMocks();
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = MobileInternationalizationService.getInstance();
            const instance2 = MobileInternationalizationService.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('getDeviceLocale', () => {
        it('should return device locale information', () => {
            const mockLocales = [
                {
                    languageCode: 'en',
                    countryCode: 'GB',
                    languageTag: 'en-GB',
                    isRTL: false
                }
            ];

            mockRNLocalize.getLocales.mockReturnValue(mockLocales);

            const deviceLocale = service.getDeviceLocale();

            expect(deviceLocale).toEqual({
                languageCode: 'en',
                countryCode: 'GB',
                languageTag: 'en-GB',
                isRTL: false
            });
        });
    });

    describe('initialize', () => {
        it('should initialize with saved configuration', async () => {
            const savedConfig: LocalizationConfig = {
                language: 'fr',
                currency: 'EUR',
                region: 'FR',
                timezone: 'Europe/Paris',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: '24h',
                units: {
                    weight: 'kg',
                    height: 'cm',
                    temperature: 'celsius'
                }
            };

            mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedConfig));

            await service.initialize();

            const currentConfig = service.getCurrentConfiguration();
            expect(currentConfig).toEqual(savedConfig);
        });

        it('should initialize with device locale when no saved configuration', async () => {
            const mockLocales = [
                {
                    languageCode: 'de',
                    countryCode: 'DE',
                    languageTag: 'de-DE',
                    isRTL: false
                }
            ];

            mockRNLocalize.getLocales.mockReturnValue(mockLocales);
            mockAsyncStorage.getItem.mockResolvedValue(null);

            await service.initialize();

            const currentConfig = service.getCurrentConfiguration();
            expect(currentConfig).toMatchObject({
                language: 'de',
                currency: 'EUR',
                region: 'DE',
                timezone: 'Europe/Berlin'
            });
        });

        it('should fall back to English/UK on error', async () => {
            mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
            mockRNLocalize.getLocales.mockImplementation(() => {
                throw new Error('Localize error');
            });

            await service.initialize();

            const currentConfig = service.getCurrentConfiguration();
            expect(currentConfig).toMatchObject({
                language: 'en',
                currency: 'GBP',
                region: 'GB',
                timezone: 'Europe/London'
            });
        });
    });

    describe('updateConfiguration', () => {
        beforeEach(async () => {
            // Initialize with default config
            mockAsyncStorage.getItem.mockResolvedValue(null);
            mockRNLocalize.getLocales.mockReturnValue([
                { languageCode: 'en', countryCode: 'GB', languageTag: 'en-GB', isRTL: false }
            ]);
            await service.initialize();
        });

        it('should update configuration with valid changes', async () => {
            const updates = {
                language: 'es',
                currency: 'EUR'
            };

            await service.updateConfiguration(updates);

            const currentConfig = service.getCurrentConfiguration();
            expect(currentConfig).toMatchObject(updates);
            expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
                'localization-config',
                expect.stringContaining('"language":"es"')
            );
        });

        it('should throw error for invalid configuration', async () => {
            const invalidUpdates = {
                language: 'invalid-lang'
            };

            await expect(service.updateConfiguration(invalidUpdates)).rejects.toThrow(
                'Invalid configuration'
            );
        });

        it('should throw error when not initialized', async () => {
            const uninitializedService = new (MobileInternationalizationService as any)();

            await expect(uninitializedService.updateConfiguration({ language: 'es' }))
                .rejects.toThrow('Internationalization not initialized');
        });
    });

    describe('getSupportedLanguages', () => {
        it('should return only enabled languages', () => {
            const languages = service.getSupportedLanguages();

            expect(languages).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'en', enabled: true }),
                    expect.objectContaining({ code: 'es', enabled: true }),
                    expect.objectContaining({ code: 'fr', enabled: true }),
                    expect.objectContaining({ code: 'de', enabled: true }),
                    expect.objectContaining({ code: 'it', enabled: true })
                ])
            );

            expect(languages.every(lang => lang.enabled)).toBe(true);
        });
    });

    describe('getSupportedCurrencies', () => {
        it('should return only enabled currencies', () => {
            const currencies = service.getSupportedCurrencies();

            expect(currencies).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'GBP', enabled: true }),
                    expect.objectContaining({ code: 'USD', enabled: true }),
                    expect.objectContaining({ code: 'EUR', enabled: true }),
                    expect.objectContaining({ code: 'CAD', enabled: true }),
                    expect.objectContaining({ code: 'AUD', enabled: true })
                ])
            );

            expect(currencies.every(curr => curr.enabled)).toBe(true);
        });
    });

    describe('getSupportedRegions', () => {
        it('should return only enabled regions', () => {
            const regions = service.getSupportedRegions();

            expect(regions).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'GB', enabled: true }),
                    expect.objectContaining({ code: 'US', enabled: true }),
                    expect.objectContaining({ code: 'CA', enabled: true }),
                    expect.objectContaining({ code: 'AU', enabled: true }),
                    expect.objectContaining({ code: 'DE', enabled: true }),
                    expect.objectContaining({ code: 'FR', enabled: true }),
                    expect.objectContaining({ code: 'ES', enabled: true }),
                    expect.objectContaining({ code: 'IT', enabled: true })
                ])
            );

            expect(regions.every(region => region.enabled)).toBe(true);
        });
    });

    describe('formatCurrency', () => {
        beforeEach(async () => {
            mockAsyncStorage.getItem.mockResolvedValue(null);
            mockRNLocalize.getLocales.mockReturnValue([
                { languageCode: 'en', countryCode: 'GB', languageTag: 'en-GB', isRTL: false }
            ]);
            await service.initialize();
        });

        it('should format currency using current configuration', () => {
            const formatted = service.formatCurrency(123.45);
            expect(formatted).toMatch(/£.*123\.45/);
        });

        it('should format currency with custom options', () => {
            const formatted = service.formatCurrency(123.45, {
                currency: 'USD',
                locale: 'en-US'
            });
            expect(formatted).toMatch(/\$.*123\.45/);
        });

        it('should return string when configuration not available', () => {
            const uninitializedService = new (MobileInternationalizationService as any)();
            const result = uninitializedService.formatCurrency(123.45);
            expect(result).toBe('123.45');
        });

        it('should handle formatting errors gracefully', () => {
            const formatted = service.formatCurrency(123.45, {
                currency: 'INVALID'
            });
            expect(typeof formatted).toBe('string');
        });
    });

    describe('formatDateTime', () => {
        beforeEach(async () => {
            mockAsyncStorage.getItem.mockResolvedValue(null);
            mockRNLocalize.getLocales.mockReturnValue([
                { languageCode: 'en', countryCode: 'GB', languageTag: 'en-GB', isRTL: false }
            ]);
            await service.initialize();
        });

        it('should format date and time using current configuration', () => {
            const testDate = new Date('2024-03-15T14:30:00Z');
            const formatted = service.formatDateTime(testDate);

            expect(typeof formatted).toBe('string');
            expect(formatted.length).toBeGreaterThan(0);
        });

        it('should format with custom options', () => {
            const testDate = new Date('2024-03-15T14:30:00Z');
            const formatted = service.formatDateTime(testDate, {
                locale: 'de-DE',
                timezone: 'Europe/Berlin',
                dateStyle: 'short',
                timeStyle: 'short'
            });

            expect(typeof formatted).toBe('string');
            expect(formatted.length).toBeGreaterThan(0);
        });

        it('should handle formatting errors gracefully', () => {
            const testDate = new Date('2024-03-15T14:30:00Z');
            const formatted = service.formatDateTime(testDate, {
                timezone: 'Invalid/Timezone'
            });

            expect(typeof formatted).toBe('string');
        });
    });

    describe('formatDate', () => {
        beforeEach(async () => {
            mockAsyncStorage.getItem.mockResolvedValue(null);
            mockRNLocalize.getLocales.mockReturnValue([
                { languageCode: 'en', countryCode: 'GB', languageTag: 'en-GB', isRTL: false }
            ]);
            await service.initialize();
        });

        it('should format date using current configuration', () => {
            const testDate = new Date('2024-03-15T14:30:00Z');
            const formatted = service.formatDate(testDate);

            expect(typeof formatted).toBe('string');
            expect(formatted).toMatch(/15\/03\/2024/);
        });
    });

    describe('formatTime', () => {
        beforeEach(async () => {
            mockAsyncStorage.getItem.mockResolvedValue(null);
            mockRNLocalize.getLocales.mockReturnValue([
                { languageCode: 'en', countryCode: 'GB', languageTag: 'en-GB', isRTL: false }
            ]);
            await service.initialize();
        });

        it('should format time using current configuration', () => {
            const testDate = new Date('2024-03-15T14:30:00Z');
            const formatted = service.formatTime(testDate);

            expect(typeof formatted).toBe('string');
            expect(formatted).toMatch(/14:30/);
        });
    });

    describe('convertWeight', () => {
        it('should return same value for same units', () => {
            const result = service.convertWeight(70, 'kg', 'kg');
            expect(result).toBe(70);
        });

        it('should convert kg to lbs', () => {
            const result = service.convertWeight(70, 'kg', 'lbs');
            expect(result).toBeCloseTo(154.32, 1);
        });

        it('should convert lbs to kg', () => {
            const result = service.convertWeight(154.32, 'lbs', 'kg');
            expect(result).toBeCloseTo(70, 1);
        });
    });

    describe('convertHeight', () => {
        it('should return same value for same units', () => {
            const result = service.convertHeight(180, 'cm', 'cm');
            expect(result).toBe(180);
        });

        it('should convert cm to ft', () => {
            const result = service.convertHeight(180, 'cm', 'ft');
            expect(result).toBeCloseTo(5.91, 1);
        });

        it('should convert ft to cm', () => {
            const result = service.convertHeight(6, 'ft', 'cm');
            expect(result).toBeCloseTo(182.88, 1);
        });
    });

    describe('convertTemperature', () => {
        it('should return same value for same units', () => {
            const result = service.convertTemperature(20, 'celsius', 'celsius');
            expect(result).toBe(20);
        });

        it('should convert celsius to fahrenheit', () => {
            const result = service.convertTemperature(20, 'celsius', 'fahrenheit');
            expect(result).toBeCloseTo(68, 1);
        });

        it('should convert fahrenheit to celsius', () => {
            const result = service.convertTemperature(68, 'fahrenheit', 'celsius');
            expect(result).toBeCloseTo(20, 1);
        });
    });

    describe('getTimezoneOffset', () => {
        it('should return timezone offset in minutes', () => {
            const offset = service.getTimezoneOffset('Europe/London');
            expect(typeof offset).toBe('number');
        });

        it('should handle invalid timezone gracefully', () => {
            const offset = service.getTimezoneOffset('Invalid/Timezone');
            expect(offset).toBe(0);
        });
    });

    describe('isWithinQuietHours', () => {
        beforeEach(async () => {
            mockAsyncStorage.getItem.mockResolvedValue(null);
            mockRNLocalize.getLocales.mockReturnValue([
                { languageCode: 'en', countryCode: 'GB', languageTag: 'en-GB', isRTL: false }
            ]);
            await service.initialize();
        });

        it('should return false when not initialized', () => {
            const uninitializedService = new (MobileInternationalizationService as any)();
            const result = uninitializedService.isWithinQuietHours('22:00', '08:00');
            expect(result).toBe(false);
        });

        it('should handle quiet hours calculation', () => {
            // Mock current time to be within quiet hours
            const originalDate = Date;
            const mockDate = jest.fn(() => new Date('2024-03-15T23:00:00Z'));
            global.Date = mockDate as any;

            const result = service.isWithinQuietHours('22:00', '08:00');
            expect(typeof result).toBe('boolean');

            global.Date = originalDate;
        });
    });

    describe('getRegionalSettings', () => {
        beforeEach(async () => {
            mockAsyncStorage.getItem.mockResolvedValue(null);
            mockRNLocalize.getLocales.mockReturnValue([
                { languageCode: 'en', countryCode: 'GB', languageTag: 'en-GB', isRTL: false }
            ]);
            await service.initialize();
        });

        it('should return regional settings for backend API', () => {
            const settings = service.getRegionalSettings();

            expect(settings).toMatchObject({
                region: 'GB',
                language: 'en',
                currency: 'GBP',
                timezone: 'Europe/London',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: '24h',
                numberFormat: {
                    decimal: '.',
                    thousands: ','
                },
                units: {
                    weight: 'kg',
                    height: 'cm',
                    temperature: 'celsius'
                }
            });
        });

        it('should return null when not initialized', () => {
            const uninitializedService = new (MobileInternationalizationService as any)();
            const result = uninitializedService.getRegionalSettings();
            expect(result).toBeNull();
        });
    });
});