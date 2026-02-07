/**
 * Mobile Internationalization Service
 * Handles localization, currency formatting, and timezone management
 */

import * as RNLocalize from 'react-native-localize';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import {
    LocalizationConfig,
    SupportedLanguage,
    SupportedCurrency,
    SupportedRegion,
    DeviceLocale,
    CurrencyFormatOptions,
    DateTimeFormatOptions,
    NotificationScheduleOptions,
    RegionalSettings
} from '../types/internationalization';

export class MobileInternationalizationService {
    private static instance: MobileInternationalizationService;
    private currentConfig: LocalizationConfig | null = null;

    private supportedLanguages: SupportedLanguage[] = [
        { code: 'en', name: 'English', nativeName: 'English', rtl: false, enabled: true },
        { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false, enabled: true },
        { code: 'fr', name: 'French', nativeName: 'Français', rtl: false, enabled: true },
        { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false, enabled: true },
        { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false, enabled: true }
    ];

    private supportedCurrencies: SupportedCurrency[] = [
        { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, enabled: true },
        { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, enabled: true },
        { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, enabled: true },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2, enabled: true },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, enabled: true }
    ];

    private supportedRegions: SupportedRegion[] = [
        { code: 'GB', name: 'United Kingdom', currency: 'GBP', languages: ['en'], timezone: 'Europe/London', enabled: true },
        { code: 'US', name: 'United States', currency: 'USD', languages: ['en', 'es'], timezone: 'America/New_York', enabled: true },
        { code: 'CA', name: 'Canada', currency: 'CAD', languages: ['en', 'fr'], timezone: 'America/Toronto', enabled: true },
        { code: 'AU', name: 'Australia', currency: 'AUD', languages: ['en'], timezone: 'Australia/Sydney', enabled: true },
        { code: 'DE', name: 'Germany', currency: 'EUR', languages: ['de', 'en'], timezone: 'Europe/Berlin', enabled: true },
        { code: 'FR', name: 'France', currency: 'EUR', languages: ['fr', 'en'], timezone: 'Europe/Paris', enabled: true },
        { code: 'ES', name: 'Spain', currency: 'EUR', languages: ['es', 'en'], timezone: 'Europe/Madrid', enabled: true },
        { code: 'IT', name: 'Italy', currency: 'EUR', languages: ['it', 'en'], timezone: 'Europe/Rome', enabled: true }
    ];

    public static getInstance(): MobileInternationalizationService {
        if (!MobileInternationalizationService.instance) {
            MobileInternationalizationService.instance = new MobileInternationalizationService();
        }
        return MobileInternationalizationService.instance;
    }

    /**
     * Initialize internationalization with device locale detection
     */
    async initialize(): Promise<void> {
        try {
            const deviceLocale = this.getDeviceLocale();
            const savedConfig = await this.getSavedConfiguration();

            if (savedConfig) {
                await this.applyConfiguration(savedConfig);
            } else {
                // Create default configuration based on device locale
                const defaultConfig = await this.createDefaultConfiguration(deviceLocale);
                await this.applyConfiguration(defaultConfig);
            }
        } catch (error) {
            console.warn('Error initializing internationalization:', error);
            // Fall back to English/UK configuration
            const fallbackConfig: LocalizationConfig = {
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
            await this.applyConfiguration(fallbackConfig);
        }
    }

    /**
     * Get device locale information
     */
    getDeviceLocale(): DeviceLocale {
        const locales = RNLocalize.getLocales();
        const primaryLocale = locales[0];

        return {
            languageCode: primaryLocale.languageCode,
            countryCode: primaryLocale.countryCode,
            languageTag: primaryLocale.languageTag,
            isRTL: primaryLocale.isRTL
        };
    }

    /**
     * Get current localization configuration
     */
    getCurrentConfiguration(): LocalizationConfig | null {
        return this.currentConfig;
    }

    /**
     * Update user localization preferences
     */
    async updateConfiguration(updates: Partial<LocalizationConfig>): Promise<void> {
        if (!this.currentConfig) {
            throw new Error('Internationalization not initialized');
        }

        const newConfig: LocalizationConfig = {
            ...this.currentConfig,
            ...updates
        };

        // Validate the new configuration
        const validationErrors = this.validateConfiguration(newConfig);
        if (validationErrors.length > 0) {
            throw new Error(`Invalid configuration: ${validationErrors.join(', ')}`);
        }

        await this.applyConfiguration(newConfig);
        await this.saveConfiguration(newConfig);
    }

    /**
     * Get supported languages
     */
    getSupportedLanguages(): SupportedLanguage[] {
        return this.supportedLanguages.filter(lang => lang.enabled);
    }

    /**
     * Get supported currencies
     */
    getSupportedCurrencies(): SupportedCurrency[] {
        return this.supportedCurrencies.filter(curr => curr.enabled);
    }

    /**
     * Get supported regions
     */
    getSupportedRegions(): SupportedRegion[] {
        return this.supportedRegions.filter(region => region.enabled);
    }

    /**
     * Format currency amount
     */
    formatCurrency(amount: number, options?: Partial<CurrencyFormatOptions>): string {
        if (!this.currentConfig) {
            return amount.toString();
        }

        const currency = options?.currency || this.currentConfig.currency;
        const locale = options?.locale || this.currentConfig.language;

        const currencyConfig = this.supportedCurrencies.find(c => c.code === currency);
        if (!currencyConfig) {
            return amount.toString();
        }

        try {
            const formatter = new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: options?.minimumFractionDigits ?? currencyConfig.decimalPlaces,
                maximumFractionDigits: options?.maximumFractionDigits ?? currencyConfig.decimalPlaces
            });

            return formatter.format(amount);
        } catch (error) {
            console.warn('Error formatting currency:', error);
            return `${currencyConfig.symbol}${amount.toFixed(currencyConfig.decimalPlaces)}`;
        }
    }

    /**
     * Format date and time
     */
    formatDateTime(date: Date, options?: Partial<DateTimeFormatOptions>): string {
        if (!this.currentConfig) {
            return date.toLocaleDateString();
        }

        const locale = options?.locale || this.currentConfig.language;
        const timezone = options?.timezone || this.currentConfig.timezone;

        try {
            const formatter = new Intl.DateTimeFormat(locale, {
                dateStyle: options?.dateStyle || 'medium',
                timeStyle: options?.timeStyle || 'short',
                timeZone: timezone,
                hour12: options?.format24h === false
            });

            return formatter.format(date);
        } catch (error) {
            console.warn('Error formatting date/time:', error);
            return date.toLocaleDateString();
        }
    }

    /**
     * Format date only
     */
    formatDate(date: Date): string {
        if (!this.currentConfig) {
            return date.toLocaleDateString();
        }

        try {
            const formatter = new Intl.DateTimeFormat(this.currentConfig.language, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone: this.currentConfig.timezone
            });

            return formatter.format(date);
        } catch (error) {
            console.warn('Error formatting date:', error);
            return date.toLocaleDateString();
        }
    }

    /**
     * Format time only
     */
    formatTime(date: Date): string {
        if (!this.currentConfig) {
            return date.toLocaleTimeString();
        }

        try {
            const formatter = new Intl.DateTimeFormat(this.currentConfig.language, {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: this.currentConfig.timezone,
                hour12: this.currentConfig.timeFormat === '12h'
            });

            return formatter.format(date);
        } catch (error) {
            console.warn('Error formatting time:', error);
            return date.toLocaleTimeString();
        }
    }

    /**
     * Convert weight between units
     */
    convertWeight(weight: number, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs'): number {
        if (fromUnit === toUnit) {
            return weight;
        }

        if (fromUnit === 'kg' && toUnit === 'lbs') {
            return weight * 2.20462;
        } else if (fromUnit === 'lbs' && toUnit === 'kg') {
            return weight / 2.20462;
        }

        return weight;
    }

    /**
     * Convert height between units
     */
    convertHeight(height: number, fromUnit: 'cm' | 'ft', toUnit: 'cm' | 'ft'): number {
        if (fromUnit === toUnit) {
            return height;
        }

        if (fromUnit === 'cm' && toUnit === 'ft') {
            return height / 30.48;
        } else if (fromUnit === 'ft' && toUnit === 'cm') {
            return height * 30.48;
        }

        return height;
    }

    /**
     * Convert temperature between units
     */
    convertTemperature(temp: number, fromUnit: 'celsius' | 'fahrenheit', toUnit: 'celsius' | 'fahrenheit'): number {
        if (fromUnit === toUnit) {
            return temp;
        }

        if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
            return (temp * 9 / 5) + 32;
        } else if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
            return (temp - 32) * 5 / 9;
        }

        return temp;
    }

    /**
     * Get timezone offset in minutes
     */
    getTimezoneOffset(timezone?: string): number {
        const tz = timezone || this.currentConfig?.timezone || 'UTC';

        try {
            const now = new Date();
            const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
            const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: tz }));

            return (targetTime.getTime() - utc.getTime()) / 60000;
        } catch (error) {
            console.warn('Error calculating timezone offset:', error);
            return 0;
        }
    }

    /**
     * Check if current time is within quiet hours
     */
    isWithinQuietHours(quietHoursStart: string, quietHoursEnd: string): boolean {
        if (!this.currentConfig) {
            return false;
        }

        try {
            const now = new Date();
            const currentTime = this.formatTime(now);

            // Simple time comparison (assumes same day)
            const current = this.timeStringToMinutes(currentTime);
            const start = this.timeStringToMinutes(quietHoursStart);
            const end = this.timeStringToMinutes(quietHoursEnd);

            if (start <= end) {
                return current >= start && current <= end;
            } else {
                // Quiet hours span midnight
                return current >= start || current <= end;
            }
        } catch (error) {
            console.warn('Error checking quiet hours:', error);
            return false;
        }
    }

    /**
     * Get regional settings for backend API
     */
    getRegionalSettings(): RegionalSettings | null {
        if (!this.currentConfig) {
            return null;
        }

        const region = this.supportedRegions.find(r => r.code === this.currentConfig!.region);
        if (!region) {
            return null;
        }

        return {
            region: this.currentConfig.region,
            language: this.currentConfig.language,
            currency: this.currentConfig.currency,
            timezone: this.currentConfig.timezone,
            dateFormat: this.currentConfig.dateFormat,
            timeFormat: this.currentConfig.timeFormat,
            numberFormat: this.getNumberFormat(this.currentConfig.currency),
            units: this.currentConfig.units
        };
    }

    private async createDefaultConfiguration(deviceLocale: DeviceLocale): Promise<LocalizationConfig> {
        // Try to find a matching region based on country code
        let region = this.supportedRegions.find(r => r.code === deviceLocale.countryCode);

        // Fall back to language-based region matching
        if (!region) {
            region = this.supportedRegions.find(r =>
                r.languages.includes(deviceLocale.languageCode)
            );
        }

        // Final fallback to UK
        if (!region) {
            region = this.supportedRegions.find(r => r.code === 'GB')!;
        }

        // Check if the device language is supported in this region
        const language = region.languages.includes(deviceLocale.languageCode)
            ? deviceLocale.languageCode
            : region.languages[0];

        return {
            language,
            currency: region.currency,
            region: region.code,
            timezone: region.timezone,
            dateFormat: this.getDefaultDateFormat(region.code),
            timeFormat: this.getDefaultTimeFormat(region.code),
            units: this.getDefaultUnits(region.code)
        };
    }

    private async applyConfiguration(config: LocalizationConfig): Promise<void> {
        this.currentConfig = config;

        // Update i18n language
        await i18n.changeLanguage(config.language);
    }

    private async saveConfiguration(config: LocalizationConfig): Promise<void> {
        try {
            await AsyncStorage.setItem('localization-config', JSON.stringify(config));
        } catch (error) {
            console.warn('Error saving localization config:', error);
        }
    }

    private async getSavedConfiguration(): Promise<LocalizationConfig | null> {
        try {
            const saved = await AsyncStorage.getItem('localization-config');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.warn('Error loading saved localization config:', error);
            return null;
        }
    }

    private validateConfiguration(config: LocalizationConfig): string[] {
        const errors: string[] = [];

        // Validate language
        if (!this.supportedLanguages.some(lang => lang.code === config.language && lang.enabled)) {
            errors.push(`Unsupported language: ${config.language}`);
        }

        // Validate currency
        if (!this.supportedCurrencies.some(curr => curr.code === config.currency && curr.enabled)) {
            errors.push(`Unsupported currency: ${config.currency}`);
        }

        // Validate region
        if (!this.supportedRegions.some(region => region.code === config.region && region.enabled)) {
            errors.push(`Unsupported region: ${config.region}`);
        }

        return errors;
    }

    private getDefaultDateFormat(regionCode: string): string {
        const formats: Record<string, string> = {
            'US': 'MM/DD/YYYY',
            'GB': 'DD/MM/YYYY',
            'CA': 'DD/MM/YYYY',
            'AU': 'DD/MM/YYYY',
            'DE': 'DD.MM.YYYY',
            'FR': 'DD/MM/YYYY',
            'ES': 'DD/MM/YYYY',
            'IT': 'DD/MM/YYYY'
        };
        return formats[regionCode] || 'DD/MM/YYYY';
    }

    private getDefaultTimeFormat(regionCode: string): string {
        const formats: Record<string, string> = {
            'US': '12h',
            'GB': '24h',
            'CA': '12h',
            'AU': '12h',
            'DE': '24h',
            'FR': '24h',
            'ES': '24h',
            'IT': '24h'
        };
        return formats[regionCode] || '24h';
    }

    private getDefaultUnits(regionCode: string) {
        const units: Record<string, any> = {
            'US': { weight: 'lbs', height: 'ft', temperature: 'fahrenheit' },
            'GB': { weight: 'kg', height: 'cm', temperature: 'celsius' },
            'CA': { weight: 'kg', height: 'cm', temperature: 'celsius' },
            'AU': { weight: 'kg', height: 'cm', temperature: 'celsius' },
            'DE': { weight: 'kg', height: 'cm', temperature: 'celsius' },
            'FR': { weight: 'kg', height: 'cm', temperature: 'celsius' },
            'ES': { weight: 'kg', height: 'cm', temperature: 'celsius' },
            'IT': { weight: 'kg', height: 'cm', temperature: 'celsius' }
        };
        return units[regionCode] || { weight: 'kg', height: 'cm', temperature: 'celsius' };
    }

    private getNumberFormat(currency: string) {
        const formats: Record<string, any> = {
            'GBP': { decimal: '.', thousands: ',' },
            'USD': { decimal: '.', thousands: ',' },
            'EUR': { decimal: ',', thousands: '.' },
            'CAD': { decimal: '.', thousands: ',' },
            'AUD': { decimal: '.', thousands: ',' }
        };
        return formats[currency] || { decimal: '.', thousands: ',' };
    }

    private timeStringToMinutes(timeString: string): number {
        const [time, period] = timeString.split(' ');
        const [hours, minutes] = time.split(':').map(Number);

        let totalMinutes = hours * 60 + minutes;

        if (period === 'PM' && hours !== 12) {
            totalMinutes += 12 * 60;
        } else if (period === 'AM' && hours === 12) {
            totalMinutes -= 12 * 60;
        }

        return totalMinutes;
    }
}

export const internationalizationService = MobileInternationalizationService.getInstance();