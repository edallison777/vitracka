/**
 * Unit Tests for Internationalization Redux Slice
 * Tests state management for localization features
 */

import { configureStore } from '@reduxjs/toolkit';
import internationalizationReducer, {
    initializeInternationalization,
    updateLocalizationConfig,
    changeLanguage,
    changeCurrency,
    changeRegion,
    updateUnits,
    clearError,
    setDeviceLocale,
    selectCurrentConfig,
    selectIsInitialized,
    selectCurrentLanguage,
    selectCurrentCurrency,
    selectCurrentRegion,
    selectCurrentUnits
} from '../../../store/slices/internationalizationSlice';
import { internationalizationService } from '../../../services/internationalizationService';
import { LocalizationConfig, DeviceLocale } from '../../../types/internationalization';

// Mock the internationalization service
jest.mock('../../../services/internationalizationService');

const mockInternationalizationService = internationalizationService as jest.Mocked<typeof internationalizationService>;

describe('internationalizationSlice', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
        store = configureStore({
            reducer: {
                internationalization: internationalizationReducer
            }
        });
        jest.clearAllMocks();
    });

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const state = store.getState().internationalization;

            expect(state).toEqual({
                isInitialized: false,
                isLoading: false,
                error: null,
                currentConfig: null,
                deviceLocale: null,
                supportedLanguages: [],
                supportedCurrencies: [],
                supportedRegions: []
            });
        });
    });

    describe('synchronous actions', () => {
        it('should clear error', () => {
            // First set an error
            store.dispatch({ type: 'internationalization/setError', payload: 'Test error' });

            // Then clear it
            store.dispatch(clearError());

            const state = store.getState().internationalization;
            expect(state.error).toBeNull();
        });

        it('should set device locale', () => {
            const deviceLocale: DeviceLocale = {
                languageCode: 'en',
                countryCode: 'GB',
                languageTag: 'en-GB',
                isRTL: false
            };

            store.dispatch(setDeviceLocale(deviceLocale));

            const state = store.getState().internationalization;
            expect(state.deviceLocale).toEqual(deviceLocale);
        });
    });

    describe('initializeInternationalization', () => {
        const mockConfig: LocalizationConfig = {
            language: 'en',
            currency: 'GBP',
            region: 'GB',
            timezone: 'Europe/London',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            units: {
                weight: 'kg',
                height: 'cm',
                temperature: 'celsius'
            }
        };

        const mockDeviceLocale: DeviceLocale = {
            languageCode: 'en',
            countryCode: 'GB',
            languageTag: 'en-GB',
            isRTL: false
        };

        it('should handle successful initialization', async () => {
            mockInternationalizationService.initialize.mockResolvedValue();
            mockInternationalizationService.getCurrentConfiguration.mockReturnValue(mockConfig);
            mockInternationalizationService.getDeviceLocale.mockReturnValue(mockDeviceLocale);
            mockInternationalizationService.getSupportedLanguages.mockReturnValue([
                { code: 'en', name: 'English', nativeName: 'English', rtl: false, enabled: true }
            ]);
            mockInternationalizationService.getSupportedCurrencies.mockReturnValue([
                { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, enabled: true }
            ]);
            mockInternationalizationService.getSupportedRegions.mockReturnValue([
                { code: 'GB', name: 'United Kingdom', currency: 'GBP', languages: ['en'], timezone: 'Europe/London', enabled: true }
            ]);

            await store.dispatch(initializeInternationalization());

            const state = store.getState().internationalization;
            expect(state.isInitialized).toBe(true);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
            expect(state.currentConfig).toEqual(mockConfig);
            expect(state.deviceLocale).toEqual(mockDeviceLocale);
            expect(state.supportedLanguages).toHaveLength(1);
            expect(state.supportedCurrencies).toHaveLength(1);
            expect(state.supportedRegions).toHaveLength(1);
        });

        it('should handle initialization failure', async () => {
            const errorMessage = 'Initialization failed';
            mockInternationalizationService.initialize.mockRejectedValue(new Error(errorMessage));

            await store.dispatch(initializeInternationalization());

            const state = store.getState().internationalization;
            expect(state.isInitialized).toBe(false);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(errorMessage);
        });

        it('should set loading state during initialization', () => {
            mockInternationalizationService.initialize.mockImplementation(() => new Promise(() => { })); // Never resolves

            store.dispatch(initializeInternationalization());

            const state = store.getState().internationalization;
            expect(state.isLoading).toBe(true);
            expect(state.error).toBeNull();
        });
    });

    describe('updateLocalizationConfig', () => {
        const updatedConfig: LocalizationConfig = {
            language: 'es',
            currency: 'EUR',
            region: 'ES',
            timezone: 'Europe/Madrid',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            units: {
                weight: 'kg',
                height: 'cm',
                temperature: 'celsius'
            }
        };

        it('should handle successful config update', async () => {
            mockInternationalizationService.updateConfiguration.mockResolvedValue();
            mockInternationalizationService.getCurrentConfiguration.mockReturnValue(updatedConfig);

            const updates = { language: 'es', currency: 'EUR' };
            await store.dispatch(updateLocalizationConfig(updates));

            const state = store.getState().internationalization;
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
            expect(state.currentConfig).toEqual(updatedConfig);
        });

        it('should handle config update failure', async () => {
            const errorMessage = 'Update failed';
            mockInternationalizationService.updateConfiguration.mockRejectedValue(new Error(errorMessage));

            const updates = { language: 'invalid' };
            await store.dispatch(updateLocalizationConfig(updates));

            const state = store.getState().internationalization;
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(errorMessage);
        });
    });

    describe('changeLanguage', () => {
        const updatedConfig: LocalizationConfig = {
            language: 'fr',
            currency: 'GBP',
            region: 'GB',
            timezone: 'Europe/London',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            units: {
                weight: 'kg',
                height: 'cm',
                temperature: 'celsius'
            }
        };

        it('should handle successful language change', async () => {
            mockInternationalizationService.updateConfiguration.mockResolvedValue();
            mockInternationalizationService.getCurrentConfiguration.mockReturnValue(updatedConfig);

            await store.dispatch(changeLanguage('fr'));

            const state = store.getState().internationalization;
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
            expect(state.currentConfig).toEqual(updatedConfig);
        });

        it('should handle language change failure', async () => {
            const errorMessage = 'Language change failed';
            mockInternationalizationService.updateConfiguration.mockRejectedValue(new Error(errorMessage));

            await store.dispatch(changeLanguage('invalid'));

            const state = store.getState().internationalization;
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(errorMessage);
        });
    });

    describe('changeCurrency', () => {
        const updatedConfig: LocalizationConfig = {
            language: 'en',
            currency: 'USD',
            region: 'GB',
            timezone: 'Europe/London',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            units: {
                weight: 'kg',
                height: 'cm',
                temperature: 'celsius'
            }
        };

        it('should handle successful currency change', async () => {
            mockInternationalizationService.updateConfiguration.mockResolvedValue();
            mockInternationalizationService.getCurrentConfiguration.mockReturnValue(updatedConfig);

            await store.dispatch(changeCurrency('USD'));

            const state = store.getState().internationalization;
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
            expect(state.currentConfig).toEqual(updatedConfig);
        });

        it('should handle currency change failure', async () => {
            const errorMessage = 'Currency change failed';
            mockInternationalizationService.updateConfiguration.mockRejectedValue(new Error(errorMessage));

            await store.dispatch(changeCurrency('INVALID'));

            const state = store.getState().internationalization;
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(errorMessage);
        });
    });

    describe('changeRegion', () => {
        const updatedConfig: LocalizationConfig = {
            language: 'en',
            currency: 'GBP',
            region: 'US',
            timezone: 'America/New_York',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h',
            units: {
                weight: 'lbs',
                height: 'ft',
                temperature: 'fahrenheit'
            }
        };

        it('should handle successful region change', async () => {
            mockInternationalizationService.updateConfiguration.mockResolvedValue();
            mockInternationalizationService.getCurrentConfiguration.mockReturnValue(updatedConfig);

            await store.dispatch(changeRegion('US'));

            const state = store.getState().internationalization;
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
            expect(state.currentConfig).toEqual(updatedConfig);
        });

        it('should handle region change failure', async () => {
            const errorMessage = 'Region change failed';
            mockInternationalizationService.updateConfiguration.mockRejectedValue(new Error(errorMessage));

            await store.dispatch(changeRegion('INVALID'));

            const state = store.getState().internationalization;
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(errorMessage);
        });
    });

    describe('updateUnits', () => {
        const updatedConfig: LocalizationConfig = {
            language: 'en',
            currency: 'GBP',
            region: 'GB',
            timezone: 'Europe/London',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            units: {
                weight: 'lbs',
                height: 'ft',
                temperature: 'fahrenheit'
            }
        };

        it('should handle successful units update', async () => {
            mockInternationalizationService.updateConfiguration.mockResolvedValue();
            mockInternationalizationService.getCurrentConfiguration.mockReturnValue(updatedConfig);

            const newUnits = {
                weight: 'lbs' as const,
                height: 'ft' as const,
                temperature: 'fahrenheit' as const
            };

            await store.dispatch(updateUnits(newUnits));

            const state = store.getState().internationalization;
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
            expect(state.currentConfig).toEqual(updatedConfig);
        });

        it('should handle units update failure', async () => {
            const errorMessage = 'Units update failed';
            mockInternationalizationService.updateConfiguration.mockRejectedValue(new Error(errorMessage));

            const newUnits = {
                weight: 'lbs' as const,
                height: 'ft' as const,
                temperature: 'fahrenheit' as const
            };

            await store.dispatch(updateUnits(newUnits));

            const state = store.getState().internationalization;
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe(errorMessage);
        });
    });

    describe('selectors', () => {
        const mockState = {
            internationalization: {
                isInitialized: true,
                isLoading: false,
                error: null,
                currentConfig: {
                    language: 'es',
                    currency: 'EUR',
                    region: 'ES',
                    timezone: 'Europe/Madrid',
                    dateFormat: 'DD/MM/YYYY',
                    timeFormat: '24h',
                    units: {
                        weight: 'kg' as const,
                        height: 'cm' as const,
                        temperature: 'celsius' as const
                    }
                },
                deviceLocale: null,
                supportedLanguages: [
                    { code: 'en', name: 'English', nativeName: 'English', rtl: false, enabled: true },
                    { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false, enabled: true }
                ],
                supportedCurrencies: [
                    { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, enabled: true },
                    { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, enabled: true }
                ],
                supportedRegions: [
                    { code: 'GB', name: 'United Kingdom', currency: 'GBP', languages: ['en'], timezone: 'Europe/London', enabled: true },
                    { code: 'ES', name: 'Spain', currency: 'EUR', languages: ['es'], timezone: 'Europe/Madrid', enabled: true }
                ]
            }
        };

        it('should select current config', () => {
            const result = selectCurrentConfig(mockState);
            expect(result).toEqual(mockState.internationalization.currentConfig);
        });

        it('should select is initialized', () => {
            const result = selectIsInitialized(mockState);
            expect(result).toBe(true);
        });

        it('should select current language', () => {
            const result = selectCurrentLanguage(mockState);
            expect(result).toBe('es');
        });

        it('should select current currency', () => {
            const result = selectCurrentCurrency(mockState);
            expect(result).toBe('EUR');
        });

        it('should select current region', () => {
            const result = selectCurrentRegion(mockState);
            expect(result).toBe('ES');
        });

        it('should select current units', () => {
            const result = selectCurrentUnits(mockState);
            expect(result).toEqual({
                weight: 'kg',
                height: 'cm',
                temperature: 'celsius'
            });
        });

        it('should return defaults when config is null', () => {
            const stateWithNullConfig = {
                internationalization: {
                    ...mockState.internationalization,
                    currentConfig: null
                }
            };

            expect(selectCurrentLanguage(stateWithNullConfig)).toBe('en');
            expect(selectCurrentCurrency(stateWithNullConfig)).toBe('GBP');
            expect(selectCurrentRegion(stateWithNullConfig)).toBe('GB');
            expect(selectCurrentUnits(stateWithNullConfig)).toEqual({
                weight: 'kg' as const,
                height: 'cm' as const,
                temperature: 'celsius' as const
            });
        });
    });
});