-- Migration 005: Internationalization Support
-- Adds tables and columns for multi-language, multi-currency, and regional compliance

-- User localization preferences
CREATE TABLE user_localization_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    language VARCHAR(5) NOT NULL DEFAULT 'en',
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/London',
    region VARCHAR(2) NOT NULL DEFAULT 'GB',
    date_format VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
    time_format VARCHAR(5) NOT NULL DEFAULT '24h',
    weight_unit VARCHAR(5) NOT NULL DEFAULT 'kg',
    height_unit VARCHAR(5) NOT NULL DEFAULT 'cm',
    temperature_unit VARCHAR(10) NOT NULL DEFAULT 'celsius',
    notification_language VARCHAR(5) NOT NULL DEFAULT 'en',
    notification_timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/London',
    respect_quiet_hours BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Supported languages
CREATE TABLE supported_languages (
    code VARCHAR(5) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    rtl BOOLEAN NOT NULL DEFAULT false,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Supported currencies
CREATE TABLE supported_currencies (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    decimal_places INTEGER NOT NULL DEFAULT 2,
    exchange_rate DECIMAL(10, 6) NOT NULL DEFAULT 1.0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Supported regions
CREATE TABLE supported_regions (
    code VARCHAR(2) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    currency VARCHAR(3) NOT NULL REFERENCES supported_currencies(code),
    timezone VARCHAR(50) NOT NULL,
    data_residency_region VARCHAR(20) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Region languages (many-to-many relationship)
CREATE TABLE region_languages (
    region_code VARCHAR(2) NOT NULL REFERENCES supported_regions(code) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL REFERENCES supported_languages(code) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (region_code, language_code)
);

-- Compliance requirements
CREATE TABLE compliance_requirements (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    data_retention_period INTEGER NOT NULL, -- in days
    requires_explicit_consent BOOLEAN NOT NULL DEFAULT false,
    allows_data_portability BOOLEAN NOT NULL DEFAULT false,
    requires_data_deletion BOOLEAN NOT NULL DEFAULT false,
    audit_log_retention INTEGER NOT NULL, -- in days
    encryption_required BOOLEAN NOT NULL DEFAULT true,
    cross_border_transfer_restrictions BOOLEAN NOT NULL DEFAULT false,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Region compliance requirements (many-to-many relationship)
CREATE TABLE region_compliance_requirements (
    region_code VARCHAR(2) NOT NULL REFERENCES supported_regions(code) ON DELETE CASCADE,
    compliance_code VARCHAR(20) NOT NULL REFERENCES compliance_requirements(code) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (region_code, compliance_code)
);

-- Localized content
CREATE TABLE localized_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_key VARCHAR(200) NOT NULL,
    language VARCHAR(5) NOT NULL REFERENCES supported_languages(code),
    content TEXT NOT NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'text',
    category VARCHAR(20) NOT NULL DEFAULT 'ui',
    version INTEGER NOT NULL DEFAULT 1,
    approved BOOLEAN NOT NULL DEFAULT false,
    approved_by UUID REFERENCES user_accounts(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(content_key, language, version)
);

-- Currency exchange rates
CREATE TABLE currency_exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(3) NOT NULL REFERENCES supported_currencies(code),
    target_currency VARCHAR(3) NOT NULL REFERENCES supported_currencies(code),
    rate DECIMAL(10, 6) NOT NULL,
    source VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(base_currency, target_currency, timestamp)
);

-- Regional pricing tiers
CREATE TABLE regional_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region VARCHAR(2) NOT NULL REFERENCES supported_regions(code),
    currency VARCHAR(3) NOT NULL REFERENCES supported_currencies(code),
    tier_name VARCHAR(50) NOT NULL,
    monthly_price DECIMAL(10, 2) NOT NULL,
    yearly_price DECIMAL(10, 2) NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    localized_description TEXT,
    tax_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(region, tier_name)
);

-- Compliance audit events
CREATE TABLE compliance_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id),
    event_type VARCHAR(50) NOT NULL,
    region VARCHAR(2) NOT NULL REFERENCES supported_regions(code),
    compliance_requirement VARCHAR(20) NOT NULL REFERENCES compliance_requirements(code),
    data_types JSONB NOT NULL DEFAULT '[]',
    action VARCHAR(20) NOT NULL,
    source_region VARCHAR(2),
    target_region VARCHAR(2),
    data_size BIGINT,
    encryption_used BOOLEAN NOT NULL DEFAULT true,
    user_consent BOOLEAN NOT NULL DEFAULT false,
    legal_basis VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    audit_trail TEXT NOT NULL
);

-- Add region column to existing tables for data residency
ALTER TABLE user_accounts ADD COLUMN region VARCHAR(2) DEFAULT 'GB';
ALTER TABLE weight_entries ADD COLUMN region VARCHAR(2) DEFAULT 'GB';
ALTER TABLE eating_plans ADD COLUMN region VARCHAR(2) DEFAULT 'GB';
ALTER TABLE safety_interventions ADD COLUMN region VARCHAR(2) DEFAULT 'GB';

