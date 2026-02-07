/**
 * Internationalization and Localization Types
 * Supports multi-language, multi-currency, and regional compliance
 */

export interface LocalizationConfig {
    id: string;
    region: string;
    language: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    numberFormat: {
        decimal: string;
        thousands: string;
        currency: {
            symbol: string;
            position: 'before' | 'after';
        };
    };
    complianceRequirements: string[];
    dataResidencyRegion: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SupportedLanguage {
    code: string; // ISO 639-1 language code
    name: string;
    nativeName: string;
    rtl: boolean; // Right-to-left text direction
    enabled: boolean;
}

export interface SupportedCurrency {
    code: string; // ISO 4217 currency code
    name: string;
    symbol: string;
    decimalPlaces: number;
    enabled: boolean;
    exchangeRate?: number; // Relative to base currency (GBP)
}

export interface SupportedRegion {
    code: string; // ISO 3166-1 alpha-2 country code
    name: string;
    currency: string;
    languages: string[];
    timezone: string;
    complianceRequirements: string[];
    dataResidencyRegion: string;
    enabled: boolean;
}

export interface UserLocalizationPreferences {
    userId: string;
    language: string;
    currency: string;
    timezone: string;
    region: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
    units: {
        weight: 'kg' | 'lbs';
        height: 'cm' | 'ft';
        temperature: 'celsius' | 'fahrenheit';
    };
    notifications: {
        language: string;
        timezone: string;
        respectQuietHours: boolean;
        quietHoursStart: string; // HH:MM format
        quietHoursEnd: string; // HH:MM format
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface LocalizedContent {
    id: string;
    contentKey: string;
    language: string;
    content: string;
    contentType: 'text' | 'html' | 'markdown';
    category: 'ui' | 'coaching' | 'safety' | 'medical' | 'legal';
    version: number;
    approved: boolean;
    approvedBy?: string;
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ComplianceRequirement {
    code: string; // e.g., 'GDPR', 'CCPA', 'HIPAA'
    name: string;
    description: string;
    applicableRegions: string[];
    dataRetentionPeriod: number; // in days
    requiresExplicitConsent: boolean;
    allowsDataPortability: boolean;
    requiresDataDeletion: boolean;
    auditLogRetention: number; // in days
    encryptionRequired: boolean;
    crossBorderTransferRestrictions: boolean;
    enabled: boolean;
}

export interface DataResidencyRule {
    id: string;
    region: string;
    complianceRequirement: string;
    dataTypes: string[]; // e.g., ['personal_data', 'health_data', 'financial_data']
    storageRegion: string;
    backupRegions: string[];
    encryptionRequired: boolean;
    crossBorderTransferAllowed: boolean;
    auditRequired: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CurrencyExchangeRate {
    id: string;
    baseCurrency: string; // GBP
    targetCurrency: string;
    rate: number;
    source: string; // e.g., 'ECB', 'Bank of England'
    timestamp: Date;
    validUntil: Date;
}

export interface TimeZoneInfo {
    code: string; // IANA timezone identifier
    name: string;
    offset: string; // e.g., '+00:00', '-05:00'
    dstOffset?: string; // Daylight saving time offset
    regions: string[];
}

export interface LocalizedNotification {
    id: string;
    userId: string;
    templateKey: string;
    language: string;
    timezone: string;
    scheduledFor: Date;
    localScheduledFor: Date; // Converted to user's timezone
    content: {
        title: string;
        body: string;
        actionText?: string;
    };
    metadata: {
        coachingStyle: string;
        culturalContext: string;
        complianceNotes?: string;
    };
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    createdAt: Date;
    sentAt?: Date;
}

export interface RegionalPricingTier {
    id: string;
    region: string;
    currency: string;
    tierName: string;
    monthlyPrice: number;
    yearlyPrice: number;
    features: string[];
    localizedDescription: string;
    taxRate: number;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Request/Response types for API endpoints
export interface LocalizationConfigRequest {
    region: string;
    language: string;
    currency: string;
    timezone: string;
}

export interface LocalizationConfigResponse {
    config: LocalizationConfig;
    supportedLanguages: SupportedLanguage[];
    supportedCurrencies: SupportedCurrency[];
    supportedRegions: SupportedRegion[];
    complianceRequirements: ComplianceRequirement[];
}

export interface UserPreferencesUpdateRequest {
    language?: string;
    currency?: string;
    timezone?: string;
    region?: string;
    dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat?: '12h' | '24h';
    units?: {
        weight?: 'kg' | 'lbs';
        height?: 'cm' | 'ft';
        temperature?: 'celsius' | 'fahrenheit';
    };
    notifications?: {
        language?: string;
        timezone?: string;
        respectQuietHours?: boolean;
        quietHoursStart?: string;
        quietHoursEnd?: string;
    };
}

export interface ContentTranslationRequest {
    contentKey: string;
    sourceLanguage: string;
    targetLanguages: string[];
    contentType: 'text' | 'html' | 'markdown';
    category: 'ui' | 'coaching' | 'safety' | 'medical' | 'legal';
}

export interface ComplianceAuditEvent {
    id: string;
    userId: string;
    eventType: string;
    region: string;
    complianceRequirement: string;
    dataTypes: string[];
    action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'transfer';
    metadata: {
        sourceRegion?: string;
        targetRegion?: string;
        dataSize?: number;
        encryptionUsed: boolean;
        userConsent: boolean;
        legalBasis?: string;
    };
    timestamp: Date;
    auditTrail: string;
}