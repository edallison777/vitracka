/**
 * Internationalization Service
 * Handles multi-language, multi-currency, and regional compliance features
 */

import {
    LocalizationConfig,
    SupportedLanguage,
    SupportedCurrency,
    SupportedRegion,
    UserLocalizationPreferences,
    LocalizedContent,
    ComplianceRequirement,
    DataResidencyRule,
    CurrencyExchangeRate,
    TimeZoneInfo,
    LocalizedNotification,
    RegionalPricingTier,
    ComplianceAuditEvent
} from '../types/internationalization';

export class InternationalizationService {
    private supportedLanguages: SupportedLanguage[] = [
        { code: 'en', name: 'English', nativeName: 'English', rtl: false, enabled: true },
        { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false, enabled: true },
        { code: 'fr', name: 'French', nativeName: 'Français', rtl: false, enabled: true },
        { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false, enabled: true },
        { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false, enabled: true },
        { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false, enabled: false },
        { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', rtl: false, enabled: false },
        { code: 'sv', name: 'Swedish', nativeName: 'Svenska', rtl: false, enabled: false }
    ];

    private supportedCurrencies: SupportedCurrency[] = [
        { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, enabled: true, exchangeRate: 1.0 },
        { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, enabled: true, exchangeRate: 1.27 },
        { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, enabled: true, exchangeRate: 1.17 },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2, enabled: true, exchangeRate: 1.71 },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, enabled: true, exchangeRate: 1.91 },
        { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2, enabled: false, exchangeRate: 1.13 },
        { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimalPlaces: 2, enabled: false, exchangeRate: 13.42 }
    ];

    private supportedRegions: SupportedRegion[] = [
        {
            code: 'GB',
            name: 'United Kingdom',
            currency: 'GBP',
            languages: ['en'],
            timezone: 'Europe/London',
            complianceRequirements: ['GDPR', 'UK_GDPR'],
            dataResidencyRegion: 'eu-west-2',
            enabled: true
        },
        {
            code: 'US',
            name: 'United States',
            currency: 'USD',
            languages: ['en', 'es'],
            timezone: 'America/New_York',
            complianceRequirements: ['CCPA', 'HIPAA'],
            dataResidencyRegion: 'us-east-1',
            enabled: true
        },
        {
            code: 'CA',
            name: 'Canada',
            currency: 'CAD',
            languages: ['en', 'fr'],
            timezone: 'America/Toronto',
            complianceRequirements: ['PIPEDA'],
            dataResidencyRegion: 'us-east-1',
            enabled: true
        },
        {
            code: 'AU',
            name: 'Australia',
            currency: 'AUD',
            languages: ['en'],
            timezone: 'Australia/Sydney',
            complianceRequirements: ['Privacy_Act'],
            dataResidencyRegion: 'ap-southeast-2',
            enabled: true
        },
        {
            code: 'DE',
            name: 'Germany',
            currency: 'EUR',
            languages: ['de', 'en'],
            timezone: 'Europe/Berlin',
            complianceRequirements: ['GDPR'],
            dataResidencyRegion: 'eu-west-2',
            enabled: true
        },
        {
            code: 'FR',
            name: 'France',
            currency: 'EUR',
            languages: ['fr', 'en'],
            timezone: 'Europe/Paris',
            complianceRequirements: ['GDPR'],
            dataResidencyRegion: 'eu-west-2',
            enabled: true
        },
        {
            code: 'ES',
            name: 'Spain',
            currency: 'EUR',
            languages: ['es', 'en'],
            timezone: 'Europe/Madrid',
            complianceRequirements: ['GDPR'],
            dataResidencyRegion: 'eu-west-2',
            enabled: true
        },
        {
            code: 'IT',
            name: 'Italy',
            currency: 'EUR',
            languages: ['it', 'en'],
            timezone: 'Europe/Rome',
            complianceRequirements: ['GDPR'],
            dataResidencyRegion: 'eu-west-2',
            enabled: true
        }
    ];

    private complianceRequirements: ComplianceRequirement[] = [
        {
            code: 'GDPR',
            name: 'General Data Protection Regulation',
            description: 'EU data protection regulation',
            applicableRegions: ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE'],
            dataRetentionPeriod: 2555, // 7 years
            requiresExplicitConsent: true,
            allowsDataPortability: true,
            requiresDataDeletion: true,
            auditLogRetention: 2555,
            encryptionRequired: true,
            crossBorderTransferRestrictions: true,
            enabled: true
        },
        {
            code: 'CCPA',
            name: 'California Consumer Privacy Act',
            description: 'California state privacy law',
            applicableRegions: ['US'],
            dataRetentionPeriod: 1825, // 5 years
            requiresExplicitConsent: false,
            allowsDataPortability: true,
            requiresDataDeletion: true,
            auditLogRetention: 1825,
            encryptionRequired: true,
            crossBorderTransferRestrictions: false,
            enabled: true
        },
        {
            code: 'HIPAA',
            name: 'Health Insurance Portability and Accountability Act',
            description: 'US healthcare data protection law',
            applicableRegions: ['US'],
            dataRetentionPeriod: 2190, // 6 years
            requiresExplicitConsent: true,
            allowsDataPortability: false,
            requiresDataDeletion: false,
            auditLogRetention: 2190,
            encryptionRequired: true,
            crossBorderTransferRestrictions: true,
            enabled: true
        },
        {
            code: 'PIPEDA',
            name: 'Personal Information Protection and Electronic Documents Act',
            description: 'Canadian federal privacy law',
            applicableRegions: ['CA'],
            dataRetentionPeriod: 1825, // 5 years
            requiresExplicitConsent: true,
            allowsDataPortability: true,
            requiresDataDeletion: true,
            auditLogRetention: 1825,
            encryptionRequired: true,
            crossBorderTransferRestrictions: false,
            enabled: true
        },
        {
            code: 'Privacy_Act',
            name: 'Privacy Act 1988',
            description: 'Australian privacy legislation',
            applicableRegions: ['AU'],
            dataRetentionPeriod: 1825, // 5 years
            requiresExplicitConsent: true,
            allowsDataPortability: true,
            requiresDataDeletion: true,
            auditLogRetention: 1825,
            encryptionRequired: true,
            crossBorderTransferRestrictions: false,
            enabled: true
        }
    ];

    /**
     * Get localization configuration for a region
     */
    async getLocalizationConfig(region: string, language?: string): Promise<LocalizationConfig> {
        const regionConfig = this.supportedRegions.find(r => r.code === region);
        if (!regionConfig) {
            throw new Error(`Unsupported region: ${region}`);
        }

        const selectedLanguage = language || regionConfig.languages[0];
        const currency = regionConfig.currency;
        const timezone = regionConfig.timezone;

        return {
            id: `${region}-${selectedLanguage}-${currency}`,
            region,
            language: selectedLanguage,
            currency,
            timezone,
            dateFormat: this.getDateFormat(region),
            timeFormat: this.getTimeFormat(region),
            numberFormat: this.getNumberFormat(currency),
            complianceRequirements: regionConfig.complianceRequirements,
            dataResidencyRegion: regionConfig.dataResidencyRegion,
            createdAt: new Date(),
            updatedAt: new Date()
        };
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
     * Get compliance requirements for a region
     */
    getComplianceRequirements(region: string): ComplianceRequirement[] {
        const regionConfig = this.supportedRegions.find(r => r.code === region);
        if (!regionConfig) {
            return [];
        }

        return this.complianceRequirements.filter(req =>
            req.applicableRegions.includes(region) && req.enabled
        );
    }

    /**
     * Convert currency amount
     */
    async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
        if (fromCurrency === toCurrency) {
            return amount;
        }

        const fromRate = this.supportedCurrencies.find(c => c.code === fromCurrency)?.exchangeRate || 1;
        const toRate = this.supportedCurrencies.find(c => c.code === toCurrency)?.exchangeRate || 1;

        // Convert to base currency (GBP) then to target currency
        const gbpAmount = amount / fromRate;
        return gbpAmount * toRate;
    }

    /**
     * Format currency amount for display
     */
    formatCurrency(amount: number, currency: string, language: string): string {
        const currencyConfig = this.supportedCurrencies.find(c => c.code === currency);
        if (!currencyConfig) {
            return amount.toString();
        }

        const formatter = new Intl.NumberFormat(language, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: currencyConfig.decimalPlaces,
            maximumFractionDigits: currencyConfig.decimalPlaces
        });

        return formatter.format(amount);
    }

    /**
     * Format date for region
     */
    formatDate(date: Date, region: string, language: string): string {
        const formatter = new Intl.DateTimeFormat(language, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: this.getTimezone(region)
        });

        return formatter.format(date);
    }

    /**
     * Format time for region
     */
    formatTime(date: Date, region: string, language: string, format24h: boolean = false): string {
        const formatter = new Intl.DateTimeFormat(language, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: !format24h,
            timeZone: this.getTimezone(region)
        });

        return formatter.format(date);
    }

    /**
     * Convert time to user's timezone
     */
    convertToUserTimezone(date: Date, userTimezone: string): Date {
        // Create a new date in the user's timezone
        const userDate = new Date(date.toLocaleString('en-US', { timeZone: userTimezone }));
        return userDate;
    }

    /**
     * Check if data transfer is allowed between regions
     */
    isDataTransferAllowed(fromRegion: string, toRegion: string): boolean {
        const fromCompliance = this.getComplianceRequirements(fromRegion);
        const hasRestrictions = fromCompliance.some(req => req.crossBorderTransferRestrictions);

        if (!hasRestrictions) {
            return true;
        }

        // Check if both regions have compatible compliance requirements
        const toCompliance = this.getComplianceRequirements(toRegion);
        const fromCodes = fromCompliance.map(req => req.code);
        const toCodes = toCompliance.map(req => req.code);

        // Allow transfer if target region has at least one compatible compliance requirement
        return fromCodes.some(code => toCodes.includes(code));
    }

    /**
     * Get data residency region for a user region
     */
    getDataResidencyRegion(userRegion: string): string {
        const regionConfig = this.supportedRegions.find(r => r.code === userRegion);
        return regionConfig?.dataResidencyRegion || 'eu-west-2';
    }

    /**
     * Create compliance audit event
     */
    async createComplianceAuditEvent(event: Omit<ComplianceAuditEvent, 'id' | 'timestamp'>): Promise<ComplianceAuditEvent> {
        const auditEvent: ComplianceAuditEvent = {
            ...event,
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date()
        };

        // In a real implementation, this would be stored in the database
        console.log('Compliance audit event created:', auditEvent);

        return auditEvent;
    }

    /**
     * Validate user preferences against regional constraints
     */
    validateUserPreferences(preferences: Partial<UserLocalizationPreferences>, userRegion: string): string[] {
        const errors: string[] = [];
        const regionConfig = this.supportedRegions.find(r => r.code === userRegion);

        if (!regionConfig) {
            errors.push(`Unsupported region: ${userRegion}`);
            return errors;
        }

        // Validate language
        if (preferences.language && !regionConfig.languages.includes(preferences.language)) {
            errors.push(`Language ${preferences.language} not supported in region ${userRegion}`);
        }

        // Validate currency
        if (preferences.currency && preferences.currency !== regionConfig.currency) {
            const currencySupported = this.supportedCurrencies.some(c =>
                c.code === preferences.currency && c.enabled
            );
            if (!currencySupported) {
                errors.push(`Currency ${preferences.currency} not supported`);
            }
        }

        return errors;
    }

    private getDateFormat(region: string): string {
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
        return formats[region] || 'DD/MM/YYYY';
    }

    private getTimeFormat(region: string): string {
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
        return formats[region] || '24h';
    }

    private getNumberFormat(currency: string) {
        const formats: Record<string, any> = {
            'GBP': { decimal: '.', thousands: ',', currency: { symbol: '£', position: 'before' } },
            'USD': { decimal: '.', thousands: ',', currency: { symbol: '$', position: 'before' } },
            'EUR': { decimal: ',', thousands: '.', currency: { symbol: '€', position: 'after' } },
            'CAD': { decimal: '.', thousands: ',', currency: { symbol: 'C$', position: 'before' } },
            'AUD': { decimal: '.', thousands: ',', currency: { symbol: 'A$', position: 'before' } }
        };
        return formats[currency] || formats['GBP'];
    }

    private getTimezone(region: string): string {
        const regionConfig = this.supportedRegions.find(r => r.code === region);
        return regionConfig?.timezone || 'Europe/London';
    }
}