-- Vitracka Weight Management System Database Schema
-- PostgreSQL schema with proper indexing and constraints

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Accounts Table
CREATE TABLE user_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    facebook_id VARCHAR(255) UNIQUE,
    auth_method VARCHAR(20) NOT NULL CHECK (auth_method IN ('email', 'google', 'facebook')),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraints to ensure proper authentication method data
    CONSTRAINT valid_email_auth CHECK (
        (auth_method = 'email' AND email IS NOT NULL AND password_hash IS NOT NULL) OR
        (auth_method != 'email')
    ),
    CONSTRAINT valid_google_auth CHECK (
        (auth_method = 'google' AND google_id IS NOT NULL) OR
        (auth_method != 'google')
    ),
    CONSTRAINT valid_facebook_auth CHECK (
        (auth_method = 'facebook' AND facebook_id IS NOT NULL) OR
        (auth_method != 'facebook')
    )
);

-- User Support Profiles Table
CREATE TABLE user_support_profiles (
    user_id UUID PRIMARY KEY REFERENCES user_accounts(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    
    -- Goals
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('loss', 'maintenance', 'transition')),
    target_weight DECIMAL(5,2),
    timeframe VARCHAR(100),
    weekly_goal DECIMAL(4,2),
    
    -- Preferences
    coaching_style VARCHAR(20) NOT NULL CHECK (coaching_style IN ('gentle', 'pragmatic', 'upbeat', 'structured')),
    gamification_level VARCHAR(20) NOT NULL CHECK (gamification_level IN ('minimal', 'moderate', 'high')),
    notification_frequency VARCHAR(20) NOT NULL CHECK (notification_frequency IN ('daily', 'weekly', 'custom')),
    reminder_times TEXT[], -- Array of time strings
    
    -- Medical Context
    on_glp1_medication BOOLEAN DEFAULT FALSE,
    has_clinician_guidance BOOLEAN DEFAULT FALSE,
    medication_details TEXT,
    
    -- Safety Profile
    risk_factors TEXT[],
    trigger_words TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Weight Entries Table
CREATE TABLE weight_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL CHECK (weight > 0 AND weight < 1000),
    unit VARCHAR(3) NOT NULL CHECK (unit IN ('kg', 'lbs')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    mood VARCHAR(20) CHECK (mood IN ('great', 'good', 'okay', 'struggling')),
    confidence INTEGER NOT NULL CHECK (confidence >= 1 AND confidence <= 5)
);

-- Eating Plans Table
CREATE TABLE eating_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('calorie', 'points', 'plate', 'custom')),
    daily_target DECIMAL(8,2) NOT NULL CHECK (daily_target > 0),
    restrictions TEXT[],
    preferences TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Breach Events Table
CREATE TABLE breach_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    eating_plan_id UUID NOT NULL REFERENCES eating_plans(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('minor', 'moderate', 'major')),
    recovery_plan TEXT,
    is_recovered BOOLEAN DEFAULT FALSE,
    recovered_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Safety Interventions Table
CREATE TABLE safety_interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    trigger_type VARCHAR(30) NOT NULL CHECK (trigger_type IN ('eating_disorder', 'self_harm', 'depression', 'medical_emergency')),
    trigger_content TEXT NOT NULL,
    agent_response TEXT NOT NULL,
    escalation_level VARCHAR(20) NOT NULL CHECK (escalation_level IN ('low', 'medium', 'high', 'critical')),
    admin_notified BOOLEAN DEFAULT FALSE,
    follow_up_required BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cost Analysis Tables

-- Cost Metrics Table
CREATE TABLE cost_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    period VARCHAR(20) NOT NULL CHECK (period IN ('hourly', 'daily', 'weekly', 'monthly')),
    total_cost DECIMAL(10,2) NOT NULL CHECK (total_cost >= 0),
    cost_breakdown JSONB NOT NULL,
    user_count INTEGER NOT NULL CHECK (user_count >= 0),
    cost_per_user DECIMAL(8,4) NOT NULL CHECK (cost_per_user >= 0),
    agent_interactions INTEGER NOT NULL CHECK (agent_interactions >= 0),
    cost_per_interaction DECIMAL(8,6) NOT NULL CHECK (cost_per_interaction >= 0)
);

-- Subscription Recommendations Table
CREATE TABLE subscription_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recommended_tiers JSONB NOT NULL,
    cost_basis JSONB NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Profitability Reports Table
CREATE TABLE profitability_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly')),
    revenue JSONB NOT NULL,
    costs JSONB NOT NULL,
    profit JSONB NOT NULL,
    user_metrics JSONB NOT NULL
);

