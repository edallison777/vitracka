/**
 * Simplified Unit Tests for Internationalization Redux Slice
 * Tests basic state management without complex async operations
 */

import internationalizationReducer, {
    clearError,
    setDeviceLocale
} from '../../../store/slices/internationalizationSlice';

describe('internationalizationSlice', () => {
    const initialState = {
        isInitialized: false,
        isLoading: false,
        error: null,
        currentConfig: null,
        deviceLocale: null,
        supportedLanguages: [],
        supportedCurrencies: [],
        supportedRegions: []
    };

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const state = internationalizationReducer(undefined, { type: 'unknown' });
            expect(state).toEqual(initialState);
        });
    });

    describe('synchronous actions', () => {
        it('should clear error', () => {
            const stateWithError = {
                ...initialState,
                error: 'Test error'
            };

            const newState = internationalizationReducer(stateWithError, clearError());
            expect(newState.error).toBeNull();
        });

        it('should set device locale', () => {
            const deviceLocale = {
                languageCode: 'en',
                countryCode: 'GB',
                languageTag: 'en-GB',
                isRTL: false
            };

            const newState = internationalizationReducer(initialState, setDeviceLocale(deviceLocale));
            expect(newState.deviceLocale).toEqual(deviceLocale);
        });
    });

    describe('error handling', () => {
        it('should handle unknown actions gracefully', () => {
            const state = internationalizationReducer(initialState, { type: 'UNKNOWN_ACTION' });
            expect(state).toEqual(initialState);
        });
    });
});