-- Migration 001: Initial Schema
-- Creates the initial database schema for Vitracka Weight Management System

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