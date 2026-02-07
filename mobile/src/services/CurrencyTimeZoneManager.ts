/**
 * Currency and Time Zone Management Service
 * Handles real-time currency conversion and timezone-aware operations
 */

import { MobileInternationalizationService } from './internationalizationService';
import {
    LocalizationConfig,
    SupportedCurrency,
    SupportedRegion
} from '../types/internationalization';

interface ExchangeRate {
    from: string;
    to: string;
    rate: number;
    timestamp: Date;
    source: string;
}

interface TimezoneInfo {
    timezone: string;
    offset: number;
    isDST: boolean;
    abbreviation: string;
}

export class CurrencyTimeZoneManager {
    private static instance: CurrencyTimeZoneManager;
    private internationalizationService: MobileInternationalizationService;
    private exchangeRates: Map<string, ExchangeRate> = new Map();
    private lastRateUpdate: Date | null = null;
    private rateUpdateInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.internationalizationService = MobileInternationalizationService.getInstance();
    }

    public static getInstance(): CurrencyTimeZoneManager {
        if (!CurrencyTimeZoneManager.instance) {
            CurrencyTimeZoneManager.instance = new CurrencyTimeZoneManager();
        }
        return CurrencyTimeZoneManager.instance;
    }

    /**
     * Initialize the currency and timezone manager
     */
    async initialize(): Promise<void> {
        await this.loadExchangeRates();
        this.startRateUpdateScheduler();
    }

    /**
     * Get current exchange rate between two currencies
     */
    getExchangeRate(fromCurrency: string, toCurrency: string): number {
        if (fromCurrency === toCurrency) return 1;

        const rateKey = `${fromCurrency}-${toCurrency}`;
        const reverseRateKey = `${toCurrency}-${fromCurrency}`;

        const directRate = this.exchangeRates.get(rateKey);
        if (directRate) {
            return directRate.rate;
        }

        const reverseRate = this.exchangeRates.get(reverseRateKey);
        if (reverseRate) {
            return 1 / reverseRate.rate;
        }

        // Fallback to base currency conversion (GBP)
        const fromToBase = this.exchangeRates.get(`${fromCurrency}-GBP`);
        const baseToTarget = this.exchangeRates.get(`GBP-${toCurrency}`);

        if (fromToBase && baseToTarget) {
            return fromToBase.rate * baseToTarget.rate;
        }

        // Default fallback rates (should be replaced with real API)
        const fallbackRates: Record<string, number> = {
            'GBP-USD': 1.27,
            'GBP-EUR': 1.17,
            'GBP-CAD': 1.71,
            'GBP-AUD': 1.91,
            'USD-EUR': 0.92,
            'USD-CAD': 1.35,
            'USD-AUD': 1.50,
            'EUR-CAD': 1.46,
            'EUR-AUD': 1.63,
            'CAD-AUD': 1.12
        };

        return fallbackRates[rateKey] || fallbackRates[reverseRateKey] ? 1 / fallbackRates[reverseRateKey] : 1;
    }

    /**
     * Convert amount between currencies
     */
    convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
        const rate = this.getExchangeRate(fromCurrency, toCurrency);
        return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Format currency with proper localization and conversion
     */
    formatCurrencyWithConversion(
        amount: number,
        originalCurrency: string,
        options?: {
            targetCurrency?: string;
            showOriginal?: boolean;
            precision?: number;
        }
    ): string {
        const config = this.internationalizationService.getCurrentConfiguration();
        const targetCurrency = options?.targetCurrency || config?.currency || 'GBP';
        const precision = options?.precision ?? 2;

        if (originalCurrency === targetCurrency) {
            return this.internationalizationService.formatCurrency(amount, {
                currency: targetCurrency,
                minimumFractionDigits: precision,
                maximumFractionDigits: precision
            });
        }

        const convertedAmount = this.convertCurrency(amount, originalCurrency, targetCurrency);
        const formattedConverted = this.internationalizationService.formatCurrency(convertedAmount, {
            currency: targetCurrency,
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
        });

        if (options?.showOriginal) {
            const formattedOriginal = this.internationalizationService.formatCurrency(amount, {
                currency: originalCurrency,
                minimumFractionDigits: precision,
                maximumFractionDigits: precision
            });
            return `${formattedConverted} (${formattedOriginal})`;
        }

        return formattedConverted;
    }

    /**
     * Get timezone information for a given timezone
     */
    getTimezoneInfo(timezone: string): TimezoneInfo {
        try {
            const now = new Date();
            const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
            const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));

            const offset = (targetTime.getTime() - utc.getTime()) / 60000; // in minutes

            // Simple DST detection (this is a simplified approach)
            const january = new Date(now.getFullYear(), 0, 1);
            const july = new Date(now.getFullYear(), 6, 1);
            const januaryOffset = this.getTimezoneOffsetForDate(january, timezone);
            const julyOffset = this.getTimezoneOffsetForDate(july, timezone);
            const isDST = offset !== Math.max(januaryOffset, julyOffset);

            return {
                timezone,
                offset,
                isDST,
                abbreviation: this.getTimezoneAbbreviation(timezone, isDST)
            };
        } catch (error) {
            console.warn('Error getting timezone info:', error);
            return {
                timezone,
                offset: 0,
                isDST: false,
                abbreviation: 'UTC'
            };
        }
    }

    /**
     * Convert date to user's timezone
     */
    convertToUserTimezone(date: Date, userTimezone?: string): Date {
        const config = this.internationalizationService.getCurrentConfiguration();
        const timezone = userTimezone || config?.timezone || 'UTC';

        try {
            const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
            const targetTime = new Date(utcTime + (this.getTimezoneInfo(timezone).offset * 60000));
            return targetTime;
        } catch (error) {
            console.warn('Error converting to user timezone:', error);
            return date;
        }
    }

    /**
     * Format date and time with timezone awareness
     */
    formatDateTimeWithTimezone(
        date: Date,
        options?: {
            timezone?: string;
            dateStyle?: 'full' | 'long' | 'medium' | 'short';
            timeStyle?: 'full' | 'long' | 'medium' | 'short';
            showTimezone?: boolean;
        }
    ): string {
        const config = this.internationalizationService.getCurrentConfiguration();
        const timezone = options?.timezone || config?.timezone || 'UTC';

        try {
            const formatter = new Intl.DateTimeFormat(config?.language || 'en', {
                dateStyle: options?.dateStyle || 'medium',
                timeStyle: options?.timeStyle || 'short',
                timeZone: timezone
            });

            let formatted = formatter.format(date);

            if (options?.showTimezone) {
                const timezoneInfo = this.getTimezoneInfo(timezone);
                formatted += ` ${timezoneInfo.abbreviation}`;
            }

            return formatted;
        } catch (error) {
            console.warn('Error formatting date with timezone:', error);
            return date.toLocaleString();
        }
    }

    /**
     * Check if it's business hours in a given timezone
     */
    isBusinessHours(
        timezone: string,
        businessStart: string = '09:00',
        businessEnd: string = '17:00'
    ): boolean {
        try {
            const now = new Date();
            const timezoneInfo = this.getTimezoneInfo(timezone);
            const localTime = new Date(now.getTime() + (timezoneInfo.offset * 60000));

            const currentHour = localTime.getHours();
            const currentMinute = localTime.getMinutes();
            const currentTimeInMinutes = currentHour * 60 + currentMinute;

            const [startHour, startMinute] = businessStart.split(':').map(Number);
            const [endHour, endMinute] = businessEnd.split(':').map(Number);
            const startTimeInMinutes = startHour * 60 + startMinute;
            const endTimeInMinutes = endHour * 60 + endMinute;

            return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
        } catch (error) {
            console.warn('Error checking business hours:', error);
            return false;
        }
    }

    /**
     * Get optimal notification time considering timezone and quiet hours
     */
    getOptimalNotificationTime(
        preferredTime: Date,
        timezone: string,
        quietHoursStart: string = '22:00',
        quietHoursEnd: string = '08:00'
    ): Date {
        const timezoneInfo = this.getTimezoneInfo(timezone);
        const localTime = new Date(preferredTime.getTime() + (timezoneInfo.offset * 60000));

        const hour = localTime.getHours();
        const [quietStart] = quietHoursStart.split(':').map(Number);
        const [quietEnd] = quietHoursEnd.split(':').map(Number);

        // Check if time is within quiet hours
        const isInQuietHours = quietStart > quietEnd
            ? (hour >= quietStart || hour < quietEnd)  // Spans midnight
            : (hour >= quietStart && hour < quietEnd); // Same day

        if (!isInQuietHours) {
            return preferredTime;
        }

        // Move to end of quiet hours
        const adjustedTime = new Date(localTime);
        adjustedTime.setHours(quietEnd, 0, 0, 0);

        // If quiet hours end tomorrow, add a day
        if (quietStart > quietEnd && hour >= quietStart) {
            adjustedTime.setDate(adjustedTime.getDate() + 1);
        }

        // Convert back to UTC
        return new Date(adjustedTime.getTime() - (timezoneInfo.offset * 60000));
    }

    /**
     * Get currency conversion history (mock implementation)
     */
    async getCurrencyHistory(
        fromCurrency: string,
        toCurrency: string,
        days: number = 30
    ): Promise<Array<{ date: Date; rate: number }>> {
        // This would typically fetch from a real API
        const history: Array<{ date: Date; rate: number }> = [];
        const baseRate = this.getExchangeRate(fromCurrency, toCurrency);

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            // Simulate rate fluctuation (±5%)
            const fluctuation = (Math.random() - 0.5) * 0.1;
            const rate = baseRate * (1 + fluctuation);

            history.push({ date, rate });
        }

        return history;
    }

    /**
     * Load exchange rates (mock implementation)
     */
    private async loadExchangeRates(): Promise<void> {
        // In a real implementation, this would fetch from a currency API
        const mockRates: ExchangeRate[] = [
            { from: 'GBP', to: 'USD', rate: 1.27, timestamp: new Date(), source: 'mock' },
            { from: 'GBP', to: 'EUR', rate: 1.17, timestamp: new Date(), source: 'mock' },
            { from: 'GBP', to: 'CAD', rate: 1.71, timestamp: new Date(), source: 'mock' },
            { from: 'GBP', to: 'AUD', rate: 1.91, timestamp: new Date(), source: 'mock' },
            { from: 'USD', to: 'EUR', rate: 0.92, timestamp: new Date(), source: 'mock' },
            { from: 'USD', to: 'CAD', rate: 1.35, timestamp: new Date(), source: 'mock' },
            { from: 'USD', to: 'AUD', rate: 1.50, timestamp: new Date(), source: 'mock' },
            { from: 'EUR', to: 'CAD', rate: 1.46, timestamp: new Date(), source: 'mock' },
            { from: 'EUR', to: 'AUD', rate: 1.63, timestamp: new Date(), source: 'mock' },
            { from: 'CAD', to: 'AUD', rate: 1.12, timestamp: new Date(), source: 'mock' }
        ];

        mockRates.forEach(rate => {
            this.exchangeRates.set(`${rate.from}-${rate.to}`, rate);
        });

        this.lastRateUpdate = new Date();
    }

    /**
     * Start automatic rate update scheduler
     */
    private startRateUpdateScheduler(): void {
        // Update rates every hour
        this.rateUpdateInterval = setInterval(async () => {
            await this.loadExchangeRates();
        }, 60 * 60 * 1000);
    }

    /**
     * Stop automatic rate update scheduler
     */
    public stopRateUpdateScheduler(): void {
        if (this.rateUpdateInterval) {
            clearInterval(this.rateUpdateInterval);
            this.rateUpdateInterval = null;
        }
    }

    /**
     * Get timezone offset for a specific date
     */
    private getTimezoneOffsetForDate(date: Date, timezone: string): number {
        try {
            const utc = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
            const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
            return (targetTime.getTime() - utc.getTime()) / 60000;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get timezone abbreviation
     */
    private getTimezoneAbbreviation(timezone: string, isDST: boolean): string {
        const abbreviations: Record<string, { standard: string; dst: string }> = {
            'Europe/London': { standard: 'GMT', dst: 'BST' },
            'America/New_York': { standard: 'EST', dst: 'EDT' },
            'America/Los_Angeles': { standard: 'PST', dst: 'PDT' },
            'Europe/Berlin': { standard: 'CET', dst: 'CEST' },
            'Europe/Paris': { standard: 'CET', dst: 'CEST' },
            'Europe/Madrid': { standard: 'CET', dst: 'CEST' },
            'Europe/Rome': { standard: 'CET', dst: 'CEST' },
            'Australia/Sydney': { standard: 'AEST', dst: 'AEDT' },
            'America/Toronto': { standard: 'EST', dst: 'EDT' },
            'Asia/Tokyo': { standard: 'JST', dst: 'JST' }
        };

        const abbr = abbreviations[timezone];
        if (abbr) {
            return isDST ? abbr.dst : abbr.standard;
        }

        return 'UTC';
    }
}

// Export singleton instance
export const currencyTimeZoneManager = CurrencyTimeZoneManager.getInstance();