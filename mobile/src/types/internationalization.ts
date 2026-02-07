/**
 * Mobile App Internationalization Types
 */

export interface LocalizationConfig {
    language: string;
    currency: string;
    region: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    units: {
        weight: 'kg' | 'lbs';
        height: 'cm' | 'ft';
        temperature: 'celsius' | 'fahrenheit';
    };
}

export interface SupportedLanguage {
    code: string;
    name: string;
    nativeName: string;
    rtl: boolean;
    enabled: boolean;
}

export interface SupportedCurrency {
    code: string;
    name: string;
    symbol: string;
    decimalPlaces: number;
    enabled: boolean;
}

export interface SupportedRegion {
    code: string;
    name: string;
    currency: string;
    languages: string[];
    timezone: string;
    enabled: boolean;
}

export interface DeviceLocale {
    languageCode: string;
    countryCode: string;
    languageTag: string;
    isRTL: boolean;
}

export interface CurrencyFormatOptions {
    currency: string;
    locale: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}

export interface DateTimeFormatOptions {
    locale: string;
    timezone: string;
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
    format24h?: boolean;
}

export interface NotificationScheduleOptions {
    timezone: string;
    respectQuietHours: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    language: string;
}

export interface LocalizedNotificationContent {
    title: string;
    body: string;
    actionText?: string;
    coachingStyle: string;
}

export interface RegionalSettings {
    region: string;
    language: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    numberFormat: {
        decimal: string;
        thousands: string;
    };
    units: {
        weight: 'kg' | 'lbs';
        height: 'cm' | 'ft';
        temperature: 'celsius' | 'fahrenheit';
    };
}