/**
 * Internationalization Redux Slice
 * Manages localization state in the mobile app
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    LocalizationConfig,
    SupportedLanguage,
    SupportedCurrency,
    SupportedRegion,
    DeviceLocale
} from '../../types/internationalization';
import { internationalizationService } from '../../services/internationalizationService';

interface InternationalizationState {
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
    currentConfig: LocalizationConfig | null;
    deviceLocale: DeviceLocale | null;
    supportedLanguages: SupportedLanguage[];
    supportedCurrencies: SupportedCurrency[];
    supportedRegions: SupportedRegion[];
}

const initialState: InternationalizationState = {
    isInitialized: false,
    isLoading: false,
    error: null,
    currentConfig: null,
    deviceLocale: null,
    supportedLanguages: [],
    supportedCurrencies: [],
    supportedRegions: []
};

// Async thunks
export const initializeInternationalization = createAsyncThunk(
    'internationalization/initialize',
    async (_, { rejectWithValue }) => {
        try {
            await internationalizationService.initialize();

            const currentConfig = internationalizationService.getCurrentConfiguration();
            const deviceLocale = internationalizationService.getDeviceLocale();
            const supportedLanguages = internationalizationService.getSupportedLanguages();
            const supportedCurrencies = internationalizationService.getSupportedCurrencies();
            const supportedRegions = internationalizationService.getSupportedRegions();

            return {
                currentConfig,
                deviceLocale,
                supportedLanguages,
                supportedCurrencies,
                supportedRegions
            };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Initialization failed');
        }
    }
);

export const updateLocalizationConfig = createAsyncThunk(
    'internationalization/updateConfig',
    async (updates: Partial<LocalizationConfig>, { rejectWithValue }) => {
        try {
            await internationalizationService.updateConfiguration(updates);
            const updatedConfig = internationalizationService.getCurrentConfiguration();
            return updatedConfig;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Update failed');
        }
    }
);

export const changeLanguage = createAsyncThunk(
    'internationalization/changeLanguage',
    async (languageCode: string, { rejectWithValue }) => {
        try {
            await internationalizationService.updateConfiguration({ language: languageCode });
            const updatedConfig = internationalizationService.getCurrentConfiguration();
            return updatedConfig;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Language change failed');
        }
    }
);

export const changeCurrency = createAsyncThunk(
    'internationalization/changeCurrency',
    async (currencyCode: string, { rejectWithValue }) => {
        try {
            await internationalizationService.updateConfiguration({ currency: currencyCode });
            const updatedConfig = internationalizationService.getCurrentConfiguration();
            return updatedConfig;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Currency change failed');
        }
    }
);

export const changeRegion = createAsyncThunk(
    'internationalization/changeRegion',
    async (regionCode: string, { rejectWithValue }) => {
        try {
            await internationalizationService.updateConfiguration({ region: regionCode });
            const updatedConfig = internationalizationService.getCurrentConfiguration();
            return updatedConfig;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Region change failed');
        }
    }
);

export const updateUnits = createAsyncThunk(
    'internationalization/updateUnits',
    async (units: LocalizationConfig['units'], { rejectWithValue }) => {
        try {
            await internationalizationService.updateConfiguration({ units });
            const updatedConfig = internationalizationService.getCurrentConfiguration();
            return updatedConfig;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Units update failed');
        }
    }
);

const internationalizationSlice = createSlice({
    name: 'internationalization',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setDeviceLocale: (state, action: PayloadAction<DeviceLocale>) => {
            state.deviceLocale = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            // Initialize internationalization
            .addCase(initializeInternationalization.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(initializeInternationalization.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isInitialized = true;
                state.currentConfig = action.payload.currentConfig;
                state.deviceLocale = action.payload.deviceLocale;
                state.supportedLanguages = action.payload.supportedLanguages;
                state.supportedCurrencies = action.payload.supportedCurrencies;
                state.supportedRegions = action.payload.supportedRegions;
                state.error = null;
            })
            .addCase(initializeInternationalization.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // Update localization config
            .addCase(updateLocalizationConfig.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateLocalizationConfig.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentConfig = action.payload;
                state.error = null;
            })
            .addCase(updateLocalizationConfig.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // Change language
            .addCase(changeLanguage.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(changeLanguage.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentConfig = action.payload;
                state.error = null;
            })
            .addCase(changeLanguage.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // Change currency
            .addCase(changeCurrency.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(changeCurrency.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentConfig = action.payload;
                state.error = null;
            })
            .addCase(changeCurrency.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // Change region
            .addCase(changeRegion.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(changeRegion.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentConfig = action.payload;
                state.error = null;
            })
            .addCase(changeRegion.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // Update units
            .addCase(updateUnits.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateUnits.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentConfig = action.payload;
                state.error = null;
            })
            .addCase(updateUnits.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    }
});

export const { clearError, setDeviceLocale } = internationalizationSlice.actions;

// Selectors
export const selectInternationalization = (state: { internationalization: InternationalizationState }) =>
    state.internationalization;

export const selectCurrentConfig = (state: { internationalization: InternationalizationState }) =>
    state.internationalization.currentConfig;

export const selectIsInitialized = (state: { internationalization: InternationalizationState }) =>
    state.internationalization.isInitialized;

export const selectSupportedLanguages = (state: { internationalization: InternationalizationState }) =>
    state.internationalization.supportedLanguages;

export const selectSupportedCurrencies = (state: { internationalization: InternationalizationState }) =>
    state.internationalization.supportedCurrencies;

export const selectSupportedRegions = (state: { internationalization: InternationalizationState }) =>
    state.internationalization.supportedRegions;

export const selectCurrentLanguage = (state: { internationalization: InternationalizationState }) =>
    state.internationalization.currentConfig?.language || 'en';

export const selectCurrentCurrency = (state: { internationalization: InternationalizationState }) =>
    state.internationalization.currentConfig?.currency || 'GBP';

export const selectCurrentRegion = (state: { internationalization: InternationalizationState }) =>
    state.internationalization.currentConfig?.region || 'GB';

export const selectCurrentUnits = (state: { internationalization: InternationalizationState }) =>
    state.internationalization.currentConfig?.units || {
        weight: 'kg',
        height: 'cm',
        temperature: 'celsius'
    };

export default internationalizationSlice.reducer;