-- Privacy Compliance Migration
-- Adds support for GDPR data portability and privacy settings

-- Add deleted_at columns for soft deletion support
ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE user_support_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE eating_plans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE breach_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE safety_interventions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create privacy settings table
CREATE TABLE IF NOT EXISTS privacy_settings (
    user_id UUID PRIMARY KEY REFERENCES user_accounts(id) ON DELETE CASCADE,
    data_retention_period INTEGER NOT NULL DEFAULT 365, -- days
    allow_analytics BOOLEAN NOT NULL DEFAULT true,
    allow_marketing BOOLEAN NOT NULL DEFAULT false,
    allow_third_party_sharing BOOLEAN NOT NULL DEFAULT false,
    anonymize_data BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create consent records table
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('data_processing', 'marketing', 'analytics', 'third_party_sharing')),
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    version VARCHAR(20) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create data export requests table
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    request_id UUID NOT NULL UNIQUE,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    format VARCHAR(10) NOT NULL CHECK (format IN ('json', 'csv', 'xml')),
    include_deleted BOOLEAN NOT NULL DEFAULT false,
    data_types TEXT[], -- Array of data types to export
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    completed_at TIMESTAMP,
    download_url TEXT,
    expires_at TIMESTAMP,
    processing_time_ms BIGINT,
    total_records INTEGER,
    error_message TEXT
);

-- Create data deletion requests table
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    request_id UUID NOT NULL UNIQUE,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletion_type VARCHAR(10) NOT NULL CHECK (deletion_type IN ('soft', 'hard')),
    retain_audit_logs BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    completed_at TIMESTAMP,
    verification_required BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMP,
    verification_token VARCHAR(255),
    processing_time_ms BIGINT,
    error_message TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id ON privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);

-- Create indexes for soft deletion queries
CREATE INDEX IF NOT EXISTS idx_user_accounts_deleted_at ON user_accounts(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_support_profiles_deleted_at ON user_support_profiles(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_weight_entries_deleted_at ON weight_entries(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eating_plans_deleted_at ON eating_plans(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_breach_events_deleted_at ON breach_events(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_safety_interventions_deleted_at ON safety_interventions(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_settings_deleted_at ON notification_settings(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_privacy_settings_updated_at 
    BEFORE UPDATE ON privacy_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default privacy settings for existing users
INSERT INTO privacy_settings (user_id)
SELECT id FROM user_accounts 
WHERE id NOT IN (SELECT user_id FROM privacy_settings)
ON CONFLICT (user_id) DO NOTHING;