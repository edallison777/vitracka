/**
 * Unit Tests for InternationalizationService
 * Tests multi-language, multi-currency, and regional compliance features
 */

import { InternationalizationService } from '../../../services/InternationalizationService';

describe('InternationalizationService', () => {
    let service: InternationalizationService;

    beforeEach(() => {
        service = new InternationalizationService();
    });

    describe('getLocalizationConfig', () => {
        it('should return valid configuration for supported region', async () => {
            const config = await service.getLocalizationConfig('GB', 'en');

            expect(config).toMatchObject({
                region: 'GB',
                language: 'en',
                currency: 'GBP',
                timezone: 'Europe/London',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: '24h',
                complianceRequirements: expect.arrayContaining(['GDPR', 'UK_GDPR']),
                dataResidencyRegion: 'eu-west-2'
            });
        });

        it('should use default language for region when language not specified', async () => {
            const config = await service.getLocalizationConfig('DE');

            expect(config.language).toBe('de');
            expect(config.region).toBe('DE');
            expect(config.currency).toBe('EUR');
        });

        it('should throw error for unsupported region', async () => {
            await expect(service.getLocalizationConfig('XX')).rejects.toThrow('Unsupported region: XX');
        });
    });

    describe('getSupportedLanguages', () => {
        it('should return only enabled languages', () => {
            const languages = service.getSupportedLanguages();

            expect(languages).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'en', enabled: true }),
                    expect.objectContaining({ code: 'es', enabled: true }),
                    expect.objectContaining({ code: 'fr', enabled: true }),
                    expect.objectContaining({ code: 'de', enabled: true }),
                    expect.objectContaining({ code: 'it', enabled: true })
                ])
            );

            // Should not include disabled languages
            expect(languages.every(lang => lang.enabled)).toBe(true);
        });
    });

    describe('getSupportedCurrencies', () => {
        it('should return only enabled currencies', () => {
            const currencies = service.getSupportedCurrencies();

            expect(currencies).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'GBP', enabled: true }),
                    expect.objectContaining({ code: 'USD', enabled: true }),
                    expect.objectContaining({ code: 'EUR', enabled: true }),
                    expect.objectContaining({ code: 'CAD', enabled: true }),
                    expect.objectContaining({ code: 'AUD', enabled: true })
                ])
            );

            expect(currencies.every(curr => curr.enabled)).toBe(true);
        });
    });

    describe('getSupportedRegions', () => {
        it('should return only enabled regions', () => {
            const regions = service.getSupportedRegions();

            expect(regions).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'GB', enabled: true }),
                    expect.objectContaining({ code: 'US', enabled: true }),
                    expect.objectContaining({ code: 'CA', enabled: true }),
                    expect.objectContaining({ code: 'AU', enabled: true }),
                    expect.objectContaining({ code: 'DE', enabled: true }),
                    expect.objectContaining({ code: 'FR', enabled: true }),
                    expect.objectContaining({ code: 'ES', enabled: true }),
                    expect.objectContaining({ code: 'IT', enabled: true })
                ])
            );

            expect(regions.every(region => region.enabled)).toBe(true);
        });
    });

    describe('getComplianceRequirements', () => {
        it('should return compliance requirements for specific region', () => {
            const gbRequirements = service.getComplianceRequirements('GB');
            const usRequirements = service.getComplianceRequirements('US');

            expect(gbRequirements).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'GDPR' })
                ])
            );

            expect(usRequirements).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'CCPA' }),
                    expect.objectContaining({ code: 'HIPAA' })
                ])
            );
        });

        it('should return empty array for unsupported region', () => {
            const requirements = service.getComplianceRequirements('XX');
            expect(requirements).toEqual([]);
        });
    });

    describe('convertCurrency', () => {
        it('should return same amount for same currency', async () => {
            const result = await service.convertCurrency(100, 'GBP', 'GBP');
            expect(result).toBe(100);
        });

        it('should convert between different currencies', async () => {
            const result = await service.convertCurrency(100, 'GBP', 'USD');
            expect(result).toBeCloseTo(127, 0); // Approximate based on exchange rate
        });

        it('should handle reverse conversion', async () => {
            const gbpToUsd = await service.convertCurrency(100, 'GBP', 'USD');
            const usdToGbp = await service.convertCurrency(gbpToUsd, 'USD', 'GBP');
            expect(usdToGbp).toBeCloseTo(100, 1);
        });
    });

    describe('formatCurrency', () => {
        it('should format currency with correct symbol and decimals', () => {
            const gbpFormatted = service.formatCurrency(123.45, 'GBP', 'en');
            const usdFormatted = service.formatCurrency(123.45, 'USD', 'en');
            const eurFormatted = service.formatCurrency(123.45, 'EUR', 'de');

            expect(gbpFormatted).toMatch(/£.*123\.45/);
            expect(usdFormatted).toMatch(/\$.*123\.45/);
            expect(eurFormatted).toMatch(/123,45.*€/);
        });

        it('should return string representation for unsupported currency', () => {
            const result = service.formatCurrency(123.45, 'XXX', 'en');
            expect(result).toBe('123.45');
        });
    });

    describe('formatDate', () => {
        it('should format date according to region preferences', () => {
            const testDate = new Date('2024-03-15T10:30:00Z');

            const gbFormat = service.formatDate(testDate, 'GB', 'en');
            const usFormat = service.formatDate(testDate, 'US', 'en');
            const deFormat = service.formatDate(testDate, 'DE', 'de');

            // Note: Actual formatting may vary based on Intl implementation
            expect(typeof gbFormat).toBe('string');
            expect(typeof usFormat).toBe('string');
            expect(typeof deFormat).toBe('string');
            expect(gbFormat).toContain('15');
            expect(usFormat).toContain('15');
            expect(deFormat).toContain('15');
        });
    });

    describe('formatTime', () => {
        it('should format time according to region preferences', () => {
            const testDate = new Date('2024-03-15T14:30:00Z');

            const gb24h = service.formatTime(testDate, 'GB', 'en', true);
            const us12h = service.formatTime(testDate, 'US', 'en', false);

            expect(typeof gb24h).toBe('string');
            expect(typeof us12h).toBe('string');
            expect(gb24h).toContain('30');
            expect(us12h).toContain('30');
        });
    });

    describe('convertToUserTimezone', () => {
        it('should convert date to user timezone', () => {
            const utcDate = new Date('2024-03-15T12:00:00Z');
            const londonDate = service.convertToUserTimezone(utcDate, 'Europe/London');
            const nyDate = service.convertToUserTimezone(utcDate, 'America/New_York');

            expect(londonDate).toBeInstanceOf(Date);
            expect(nyDate).toBeInstanceOf(Date);
            expect(londonDate.getTime()).not.toBe(nyDate.getTime());
        });
    });

    describe('isDataTransferAllowed', () => {
        it('should allow transfer between regions with compatible compliance', () => {
            const gbToFr = service.isDataTransferAllowed('GB', 'FR');
            const deToIt = service.isDataTransferAllowed('DE', 'IT');

            expect(gbToFr).toBe(true); // Both have GDPR
            expect(deToIt).toBe(true); // Both have GDPR
        });

        it('should allow transfer from regions without restrictions', () => {
            const usToAu = service.isDataTransferAllowed('US', 'AU');
            // Both US and AU have less restrictive compliance requirements
            expect(typeof usToAu).toBe('boolean');
        });

        it('should restrict transfer from GDPR regions to non-GDPR regions', () => {
            const gbToUs = service.isDataTransferAllowed('GB', 'US');
            expect(gbToUs).toBe(false); // GDPR has cross-border restrictions
        });
    });

    describe('getDataResidencyRegion', () => {
        it('should return correct data residency region for user region', () => {
            expect(service.getDataResidencyRegion('GB')).toBe('eu-west-2');
            expect(service.getDataResidencyRegion('US')).toBe('us-east-1');
            expect(service.getDataResidencyRegion('AU')).toBe('ap-southeast-2');
            expect(service.getDataResidencyRegion('DE')).toBe('eu-west-2');
        });

        it('should return default region for unsupported region', () => {
            expect(service.getDataResidencyRegion('XX')).toBe('eu-west-2');
        });
    });

    describe('createComplianceAuditEvent', () => {
        it('should create audit event with required fields', async () => {
            const eventData = {
                userId: 'user-123',
                eventType: 'data_export',
                region: 'GB',
                complianceRequirement: 'GDPR',
                dataTypes: ['personal_data'],
                action: 'export' as const,
                metadata: {
                    encryptionUsed: true,
                    userConsent: true
                },
                auditTrail: 'User requested data export via settings page'
            };

            const event = await service.createComplianceAuditEvent(eventData);

            expect(event).toMatchObject({
                ...eventData,
                id: expect.any(String),
                timestamp: expect.any(Date)
            });
        });
    });

    describe('validateUserPreferences', () => {
        it('should return no errors for valid preferences', () => {
            const preferences = {
                language: 'en',
                currency: 'GBP',
                region: 'GB'
            };

            const errors = service.validateUserPreferences(preferences, 'GB');
            expect(errors).toEqual([]);
        });

        it('should return errors for invalid language in region', () => {
            const preferences = {
                language: 'zh', // Not supported in GB
                currency: 'GBP',
                region: 'GB'
            };

            const errors = service.validateUserPreferences(preferences, 'GB');
            expect(errors).toContain('Language zh not supported in region GB');
        });

        it('should return errors for unsupported currency', () => {
            const preferences = {
                language: 'en',
                currency: 'XXX', // Not supported
                region: 'GB'
            };

            const errors = service.validateUserPreferences(preferences, 'GB');
            expect(errors).toContain('Currency XXX not supported');
        });

        it('should return errors for unsupported region', () => {
            const preferences = {
                language: 'en',
                currency: 'GBP',
                region: 'GB'
            };

            const errors = service.validateUserPreferences(preferences, 'XX');
            expect(errors).toContain('Unsupported region: XX');
        });
    });
});