-- Cost Alerts Table
CREATE TABLE cost_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('threshold_exceeded', 'unusual_spike', 'cost_optimization', 'profitability_warning')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    current_value DECIMAL(10,2) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    recommended_action TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE
);

-- Indexes for performance optimization
CREATE INDEX idx_user_accounts_email ON user_accounts(email);
CREATE INDEX idx_user_accounts_google_id ON user_accounts(google_id);
CREATE INDEX idx_user_accounts_facebook_id ON user_accounts(facebook_id);
CREATE INDEX idx_user_accounts_auth_method ON user_accounts(auth_method);
CREATE INDEX idx_user_accounts_created_at ON user_accounts(created_at);

CREATE INDEX idx_weight_entries_user_id ON weight_entries(user_id);
CREATE INDEX idx_weight_entries_timestamp ON weight_entries(timestamp);
CREATE INDEX idx_weight_entries_user_timestamp ON weight_entries(user_id, timestamp);

CREATE INDEX idx_eating_plans_user_id ON eating_plans(user_id);
CREATE INDEX idx_eating_plans_active ON eating_plans(user_id, is_active);

CREATE INDEX idx_breach_events_user_id ON breach_events(user_id);
CREATE INDEX idx_breach_events_eating_plan_id ON breach_events(eating_plan_id);
CREATE INDEX idx_breach_events_timestamp ON breach_events(timestamp);
CREATE INDEX idx_breach_events_user_timestamp ON breach_events(user_id, timestamp);
CREATE INDEX idx_breach_events_severity ON breach_events(severity);
CREATE INDEX idx_breach_events_recovered ON breach_events(is_recovered);

CREATE INDEX idx_safety_interventions_user_id ON safety_interventions(user_id);
CREATE INDEX idx_safety_interventions_timestamp ON safety_interventions(timestamp);
CREATE INDEX idx_safety_interventions_escalation ON safety_interventions(escalation_level);
CREATE INDEX idx_safety_interventions_admin_notified ON safety_interventions(admin_notified);

-- Cost Analysis Indexes
CREATE INDEX idx_cost_metrics_timestamp ON cost_metrics(timestamp);
CREATE INDEX idx_cost_metrics_period ON cost_metrics(period);
CREATE INDEX idx_cost_metrics_period_timestamp ON cost_metrics(period, timestamp);

CREATE INDEX idx_subscription_recommendations_generated_at ON subscription_recommendations(generated_at);
CREATE INDEX idx_subscription_recommendations_valid_until ON subscription_recommendations(valid_until);

CREATE INDEX idx_profitability_reports_report_date ON profitability_reports(report_date);
CREATE INDEX idx_profitability_reports_period ON profitability_reports(period);
CREATE INDEX idx_profitability_reports_period_date ON profitability_reports(period, report_date);

CREATE INDEX idx_cost_alerts_timestamp ON cost_alerts(timestamp);
CREATE INDEX idx_cost_alerts_severity ON cost_alerts(severity);
CREATE INDEX idx_cost_alerts_acknowledged ON cost_alerts(acknowledged);
CREATE INDEX idx_cost_alerts_alert_type ON cost_alerts(alert_type);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_support_profiles_updated_at 
    BEFORE UPDATE ON user_support_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Notification Settings Table
CREATE TABLE notification_settings (
    user_id UUID PRIMARY KEY REFERENCES user_accounts(id) ON DELETE CASCADE,
    delivery_methods JSONB NOT NULL DEFAULT '{"push": true, "email": true, "sms": false}',
    timing JSONB NOT NULL DEFAULT '{"frequency": "weekly", "timeZone": "UTC"}',
    content_types JSONB NOT NULL DEFAULT '{"coaching": true, "reminders": true, "achievements": true, "safety": true, "progress": true}',
    pause_settings JSONB NOT NULL DEFAULT '{"isPaused": false}',
    opt_out_settings JSONB NOT NULL DEFAULT '{"optedOutTypes": []}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Weekly Reminder Settings Table
CREATE TABLE weekly_reminder_settings (
    user_id UUID PRIMARY KEY REFERENCES user_accounts(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
    time_of_day TIME NOT NULL DEFAULT '09:00',
    tone_adjustment JSONB NOT NULL DEFAULT '{"allowToneChange": true, "allowFrequencyChange": true, "allowIntensityChange": true}',
    last_sent TIMESTAMP WITH TIME ZONE,
    next_scheduled TIMESTAMP WITH TIME ZONE
);

-- Indexes for notification settings
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX idx_weekly_reminder_user_id ON weekly_reminder_settings(user_id);
CREATE INDEX idx_weekly_reminder_scheduled ON weekly_reminder_settings(next_scheduled) WHERE is_enabled = true;
CREATE INDEX idx_weekly_reminder_enabled ON weekly_reminder_settings(is_enabled);