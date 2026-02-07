/**
 * Enhanced Localization Framework
 * Provides comprehensive multi-language, multi-currency, and regional support
 */

import { MobileInternationalizationService } from './internationalizationService';
import i18n from '../i18n';
import {
    LocalizationConfig,
    RegionalSettings,
    NotificationScheduleOptions,
    LocalizedNotificationContent
} from '../types/internationalization';

export class LocalizationFramework {
    private static instance: LocalizationFramework;
    private internationalizationService: MobileInternationalizationService;

    private constructor() {
        this.internationalizationService = MobileInternationalizationService.getInstance();
    }

    public static getInstance(): LocalizationFramework {
        if (!LocalizationFramework.instance) {
            LocalizationFramework.instance = new LocalizationFramework();
        }
        return LocalizationFramework.instance;
    }

    /**
     * Initialize the localization framework
     */
    async initialize(): Promise<void> {
        await this.internationalizationService.initialize();

        // Set up language change listener
        i18n.on('languageChanged', (lng: string) => {
            this.onLanguageChanged(lng);
        });
    }

    /**
     * Get current localization configuration
     */
    getCurrentConfig(): LocalizationConfig | null {
        return this.internationalizationService.getCurrentConfiguration();
    }

    /**
     * Change application language
     */
    async changeLanguage(languageCode: string): Promise<void> {
        await this.internationalizationService.updateConfiguration({
            language: languageCode
        });

        // Update i18n
        await i18n.changeLanguage(languageCode);
    }

    /**
     * Change application currency
     */
    async changeCurrency(currencyCode: string): Promise<void> {
        await this.internationalizationService.updateConfiguration({
            currency: currencyCode
        });
    }

    /**
     * Change user region
     */
    async changeRegion(regionCode: string): Promise<void> {
        const regionConfig = this.internationalizationService.getSupportedRegions()
            .find(r => r.code === regionCode);

        if (!regionConfig) {
            throw new Error(`Unsupported region: ${regionCode}`);
        }

        await this.internationalizationService.updateConfiguration({
            region: regionCode,
            currency: regionConfig.currency,
            timezone: regionConfig.timezone
        });
    }

    /**
     * Format currency amount with proper localization
     */
    formatCurrency(amount: number, options?: {
        currency?: string;
        showSymbol?: boolean;
        precision?: number;
    }): string {
        const config = this.getCurrentConfig();
        if (!config) return amount.toString();

        const currency = options?.currency || config.currency;
        const precision = options?.precision ?? 2;

        return this.internationalizationService.formatCurrency(amount, {
            currency,
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
        });
    }

    /**
     * Format date with regional preferences
     */
    formatDate(date: Date, options?: {
        style?: 'full' | 'long' | 'medium' | 'short';
        includeTime?: boolean;
    }): string {
        const config = this.getCurrentConfig();
        if (!config) return date.toLocaleDateString();

        if (options?.includeTime) {
            return this.internationalizationService.formatDateTime(date, {
                dateStyle: options.style || 'medium',
                timeStyle: 'short'
            });
        }

        return this.internationalizationService.formatDate(date);
    }

    /**
     * Format time with regional preferences
     */
    formatTime(date: Date, options?: {
        style?: 'full' | 'long' | 'medium' | 'short';
        force24h?: boolean;
    }): string {
        const config = this.getCurrentConfig();
        if (!config) return date.toLocaleTimeString();

        return this.internationalizationService.formatTime(date);
    }

    /**
     * Convert weight between units based on user preferences
     */
    convertWeight(weight: number, fromUnit?: 'kg' | 'lbs', toUnit?: 'kg' | 'lbs'): number {
        const config = this.getCurrentConfig();
        const targetUnit = toUnit || config?.units.weight || 'kg';
        const sourceUnit = fromUnit || 'kg';

        return this.internationalizationService.convertWeight(weight, sourceUnit, targetUnit);
    }

    /**
     * Convert height between units based on user preferences
     */
    convertHeight(height: number, fromUnit?: 'cm' | 'ft', toUnit?: 'cm' | 'ft'): number {
        const config = this.getCurrentConfig();
        const targetUnit = toUnit || config?.units.height || 'cm';
        const sourceUnit = fromUnit || 'cm';

        return this.internationalizationService.convertHeight(height, sourceUnit, targetUnit);
    }

    /**
     * Convert temperature between units based on user preferences
     */
    convertTemperature(temp: number, fromUnit?: 'celsius' | 'fahrenheit', toUnit?: 'celsius' | 'fahrenheit'): number {
        const config = this.getCurrentConfig();
        const targetUnit = toUnit || config?.units.temperature || 'celsius';
        const sourceUnit = fromUnit || 'celsius';

        return this.internationalizationService.convertTemperature(temp, sourceUnit, targetUnit);
    }

    /**
     * Get localized string with interpolation
     */
    t(key: string, options?: any): string {
        return i18n.t(key, options);
    }

    /**
     * Get localized string with pluralization
     */
    tPlural(key: string, count: number, options?: any): string {
        return i18n.t(key, { count, ...options });
    }

    /**
     * Check if current time is within quiet hours
     */
    isWithinQuietHours(quietHoursStart?: string, quietHoursEnd?: string): boolean {
        const config = this.getCurrentConfig();
        if (!config) return false;

        const start = quietHoursStart || '22:00';
        const end = quietHoursEnd || '08:00';

        return this.internationalizationService.isWithinQuietHours(start, end);
    }

    /**
     * Get regional settings for backend communication
     */
    getRegionalSettings(): RegionalSettings | null {
        return this.internationalizationService.getRegionalSettings();
    }