-- Create indexes for performance
CREATE INDEX idx_user_localization_preferences_user_id ON user_localization_preferences(user_id);
CREATE INDEX idx_localized_content_key_language ON localized_content(content_key, language);
CREATE INDEX idx_localized_content_category ON localized_content(category);
CREATE INDEX idx_currency_exchange_rates_currencies ON currency_exchange_rates(base_currency, target_currency);
CREATE INDEX idx_currency_exchange_rates_timestamp ON currency_exchange_rates(timestamp DESC);
CREATE INDEX idx_regional_pricing_tiers_region ON regional_pricing_tiers(region);
CREATE INDEX idx_compliance_audit_events_user_id ON compliance_audit_events(user_id);
CREATE INDEX idx_compliance_audit_events_timestamp ON compliance_audit_events(timestamp DESC);
CREATE INDEX idx_compliance_audit_events_region ON compliance_audit_events(region);

-- Insert default supported languages
INSERT INTO supported_languages (code, name, native_name, rtl, enabled) VALUES
('en', 'English', 'English', false, true),
('es', 'Spanish', 'Español', false, true),
('fr', 'French', 'Français', false, true),
('de', 'German', 'Deutsch', false, true),
('it', 'Italian', 'Italiano', false, true),
('pt', 'Portuguese', 'Português', false, false),
('nl', 'Dutch', 'Nederlands', false, false),
('sv', 'Swedish', 'Svenska', false, false);

-- Insert default supported currencies
INSERT INTO supported_currencies (code, name, symbol, decimal_places, exchange_rate, enabled) VALUES
('GBP', 'British Pound', '£', 2, 1.0, true),
('USD', 'US Dollar', '$', 2, 1.27, true),
('EUR', 'Euro', '€', 2, 1.17, true),
('CAD', 'Canadian Dollar', 'C$', 2, 1.71, true),
('AUD', 'Australian Dollar', 'A$', 2, 1.91, true),
('CHF', 'Swiss Franc', 'CHF', 2, 1.13, false),
('SEK', 'Swedish Krona', 'kr', 2, 13.42, false);

-- Insert default supported regions
INSERT INTO supported_regions (code, name, currency, timezone, data_residency_region, enabled) VALUES
('GB', 'United Kingdom', 'GBP', 'Europe/London', 'eu-west-2', true),
('US', 'United States', 'USD', 'America/New_York', 'us-east-1', true),
('CA', 'Canada', 'CAD', 'America/Toronto', 'us-east-1', true),
('AU', 'Australia', 'AUD', 'Australia/Sydney', 'ap-southeast-2', true),
('DE', 'Germany', 'EUR', 'Europe/Berlin', 'eu-west-2', true),
('FR', 'France', 'EUR', 'Europe/Paris', 'eu-west-2', true),
('ES', 'Spain', 'EUR', 'Europe/Madrid', 'eu-west-2', true),
('IT', 'Italy', 'EUR', 'Europe/Rome', 'eu-west-2', true);

-- Insert region-language relationships
INSERT INTO region_languages (region_code, language_code, is_primary) VALUES
('GB', 'en', true),
('US', 'en', true),
('US', 'es', false),
('CA', 'en', true),
('CA', 'fr', false),
('AU', 'en', true),
('DE', 'de', true),
('DE', 'en', false),
('FR', 'fr', true),
('FR', 'en', false),
('ES', 'es', true),
('ES', 'en', false),
('IT', 'it', true),
('IT', 'en', false);

-- Insert default compliance requirements
INSERT INTO compliance_requirements (code, name, description, data_retention_period, requires_explicit_consent, allows_data_portability, requires_data_deletion, audit_log_retention, encryption_required, cross_border_transfer_restrictions, enabled) VALUES
('GDPR', 'General Data Protection Regulation', 'EU data protection regulation', 2555, true, true, true, 2555, true, true, true),
('UK_GDPR', 'UK General Data Protection Regulation', 'UK data protection regulation', 2555, true, true, true, 2555, true, true, true),
('CCPA', 'California Consumer Privacy Act', 'California state privacy law', 1825, false, true, true, 1825, true, false, true),
('HIPAA', 'Health Insurance Portability and Accountability Act', 'US healthcare data protection law', 2190, true, false, false, 2190, true, true, true),
('PIPEDA', 'Personal Information Protection and Electronic Documents Act', 'Canadian federal privacy law', 1825, true, true, true, 1825, true, false, true),
('Privacy_Act', 'Privacy Act 1988', 'Australian privacy legislation', 1825, true, true, true, 1825, true, false, true);

-- Insert region-compliance relationships
INSERT INTO region_compliance_requirements (region_code, compliance_code) VALUES
('GB', 'GDPR'),
('GB', 'UK_GDPR'),
('US', 'CCPA'),
('US', 'HIPAA'),
('CA', 'PIPEDA'),
('AU', 'Privacy_Act'),
('DE', 'GDPR'),
('FR', 'GDPR'),
('ES', 'GDPR'),
('IT', 'GDPR');

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_localization_preferences_updated_at BEFORE UPDATE ON user_localization_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supported_languages_updated_at BEFORE UPDATE ON supported_languages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supported_currencies_updated_at BEFORE UPDATE ON supported_currencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supported_regions_updated_at BEFORE UPDATE ON supported_regions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_requirements_updated_at BEFORE UPDATE ON compliance_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_localized_content_updated_at BEFORE UPDATE ON localized_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_regional_pricing_tiers_updated_at BEFORE UPDATE ON regional_pricing_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();