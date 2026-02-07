/**
 * Internationalization Repository
 * Handles database operations for localization, currencies, and compliance
 */

import { Pool } from 'pg';
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
    RegionalPricingTier,
    ComplianceAuditEvent
} from '../../types/internationalization';

export class InternationalizationRepository {
    constructor(private pool: Pool) { }

    /**
     * Get user localization preferences
     */
    async getUserLocalizationPreferences(userId: string): Promise<UserLocalizationPreferences | null> {
        const query = `
      SELECT 
        user_id,
        language,
        currency,
        timezone,
        region,
        date_format,
        time_format,
        weight_unit,
        height_unit,
        temperature_unit,
        notification_language,
        notification_timezone,
        respect_quiet_hours,
        quiet_hours_start,
        quiet_hours_end,
        created_at,
        updated_at
      FROM user_localization_preferences 
      WHERE user_id = $1
    `;

        const result = await this.pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            userId: row.user_id,
            language: row.language,
            currency: row.currency,
            timezone: row.timezone,
            region: row.region,
            dateFormat: row.date_format as 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD',
            timeFormat: row.time_format as '12h' | '24h',
            units: {
                weight: row.weight_unit as 'kg' | 'lbs',
                height: row.height_unit as 'cm' | 'ft',
                temperature: row.temperature_unit as 'celsius' | 'fahrenheit'
            },
            notifications: {
                language: row.notification_language,
                timezone: row.notification_timezone,
                respectQuietHours: row.respect_quiet_hours,
                quietHoursStart: row.quiet_hours_start,
                quietHoursEnd: row.quiet_hours_end
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /**
     * Create or update user localization preferences
     */
    async upsertUserLocalizationPreferences(preferences: UserLocalizationPreferences): Promise<UserLocalizationPreferences> {
        const query = `
      INSERT INTO user_localization_preferences (
        user_id, language, currency, timezone, region, date_format, time_format,
        weight_unit, height_unit, temperature_unit, notification_language,
        notification_timezone, respect_quiet_hours, quiet_hours_start, quiet_hours_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (user_id) DO UPDATE SET
        language = EXCLUDED.language,
        currency = EXCLUDED.currency,
        timezone = EXCLUDED.timezone,
        region = EXCLUDED.region,
        date_format = EXCLUDED.date_format,
        time_format = EXCLUDED.time_format,
        weight_unit = EXCLUDED.weight_unit,
        height_unit = EXCLUDED.height_unit,
        temperature_unit = EXCLUDED.temperature_unit,
        notification_language = EXCLUDED.notification_language,
        notification_timezone = EXCLUDED.notification_timezone,
        respect_quiet_hours = EXCLUDED.respect_quiet_hours,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

        const values = [
            preferences.userId,
            preferences.language,
            preferences.currency,
            preferences.timezone,
            preferences.region,
            preferences.dateFormat,
            preferences.timeFormat,
            preferences.units.weight,
            preferences.units.height,
            preferences.units.temperature,
            preferences.notifications.language,
            preferences.notifications.timezone,
            preferences.notifications.respectQuietHours,
            preferences.notifications.quietHoursStart,
            preferences.notifications.quietHoursEnd
        ];

        const result = await this.pool.query(query, values);
        const row = result.rows[0];

        return {
            userId: row.user_id,
            language: row.language,
            currency: row.currency,
            timezone: row.timezone,
            region: row.region,
            dateFormat: row.date_format,
            timeFormat: row.time_format,
            units: {
                weight: row.weight_unit,
                height: row.height_unit,
                temperature: row.temperature_unit
            },
            notifications: {
                language: row.notification_language,
                timezone: row.notification_timezone,
                respectQuietHours: row.respect_quiet_hours,
                quietHoursStart: row.quiet_hours_start,
                quietHoursEnd: row.quiet_hours_end
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /**
     * Get all supported languages
     */
    async getSupportedLanguages(): Promise<SupportedLanguage[]> {
        const query = `
      SELECT code, name, native_name, rtl, enabled
      FROM supported_languages
      WHERE enabled = true
      ORDER BY name
    `;

        const result = await this.pool.query(query);

        return result.rows.map(row => ({
            code: row.code,
            name: row.name,
            nativeName: row.native_name,
            rtl: row.rtl,
            enabled: row.enabled
        }));
    }

    /**
     * Get all supported currencies
     */
    async getSupportedCurrencies(): Promise<SupportedCurrency[]> {
        const query = `
      SELECT code, name, symbol, decimal_places, exchange_rate, enabled
      FROM supported_currencies
      WHERE enabled = true
      ORDER BY name
    `;

        const result = await this.pool.query(query);

        return result.rows.map(row => ({
            code: row.code,
            name: row.name,
            symbol: row.symbol,
            decimalPlaces: row.decimal_places,
            enabled: row.enabled,
            exchangeRate: parseFloat(row.exchange_rate)
        }));
    }

    /**
     * Get all supported regions
     */
    async getSupportedRegions(): Promise<SupportedRegion[]> {
        const query = `
      SELECT 
        sr.code,
        sr.name,
        sr.currency,
        sr.timezone,
        sr.data_residency_region,
        sr.enabled,
        ARRAY_AGG(rl.language_code ORDER BY rl.is_primary DESC, rl.language_code) as languages,
        ARRAY_AGG(rcr.compliance_code) as compliance_requirements
      FROM supported_regions sr
      LEFT JOIN region_languages rl ON sr.code = rl.region_code
      LEFT JOIN region_compliance_requirements rcr ON sr.code = rcr.region_code
      WHERE sr.enabled = true
      GROUP BY sr.code, sr.name, sr.currency, sr.timezone, sr.data_residency_region, sr.enabled
      ORDER BY sr.name
    `;

        const result = await this.pool.query(query);

        return result.rows.map(row => ({
            code: row.code,
            name: row.name,
            currency: row.currency,
            languages: row.languages || [],
            timezone: row.timezone,
            complianceRequirements: row.compliance_requirements || [],
            dataResidencyRegion: row.data_residency_region,
            enabled: row.enabled
        }));
    }

    /**
     * Get compliance requirements for a region
     */
    async getComplianceRequirements(regionCode?: string): Promise<ComplianceRequirement[]> {
        let query = `
      SELECT 
        cr.code,
        cr.name,
        cr.description,
        cr.data_retention_period,
        cr.requires_explicit_consent,
        cr.allows_data_portability,
        cr.requires_data_deletion,
        cr.audit_log_retention,
        cr.encryption_required,
        cr.cross_border_transfer_restrictions,
        cr.enabled,
        ARRAY_AGG(rcr.region_code) as applicable_regions
      FROM compliance_requirements cr
      LEFT JOIN region_compliance_requirements rcr ON cr.code = rcr.compliance_code
      WHERE cr.enabled = true
    `;

        const values: string[] = [];

        if (regionCode) {
            query += ` AND rcr.region_code = $1`;
            values.push(regionCode);
        }

        query += `
      GROUP BY cr.code, cr.name, cr.description, cr.data_retention_period,
               cr.requires_explicit_consent, cr.allows_data_portability,
               cr.requires_data_deletion, cr.audit_log_retention,
               cr.encryption_required, cr.cross_border_transfer_restrictions, cr.enabled
      ORDER BY cr.name
    `;

        const result = await this.pool.query(query, values);

        return result.rows.map(row => ({
            code: row.code,
            name: row.name,
            description: row.description,
            applicableRegions: row.applicable_regions || [],
            dataRetentionPeriod: row.data_retention_period,
            requiresExplicitConsent: row.requires_explicit_consent,
            allowsDataPortability: row.allows_data_portability,
            requiresDataDeletion: row.requires_data_deletion,
            auditLogRetention: row.audit_log_retention,
            encryptionRequired: row.encryption_required,
            crossBorderTransferRestrictions: row.cross_border_transfer_restrictions,
            enabled: row.enabled
        }));
    }

    /**
     * Get localized content
     */
    async getLocalizedContent(contentKey: string, language: string): Promise<LocalizedContent | null> {
        const query = `
      SELECT 
        id, content_key, language, content, content_type, category,
        version, approved, approved_by, approved_at, created_at, updated_at
      FROM localized_content
      WHERE content_key = $1 AND language = $2 AND approved = true
      ORDER BY version DESC
      LIMIT 1
    `;

        const result = await this.pool.query(query, [contentKey, language]);

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            contentKey: row.content_key,
            language: row.language,
            content: row.content,
            contentType: row.content_type as 'text' | 'html' | 'markdown',
            category: row.category as 'ui' | 'coaching' | 'safety' | 'medical' | 'legal',
            version: row.version,
            approved: row.approved,
            approvedBy: row.approved_by,
            approvedAt: row.approved_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /**
     * Create localized content
     */
    async createLocalizedContent(content: Omit<LocalizedContent, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocalizedContent> {
        const query = `
      INSERT INTO localized_content (
        content_key, language, content, content_type, category,
        version, approved, approved_by, approved_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

        const values = [
            content.contentKey,
            content.language,
            content.content,
            content.contentType,
            content.category,
            content.version,
            content.approved,
            content.approvedBy,
            content.approvedAt
        ];

        const result = await this.pool.query(query, values);
        const row = result.rows[0];

        return {
            id: row.id,
            contentKey: row.content_key,
            language: row.language,
            content: row.content,
            contentType: row.content_type,
            category: row.category,
            version: row.version,
            approved: row.approved,
            approvedBy: row.approved_by,
            approvedAt: row.approved_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /**
     * Get latest currency exchange rates
     */
    async getCurrencyExchangeRates(baseCurrency: string = 'GBP'): Promise<CurrencyExchangeRate[]> {
        const query = `
      SELECT DISTINCT ON (target_currency)
        id, base_currency, target_currency, rate, source, timestamp, valid_until
      FROM currency_exchange_rates
      WHERE base_currency = $1 AND valid_until > CURRENT_TIMESTAMP
      ORDER BY target_currency, timestamp DESC
    `;

        const result = await this.pool.query(query, [baseCurrency]);

        return result.rows.map(row => ({
            id: row.id,
            baseCurrency: row.base_currency,
            targetCurrency: row.target_currency,
            rate: parseFloat(row.rate),
            source: row.source,
            timestamp: row.timestamp,
            validUntil: row.valid_until
        }));
    }

    /**
     * Update currency exchange rates
     */
    async updateCurrencyExchangeRates(rates: Omit<CurrencyExchangeRate, 'id'>[]): Promise<void> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            for (const rate of rates) {
                const query = `
          INSERT INTO currency_exchange_rates (
            base_currency, target_currency, rate, source, timestamp, valid_until
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `;

                const values = [
                    rate.baseCurrency,
                    rate.targetCurrency,
                    rate.rate,
                    rate.source,
                    rate.timestamp,
                    rate.validUntil
                ];

                await client.query(query, values);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get regional pricing tiers
     */
    async getRegionalPricingTiers(regionCode: string): Promise<RegionalPricingTier[]> {
        const query = `
      SELECT 
        id, region, currency, tier_name, monthly_price, yearly_price,
        features, localized_description, tax_rate, enabled,
        created_at, updated_at
      FROM regional_pricing_tiers
      WHERE region = $1 AND enabled = true
      ORDER BY monthly_price
    `;

        const result = await this.pool.query(query, [regionCode]);

        return result.rows.map(row => ({
            id: row.id,
            region: row.region,
            currency: row.currency,
            tierName: row.tier_name,
            monthlyPrice: parseFloat(row.monthly_price),
            yearlyPrice: parseFloat(row.yearly_price),
            features: row.features,
            localizedDescription: row.localized_description,
            taxRate: parseFloat(row.tax_rate),
            enabled: row.enabled,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }

    /**
     * Create compliance audit event
     */
    async createComplianceAuditEvent(event: Omit<ComplianceAuditEvent, 'id' | 'timestamp'>): Promise<ComplianceAuditEvent> {
        const query = `
      INSERT INTO compliance_audit_events (
        user_id, event_type, region, compliance_requirement, data_types,
        action, source_region, target_region, data_size, encryption_used,
        user_consent, legal_basis, audit_trail
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

        const values = [
            event.userId,
            event.eventType,
            event.region,
            event.complianceRequirement,
            JSON.stringify(event.dataTypes),
            event.action,
            event.metadata.sourceRegion,
            event.metadata.targetRegion,
            event.metadata.dataSize,
            event.metadata.encryptionUsed,
            event.metadata.userConsent,
            event.metadata.legalBasis,
            event.auditTrail
        ];

        const result = await this.pool.query(query, values);
        const row = result.rows[0];

        return {
            id: row.id,
            userId: row.user_id,
            eventType: row.event_type,
            region: row.region,
            complianceRequirement: row.compliance_requirement,
            dataTypes: row.data_types,
            action: row.action,
            metadata: {
                sourceRegion: row.source_region,
                targetRegion: row.target_region,
                dataSize: row.data_size,
                encryptionUsed: row.encryption_used,
                userConsent: row.user_consent,
                legalBasis: row.legal_basis
            },
            timestamp: row.timestamp,
            auditTrail: row.audit_trail
        };
    }

    /**
     * Get compliance audit events for a user
     */
    async getComplianceAuditEvents(userId: string, limit: number = 100): Promise<ComplianceAuditEvent[]> {
        const query = `
      SELECT 
        id, user_id, event_type, region, compliance_requirement, data_types,
        action, source_region, target_region, data_size, encryption_used,
        user_consent, legal_basis, timestamp, audit_trail
      FROM compliance_audit_events
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;

        const result = await this.pool.query(query, [userId, limit]);

        return result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            eventType: row.event_type,
            region: row.region,
            complianceRequirement: row.compliance_requirement,
            dataTypes: row.data_types,
            action: row.action,
            metadata: {
                sourceRegion: row.source_region,
                targetRegion: row.target_region,
                dataSize: row.data_size,
                encryptionUsed: row.encryption_used,
                userConsent: row.user_consent,
                legalBasis: row.legal_basis
            },
            timestamp: row.timestamp,
            auditTrail: row.audit_trail
        }));
    }
}