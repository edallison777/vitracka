/**
 * Unit Tests for InternationalizationRepository
 * Tests database operations for localization, currencies, and compliance
 */

import { Pool } from 'pg';
import { InternationalizationRepository } from '../../../database/repositories/InternationalizationRepository';
import {
    LocalizationConfig,
    UserLocalizationPreferences,
    LocalizedContent,
    ComplianceAuditEvent,
    CurrencyExchangeRate,
    RegionalPricingTier
} from '../../../types/internationalization';

// Mock the database connection
jest.mock('../../../database/connection', () => ({
    pool: {
        query: jest.fn(),
        connect: jest.fn(),
        end: jest.fn()
    }
}));

describe('InternationalizationRepository', () => {
    let repository: InternationalizationRepository;
    let mockPool: jest.Mocked<Pool>;

    beforeEach(() => {
        repository = new InternationalizationRepository();
        mockPool = require('../../../database/connection').pool;
        jest.clearAllMocks();
    });

    describe('getLocalizationConfig', () => {
        it('should return localization config for valid region and language', async () => {
            const mockConfig: LocalizationConfig = {
                id: 'gb-en-gbp',
                region: 'GB',
                language: 'en',
                currency: 'GBP',
                timezone: 'Europe/London',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: '24h',
                numberFormat: {
                    decimal: '.',
                    thousands: ',',
                    currency: { symbol: '£', position: 'before' }
                },
                complianceRequirements: ['GDPR', 'UK_GDPR'],
                dataResidencyRegion: 'eu-west-2',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01')
            };

            mockPool.query.mockResolvedValue({
                rows: [mockConfig],
                rowCount: 1
            } as any);

            const result = await repository.getLocalizationConfig('GB', 'en');

            expect(result).toEqual(mockConfig);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM localization_configs'),
                ['GB', 'en']
            );
        });

        it('should return null for non-existent config', async () => {
            mockPool.query.mockResolvedValue({
                rows: [],
                rowCount: 0
            } as any);

            const result = await repository.getLocalizationConfig('XX', 'xx');

            expect(result).toBeNull();
        });

        it('should handle database errors gracefully', async () => {
            mockPool.query.mockRejectedValue(new Error('Database connection failed'));

            await expect(repository.getLocalizationConfig('GB', 'en'))
                .rejects.toThrow('Database connection failed');
        });
    });

    describe('getUserPreferences', () => {
        it('should return user preferences for valid user ID', async () => {
            const mockPreferences: UserLocalizationPreferences = {
                userId: 'user-123',
                language: 'en',
                currency: 'GBP',
                timezone: 'Europe/London',
                region: 'GB',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: '24h',
                units: {
                    weight: 'kg',
                    height: 'cm',
                    temperature: 'celsius'
                },
                notifications: {
                    language: 'en',
                    timezone: 'Europe/London',
                    respectQuietHours: true,
                    quietHoursStart: '22:00',
                    quietHoursEnd: '08:00'
                },
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01')
            };

            mockPool.query.mockResolvedValue({
                rows: [mockPreferences],
                rowCount: 1
            } as any);

            const result = await repository.getUserPreferences('user-123');

            expect(result).toEqual(mockPreferences);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM user_localization_preferences'),
                ['user-123']
            );
        });

        it('should return null for non-existent user', async () => {
            mockPool.query.mockResolvedValue({
                rows: [],
                rowCount: 0
            } as any);

            const result = await repository.getUserPreferences('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('updateUserPreferences', () => {
        it('should update user preferences successfully', async () => {
            const updates = {
                language: 'es',
                currency: 'EUR',
                timezone: 'Europe/Madrid'
            };

            const updatedPreferences: UserLocalizationPreferences = {
                userId: 'user-123',
                language: 'es',
                currency: 'EUR',
                timezone: 'Europe/Madrid',
                region: 'ES',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: '24h',
                units: {
                    weight: 'kg',
                    height: 'cm',
                    temperature: 'celsius'
                },
                notifications: {
                    language: 'es',
                    timezone: 'Europe/Madrid',
                    respectQuietHours: true,
                    quietHoursStart: '22:00',
                    quietHoursEnd: '08:00'
                },
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02')
            };

            mockPool.query.mockResolvedValue({
                rows: [updatedPreferences],
                rowCount: 1
            } as any);

            const result = await repository.updateUserPreferences('user-123', updates);

            expect(result).toEqual(updatedPreferences);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE user_localization_preferences'),
                expect.arrayContaining(['user-123'])
            );
        });

        it('should handle update failures', async () => {
            mockPool.query.mockResolvedValue({
                rows: [],
                rowCount: 0
            } as any);

            await expect(repository.updateUserPreferences('user-123', { language: 'es' }))
                .rejects.toThrow('Failed to update user preferences');
        });
    });

    describe('getLocalizedContent', () => {
        it('should return localized content for key and language', async () => {
            const mockContent: LocalizedContent = {
                id: 'content-123',
                contentKey: 'welcome.title',
                language: 'es',
                content: 'Bienvenido a Vitracka',
                contentType: 'text',
                category: 'ui',
                version: 1,
                approved: true,
                approvedBy: 'admin-123',
                approvedAt: new Date('2024-01-01'),
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01')
            };

            mockPool.query.mockResolvedValue({
                rows: [mockContent],
                rowCount: 1
            } as any);

            const result = await repository.getLocalizedContent('welcome.title', 'es');

            expect(result).toEqual(mockContent);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM localized_content'),
                ['welcome.title', 'es']
            );
        });

        it('should return null for non-existent content', async () => {
            mockPool.query.mockResolvedValue({
                rows: [],
                rowCount: 0
            } as any);

            const result = await repository.getLocalizedContent('non.existent', 'en');

            expect(result).toBeNull();
        });
    });

    describe('createComplianceAuditEvent', () => {
        it('should create compliance audit event successfully', async () => {
            const eventData: Omit<ComplianceAuditEvent, 'id' | 'timestamp'> = {
                userId: 'user-123',
                eventType: 'data_export',
                region: 'GB',
                complianceRequirement: 'GDPR',
                dataTypes: ['personal_data'],
                action: 'export',
                metadata: {
                    encryptionUsed: true,
                    userConsent: true
                },
                auditTrail: 'User requested data export via settings'
            };

            const createdEvent: ComplianceAuditEvent = {
                ...eventData,
                id: 'audit-123',
                timestamp: new Date('2024-01-01')
            };

            mockPool.query.mockResolvedValue({
                rows: [createdEvent],
                rowCount: 1
            } as any);

            const result = await repository.createComplianceAuditEvent(eventData);

            expect(result).toEqual(createdEvent);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO compliance_audit_events'),
                expect.arrayContaining([
                    eventData.userId,
                    eventData.eventType,
                    eventData.region,
                    eventData.complianceRequirement
                ])
            );
        });
    });

    describe('getCurrencyExchangeRates', () => {
        it('should return current exchange rates', async () => {
            const mockRates: CurrencyExchangeRate[] = [
                {
                    id: 'rate-1',
                    baseCurrency: 'GBP',
                    targetCurrency: 'USD',
                    rate: 1.27,
                    source: 'Bank of England',
                    timestamp: new Date('2024-01-01'),
                    validUntil: new Date('2024-01-02')
                },
                {
                    id: 'rate-2',
                    baseCurrency: 'GBP',
                    targetCurrency: 'EUR',
                    rate: 1.17,
                    source: 'ECB',
                    timestamp: new Date('2024-01-01'),
                    validUntil: new Date('2024-01-02')
                }
            ];

            mockPool.query.mockResolvedValue({
                rows: mockRates,
                rowCount: 2
            } as any);

            const result = await repository.getCurrencyExchangeRates();

            expect(result).toEqual(mockRates);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM currency_exchange_rates'),
                expect.any(Array)
            );
        });
    });

    describe('getRegionalPricingTiers', () => {
        it('should return pricing tiers for region', async () => {
            const mockTiers: RegionalPricingTier[] = [
                {
                    id: 'tier-1',
                    region: 'GB',
                    currency: 'GBP',
                    tierName: 'Basic',
                    monthlyPrice: 9.99,
                    yearlyPrice: 99.99,
                    features: ['weight_tracking', 'basic_coaching'],
                    localizedDescription: 'Basic weight management features',
                    taxRate: 0.20,
                    enabled: true,
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01')
                }
            ];

            mockPool.query.mockResolvedValue({
                rows: mockTiers,
                rowCount: 1
            } as any);

            const result = await repository.getRegionalPricingTiers('GB');

            expect(result).toEqual(mockTiers);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM regional_pricing_tiers'),
                ['GB', true]
            );
        });
    });

    describe('timezone handling', () => {
        it('should handle timezone-aware date operations', async () => {
            const testDate = new Date('2024-03-15T14:30:00Z');
            const timezone = 'Europe/London';

            // Mock a query that involves timezone conversion
            mockPool.query.mockResolvedValue({
                rows: [{ local_time: '2024-03-15T14:30:00+00:00' }],
                rowCount: 1
            } as any);

            const result = await repository.convertToTimezone(testDate, timezone);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('AT TIME ZONE'),
                [testDate.toISOString(), timezone]
            );
        });
    });

    describe('data residency compliance', () => {
        it('should validate data residency requirements', async () => {
            const mockValidation = {
                isCompliant: true,
                requiredRegion: 'eu-west-2',
                currentRegion: 'eu-west-2',
                complianceRequirements: ['GDPR']
            };

            mockPool.query.mockResolvedValue({
                rows: [mockValidation],
                rowCount: 1
            } as any);

            const result = await repository.validateDataResidency('user-123', 'GB');

            expect(result).toEqual(mockValidation);
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('data_residency_rules'),
                ['user-123', 'GB']
            );
        });
    });

    describe('multi-language content management', () => {
        it('should handle content translation workflows', async () => {
            const translationRequest = {
                contentKey: 'welcome.message',
                sourceLanguage: 'en',
                targetLanguages: ['es', 'fr', 'de'],
                contentType: 'text' as const,
                category: 'ui' as const
            };

            mockPool.query.mockResolvedValue({
                rows: [{ translation_job_id: 'job-123' }],
                rowCount: 1
            } as any);

            const result = await repository.createTranslationJob(translationRequest);

            expect(result).toEqual({ translationJobId: 'job-123' });
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO translation_jobs'),
                expect.arrayContaining([
                    translationRequest.contentKey,
                    translationRequest.sourceLanguage
                ])
            );
        });
    });
});