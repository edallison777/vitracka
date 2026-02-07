/**
 * Simplified Unit Tests for Mobile InternationalizationService
 * Tests core localization functionality without complex React Native dependencies
 */

import { MobileInternationalizationService } from '../../../services/internationalizationService';

// Mock AsyncStorage
const mockAsyncStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

// Mock React Native Localize
const mockRNLocalize = {
    getLocales: jest.fn(() => [
        {
            languageCode: 'en',
            countryCode: 'GB',
            languageTag: 'en-GB',
            isRTL: false
        }
    ])
};

// Mock i18n
const mockI18n = {
    changeLanguage: jest.fn().mockResolvedValue(undefined)
};

// Apply mocks
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('react-native-localize', () => mockRNLocalize);
jest.mock('react-native-device-info', () => ({}));
jest.mock('../../../i18n', () => mockI18n);

describe('MobileInternationalizationService', () => {
    let service: MobileInternationalizationService;

    beforeEach(() => {
        service = MobileInternationalizationService.getInstance();
        jest.clearAllMocks();
    });

    describe('basic functionality', () => {
        it('should return singleton instance', () => {
            const instance1 = MobileInternationalizationService.getInstance();
            const instance2 = MobileInternationalizationService.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should get device locale information', () => {
            const deviceLocale = service.getDeviceLocale();
            expect(deviceLocale).toEqual({
                languageCode: 'en',
                countryCode: 'GB',
                languageTag: 'en-GB',
                isRTL: false
            });
        });

        it('should return supported languages', () => {
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
        });

        it('should return supported currencies', () => {
            const currencies = service.getSupportedCurrencies();
            expect(currencies).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'GBP', enabled: true }),
                    expect.objectContaining({ code: 'USD', enabled: true }),
                    expect.objectContaining({ code: 'EUR', enabled: true })
                ])
            );
        });

        it('should convert weight between units', () => {
            expect(service.convertWeight(70, 'kg', 'kg')).toBe(70);
            expect(service.convertWeight(70, 'kg', 'lbs')).toBeCloseTo(154.32, 1);
            expect(service.convertWeight(154.32, 'lbs', 'kg')).toBeCloseTo(70, 1);
        });

        it('should convert height between units', () => {
            expect(service.convertHeight(180, 'cm', 'cm')).toBe(180);
            expect(service.convertHeight(180, 'cm', 'ft')).toBeCloseTo(5.91, 1);
            expect(service.convertHeight(6, 'ft', 'cm')).toBeCloseTo(182.88, 1);
        });

        it('should convert temperature between units', () => {
            expect(service.convertTemperature(20, 'celsius', 'celsius')).toBe(20);
            expect(service.convertTemperature(20, 'celsius', 'fahrenheit')).toBeCloseTo(68, 1);
            expect(service.convertTemperature(68, 'fahrenheit', 'celsius')).toBeCloseTo(20, 1);
        });
    });

    describe('initialization', () => {
        it('should initialize with fallback configuration on error', async () => {
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

    describe('currency formatting', () => {
        it('should format currency amounts', () => {
            const result = service.formatCurrency(123.45);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle formatting errors gracefully', () => {
            const result = service.formatCurrency(123.45, { currency: 'INVALID' });
            expect(typeof result).toBe('string');
        });
    });

    describe('date and time formatting', () => {
        it('should format dates', () => {
            const testDate = new Date('2024-03-15T14:30:00Z');
            const result = service.formatDate(testDate);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should format times', () => {
            const testDate = new Date('2024-03-15T14:30:00Z');
            const result = service.formatTime(testDate);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('timezone handling', () => {
        it('should get timezone offset', () => {
            const offset = service.getTimezoneOffset('Europe/London');
            expect(typeof offset).toBe('number');
        });

        it('should handle invalid timezone gracefully', () => {
            const offset = service.getTimezoneOffset('Invalid/Timezone');
            expect(offset).toBe(0);
        });
    });
});