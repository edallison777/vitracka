-- Test data seeding for development and testing
-- Creates sample data for the Vitracka Weight Management System

-- Insert test user accounts
INSERT INTO user_accounts (id, email, password_hash, auth_method, email_verified, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'test.user@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMye.Uo04/OjEKEHim.AWEwtOWbOcbz6flK', 'email', true, true),
('550e8400-e29b-41d4-a716-446655440002', 'jane.doe@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMye.Uo04/OjEKEHim.AWEwtOWbOcbz6flK', 'email', true, true),
('550e8400-e29b-41d4-a716-446655440003', NULL, NULL, 'google', true, true);

-- Update google_id for the Google auth user
UPDATE user_accounts SET google_id = 'google_123456789' WHERE id = '550e8400-e29b-41d4-a716-446655440003';

-- Insert user support profiles
INSERT INTO user_support_profiles (
    user_id, account_id, goal_type, target_weight, timeframe, weekly_goal,
    coaching_style, gamification_level, notification_frequency, reminder_times,
    on_glp1_medication, has_clinician_guidance, medication_details,
    risk_factors, trigger_words
) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'loss',
    70.0,
    '6 months',
    0.5,
    'gentle',
    'moderate',
    'daily',
    ARRAY['08:00', '18:00'],
    false,
    true,
    NULL,
    ARRAY['stress eating'],
    ARRAY[]
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'maintenance',
    NULL,
    NULL,
    NULL,
    'upbeat',
    'high',
    'weekly',
    ARRAY['09:00'],
    true,
    true,
    'Semaglutide 0.5mg weekly',
    ARRAY[],
    ARRAY[]
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    'loss',
    65.0,
    '4 months',
    0.75,
    'structured',
    'minimal',
    'daily',
    ARRAY['07:30', '19:30'],
    false,
    false,
    NULL,
    ARRAY[],
    ARRAY[]
);

-- Insert sample weight entries
INSERT INTO weight_entries (user_id, weight, unit, notes, mood, confidence) VALUES
('550e8400-e29b-41d4-a716-446655440001', 75.5, 'kg', 'Morning weight after workout', 'good', 4),
('550e8400-e29b-41d4-a716-446655440001', 75.2, 'kg', 'Feeling lighter today', 'great', 5),
('550e8400-e29b-41d4-a716-446655440002', 68.0, 'kg', 'Stable maintenance weight', 'good', 4),
('550e8400-e29b-41d4-a716-446655440003', 72.1, 'kg', 'Starting weight', 'okay', 3);

-- Insert sample eating plans
INSERT INTO eating_plans (user_id, type, daily_target, restrictions, preferences, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'calorie', 1800.0, ARRAY['gluten'], ARRAY['vegetarian'], true),
('550e8400-e29b-41d4-a716-446655440002', 'points', 25.0, ARRAY[], ARRAY['low-carb'], true),
('550e8400-e29b-41d4-a716-446655440003', 'calorie', 1600.0, ARRAY['dairy'], ARRAY['high-protein'], true);

-- Insert sample safety intervention (for testing purposes only)
INSERT INTO safety_interventions (
    user_id, trigger_type, trigger_content, agent_response, 
    escalation_level, admin_notified, follow_up_required
) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'eating_disorder',
    'I feel like I need to restrict more',
    'I understand you''re feeling this way, but it''s important to maintain healthy eating patterns. Would you like to talk to a healthcare professional about these feelings?',
    'medium',
    true,
    true
);