    /**
     * Get supported languages for UI
     */
    getSupportedLanguages() {
        return this.internationalizationService.getSupportedLanguages();
    }

    /**
     * Get supported currencies for UI
     */
    getSupportedCurrencies() {
        return this.internationalizationService.getSupportedCurrencies();
    }

    /**
     * Get supported regions for UI
     */
    getSupportedRegions() {
        return this.internationalizationService.getSupportedRegions();
    }

    /**
     * Format number with regional preferences
     */
    formatNumber(number: number, options?: {
        style?: 'decimal' | 'percent';
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
    }): string {
        const config = this.getCurrentConfig();
        if (!config) return number.toString();

        try {
            const formatter = new Intl.NumberFormat(config.language, {
                style: options?.style || 'decimal',
                minimumFractionDigits: options?.minimumFractionDigits,
                maximumFractionDigits: options?.maximumFractionDigits
            });

            return formatter.format(number);
        } catch (error) {
            console.warn('Error formatting number:', error);
            return number.toString();
        }
    }

    /**
     * Get relative time string (e.g., "2 hours ago")
     */
    getRelativeTime(date: Date): string {
        const config = this.getCurrentConfig();
        if (!config) return date.toLocaleDateString();

        try {
            const rtf = new Intl.RelativeTimeFormat(config.language, { numeric: 'auto' });
            const now = new Date();
            const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);

            if (Math.abs(diffInSeconds) < 60) {
                return rtf.format(diffInSeconds, 'second');
            } else if (Math.abs(diffInSeconds) < 3600) {
                return rtf.format(Math.floor(diffInSeconds / 60), 'minute');
            } else if (Math.abs(diffInSeconds) < 86400) {
                return rtf.format(Math.floor(diffInSeconds / 3600), 'hour');
            } else {
                return rtf.format(Math.floor(diffInSeconds / 86400), 'day');
            }
        } catch (error) {
            console.warn('Error formatting relative time:', error);
            return date.toLocaleDateString();
        }
    }

    /**
     * Get localized unit labels
     */
    getUnitLabel(unitType: 'weight' | 'height' | 'temperature'): string {
        const config = this.getCurrentConfig();
        if (!config) return '';

        const unit = config.units[unitType];
        return this.t(`units.${unitType}.${unit}`);
    }

    /**
     * Get currency symbol
     */
    getCurrencySymbol(currencyCode?: string): string {
        const config = this.getCurrentConfig();
        const currency = currencyCode || config?.currency || 'GBP';

        return this.t(`currency.${currency}`);
    }

    /**
     * Validate user input based on regional formats
     */
    validateInput(value: string, type: 'number' | 'currency' | 'date'): {
        isValid: boolean;
        parsedValue?: any;
        error?: string;
    } {
        const config = this.getCurrentConfig();
        if (!config) {
            return { isValid: false, error: 'Localization not initialized' };
        }

        try {
            switch (type) {
                case 'number':
                    const numberValue = this.parseLocalizedNumber(value);
                    return {
                        isValid: !isNaN(numberValue),
                        parsedValue: numberValue,
                        error: isNaN(numberValue) ? 'Invalid number format' : undefined
                    };

                case 'currency':
                    const currencyValue = this.parseLocalizedCurrency(value);
                    return {
                        isValid: !isNaN(currencyValue),
                        parsedValue: currencyValue,
                        error: isNaN(currencyValue) ? 'Invalid currency format' : undefined
                    };

                case 'date':
                    const dateValue = this.parseLocalizedDate(value);
                    return {
                        isValid: dateValue instanceof Date && !isNaN(dateValue.getTime()),
                        parsedValue: dateValue,
                        error: !(dateValue instanceof Date) || isNaN(dateValue.getTime()) ? 'Invalid date format' : undefined
                    };

                default:
                    return { isValid: false, error: 'Unknown validation type' };
            }
        } catch (error) {
            return { isValid: false, error: (error as Error).message };
        }
    }

    /**
     * Handle language change events
     */
    private onLanguageChanged(languageCode: string): void {
        // Update any language-dependent UI elements
        console.log(`Language changed to: ${languageCode}`);

        // Emit custom event for components to listen to
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('localizationChanged', {
                detail: { language: languageCode }
            }));
        }
    }

    /**
     * Parse localized number string
     */
    private parseLocalizedNumber(value: string): number {
        const config = this.getCurrentConfig();
        if (!config) return parseFloat(value);

        // Remove thousands separators and replace decimal separator
        const cleanValue = value
            .replace(new RegExp(`\\${config.currency === 'EUR' ? '.' : ','}`, 'g'), '') // Remove thousands
            .replace(config.currency === 'EUR' ? ',' : '.', '.'); // Normalize decimal

        return parseFloat(cleanValue);
    }

    /**
     * Parse localized currency string
     */
    private parseLocalizedCurrency(value: string): number {
        const config = this.getCurrentConfig();
        if (!config) return parseFloat(value);

        // Remove currency symbols and parse as number
        const currencySymbol = this.getCurrencySymbol();
        const cleanValue = value.replace(currencySymbol, '').trim();

        return this.parseLocalizedNumber(cleanValue);
    }

    /**
     * Parse localized date string
     */
    private parseLocalizedDate(value: string): Date {
        const config = this.getCurrentConfig();
        if (!config) return new Date(value);

        // This is a simplified implementation
        // In a real app, you'd use a library like date-fns with locale support
        try {
            return new Date(value);
        } catch (error) {
            throw new Error('Invalid date format');
        }
    }
}

// Export singleton instance
export const localizationFramework = LocalizationFramework.getInstance();