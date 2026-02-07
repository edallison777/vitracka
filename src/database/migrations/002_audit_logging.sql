-- Audit Logging System Migration
-- Creates comprehensive audit logging tables and indexes

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN (
        'agent_interaction', 'safety_intervention', 'user_authentication',
        'profile_update', 'weight_entry', 'eating_plan_change', 'breach_event',
        'gamification_reward', 'notification_sent', 'cost_analysis',
        'system_decision', 'data_export', 'data_deletion', 'admin_action'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Entity references
    user_id UUID REFERENCES user_accounts(id) ON DELETE SET NULL,
    agent_id VARCHAR(100), -- Agent identifier (e.g., 'safety_sentinel', 'coach_companion')
    session_id VARCHAR(100),
    
    -- Event details
    action VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Safety-specific fields
    is_safety_related BOOLEAN NOT NULL DEFAULT FALSE,
    requires_admin_review BOOLEAN NOT NULL DEFAULT FALSE,
    admin_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(255),
    
    -- Data security compliance
    data_classification VARCHAR(20) NOT NULL CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
    retention_period INTEGER NOT NULL DEFAULT 365, -- days
    
    -- Request/response tracking
    request_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    
    -- Error tracking
    error_code VARCHAR(50),
    error_message TEXT,
    stack_trace TEXT
);

-- Audit Log Configuration Table
CREATE TABLE audit_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enabled_event_types TEXT[] NOT NULL DEFAULT ARRAY[
        'agent_interaction', 'safety_intervention', 'user_authentication',
        'profile_update', 'weight_entry', 'eating_plan_change', 'breach_event',
        'gamification_reward', 'notification_sent', 'cost_analysis',
        'system_decision', 'data_export', 'data_deletion', 'admin_action'
    ],
    default_retention_period INTEGER NOT NULL DEFAULT 365,
    auto_review_threshold VARCHAR(20) NOT NULL DEFAULT 'error' CHECK (auto_review_threshold IN ('info', 'warning', 'error', 'critical')),
    safety_event_auto_escalation BOOLEAN NOT NULL DEFAULT TRUE,
    compliance_mode VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (compliance_mode IN ('standard', 'strict', 'minimal')),
    encryption_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    real_time_alerting BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT INTO audit_configuration (id) VALUES (uuid_generate_v4());

-- Indexes for audit logs performance
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_agent_id ON audit_logs(agent_id);
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_safety_related ON audit_logs(is_safety_related);
CREATE INDEX idx_audit_logs_admin_review ON audit_logs(requires_admin_review, admin_reviewed);
CREATE INDEX idx_audit_logs_data_classification ON audit_logs(data_classification);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);

-- Composite indexes for common queries
CREATE INDEX idx_audit_logs_safety_review ON audit_logs(is_safety_related, requires_admin_review, admin_reviewed, timestamp);
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);
CREATE INDEX idx_audit_logs_event_severity ON audit_logs(event_type, severity, timestamp);
CREATE INDEX idx_audit_logs_retention ON audit_logs(timestamp, retention_period, admin_reviewed);

-- Partial indexes for specific use cases
CREATE INDEX idx_audit_logs_pending_review ON audit_logs(timestamp) 
    WHERE requires_admin_review = true AND admin_reviewed = false;
CREATE INDEX idx_audit_logs_safety_critical ON audit_logs(timestamp) 
    WHERE is_safety_related = true AND severity = 'critical';
CREATE INDEX idx_audit_logs_errors ON audit_logs(timestamp) 
    WHERE severity IN ('error', 'critical');

-- Update trigger for audit_configuration
CREATE TRIGGER update_audit_configuration_updated_at 
    BEFORE UPDATE ON audit_configuration 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set admin review requirement based on severity
CREATE OR REPLACE FUNCTION set_admin_review_requirement()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-require admin review for critical events and all safety events
    IF NEW.severity = 'critical' OR NEW.is_safety_related = true THEN
        NEW.requires_admin_review = true;
    END IF;
    
    -- Set appropriate retention period based on data classification
    IF NEW.data_classification = 'restricted' THEN
        NEW.retention_period = 2555; -- 7 years for restricted data
    ELSIF NEW.data_classification = 'confidential' THEN
        NEW.retention_period = 1095; -- 3 years for confidential data
    ELSIF NEW.data_classification = 'internal' THEN
        NEW.retention_period = 730; -- 2 years for internal data
    ELSE
        NEW.retention_period = 365; -- 1 year for public data
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set admin review requirements
CREATE TRIGGER audit_log_auto_review_trigger
    BEFORE INSERT ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION set_admin_review_requirement();

-- Function for audit log cleanup (to be called by scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_period
    AND admin_reviewed = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit_logs (
        event_type, severity, action, description, metadata,
        is_safety_related, requires_admin_review, admin_reviewed,
        data_classification, agent_id
    ) VALUES (
        'system_decision', 'info', 'audit_cleanup', 
        'Automated cleanup of expired audit log entries',
        jsonb_build_object('deleted_count', deleted_count),
        false, false, true, 'internal', 'system'
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;