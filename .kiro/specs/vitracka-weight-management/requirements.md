# Requirements Document

## Introduction

Vitracka is a mobile application (iOS and Android) that provides AI-enabled advice, tracking, and gamification to support healthy, sustainable weight control. The system operates as a safety-first, behaviourally intelligent companion that supports healthy weight management with or without medication, using AWS Bedrock AgentCore and Strands Agents in a modular multi-agent architecture.

## Glossary

- **Vitracka_System**: The complete AI-enabled weight management application
- **User_Support_Profile**: Persistent user configuration containing goals, preferences, coaching style, and safety parameters
- **Safety_Sentinel**: AI agent with veto power over all other agents for safety enforcement
- **Concierge_Orchestrator**: Primary interface agent that routes requests and composes responses
- **GLP-1_Medication**: Appetite-suppressing medications such as semaglutide
- **Weight_Breach**: Instance where user deviates from their eating plan
- **Clinician_Referral**: Recommendation for user to consult healthcare professionals

## Requirements

### Requirement 1: User Onboarding and Profiling

**User Story:** As a new user, I want to complete a supportive onboarding process, so that the app can provide personalized coaching that matches my goals and preferences.

#### Acceptance Criteria

1. WHEN a new user starts onboarding, THE Vitracka_System SHALL conduct tactful questioning to understand goals, past experiences, strengths, constraints, and triggers
2. WHEN collecting user preferences, THE Vitracka_System SHALL ask about desired coaching tone and interaction style
3. WHEN asking about medical context, THE Vitracka_System SHALL optionally and respectfully inquire about weight-loss medication usage and clinician guidance
4. WHEN onboarding is complete, THE Vitracka_System SHALL generate and persist a User_Support_Profile
5. WHEN a user requests profile changes, THE Vitracka_System SHALL allow review and updates to the User_Support_Profile at any time

### Requirement 2: Safety and Ethical Guardrails

**User Story:** As a user, I want the app to maintain strict safety boundaries, so that I receive appropriate support without harmful advice or medical overreach.

#### Acceptance Criteria

1. THE Vitracka_System SHALL clearly state that it does not provide medical advice
2. WHEN users seek substantial weight loss, THE Vitracka_System SHALL encourage consultation with healthcare professionals
3. THE Vitracka_System SHALL defer all diagnosis, treatment, and medication decisions to clinicians
4. WHEN monitoring user messages, THE Safety_Sentinel SHALL continuously detect signals of depression, anxiety, eating disorders, or self-harm
5. WHEN safety signals are detected, THE Safety_Sentinel SHALL trigger gentle but firm responses with professional help encouragement
6. WHEN safety concerns arise, THE Safety_Sentinel SHALL override all other agent behaviors
7. THE Vitracka_System SHALL support gradual, sustainable weight loss only
8. THE Vitracka_System SHALL not encourage or reward unhealthily low body weight
9. WHEN users reach healthy weight, THE Vitracka_System SHALL treat maintenance as a valid success state

### Requirement 3: Supportive Coaching and Encouragement

**User Story:** As a user, I want ongoing encouragement and coaching, so that I can maintain motivation and develop sustainable habits.

#### Acceptance Criteria

1. THE Vitracka_System SHALL provide ongoing encouragement and reflective coaching
2. THE Vitracka_System SHALL adapt tone and style based on user preferences (gentle, pragmatic, upbeat, structured)
3. THE Vitracka_System SHALL avoid shame-based or punitive language
4. WHEN weekly reminders occur, THE Vitracka_System SHALL allow users to adjust tone, frequency, and coaching intensity
5. THE Vitracka_System SHALL behave like a wise, stable companion rather than a disciplinarian

### Requirement 4: Weight Tracking and Visualization

**User Story:** As a user, I want to track my weight and see progress trends, so that I can understand my journey and stay motivated.

#### Acceptance Criteria

1. THE Vitracka_System SHALL allow daily weight logging
2. THE Vitracka_System SHALL store historical weight data securely
3. WHEN displaying weight data, THE Vitracka_System SHALL present trends graphically using rolling averages
4. THE Vitracka_System SHALL emphasize trends over day-to-day fluctuations
5. WHEN visualizing progress, THE Vitracka_System SHALL support both weight loss and maintenance goals

### Requirement 5: Eating Plans and Logging

**User Story:** As a user, I want to follow and track my eating plan, so that I can maintain consistency while learning from setbacks.

#### Acceptance Criteria

1. THE Vitracka_System SHALL support configurable eating plans including calorie-based approaches and alternative methods
2. THE Vitracka_System SHALL track adherence over time
3. THE Vitracka_System SHALL encourage honest logging including Weight_Breach instances without shame
4. WHEN Weight_Breach occurs, THE Vitracka_System SHALL frame breaches as recoverable events rather than failures
5. THE Vitracka_System SHALL support recovery and return to plan after lapses

### Requirement 6: Nutrition Search and Cost Awareness

**User Story:** As a user, I want to search for food information and alternatives, so that I can make informed, budget-conscious choices.

#### Acceptance Criteria

1. THE Vitracka_System SHALL allow searching for food and drink by nutritional content
2. THE Vitracka_System SHALL include price comparisons from supermarkets and online sources
3. WHEN displaying alternatives, THE Vitracka_System SHALL offer healthier or cheaper options where possible
4. THE Vitracka_System SHALL avoid presenting extreme restriction strategies
5. THE Vitracka_System SHALL provide nutritional information through approved APIs and data sources

### Requirement 7: Gamification System

**User Story:** As a user, I want configurable gamification features, so that I can stay motivated through achievements and progress tracking.

#### Acceptance Criteria

1. THE Vitracka_System SHALL offer configurable gamification to incentivize consistent weight tracking, healthy weight loss, and stable maintenance
2. THE Vitracka_System SHALL reward consistency and honesty in logging
3. THE Vitracka_System SHALL avoid reinforcing starvation or extreme restriction behaviors
4. THE Vitracka_System SHALL adapt gamification to user preferences
5. WHEN Weight_Breach occurs, THE Vitracka_System SHALL incentivize recovery and return to plan
6. THE Vitracka_System SHALL reward honest recording of diet breaches

### Requirement 8: GLP-1 Medication Support

**User Story:** As a user taking appetite-suppressing medication, I want specialized support, so that I can safely manage my weight while on medication.

#### Acceptance Criteria

1. WHEN users indicate GLP-1_Medication usage, THE Vitracka_System SHALL adjust coaching to emphasize nutritional adequacy, muscle preservation, and safe weight loss rates
2. THE Vitracka_System SHALL monitor for under-eating and unhealthy pride in starvation
3. THE Vitracka_System SHALL reframe success as eating well rather than merely eating less
4. THE Vitracka_System SHALL support side-effect-aware behavior without giving medical advice
5. THE Vitracka_System SHALL support long-term maintenance and transition planning

### Requirement 9: Multi-Agent Architecture

**User Story:** As a system architect, I want a modular multi-agent architecture, so that the system is maintainable, explainable, and enforces proper separation of concerns.

#### Acceptance Criteria

1. THE Concierge_Orchestrator SHALL serve as the primary interface with the mobile app and route requests to specialist agents
2. THE Safety_Sentinel SHALL have veto power over all other agents for safety enforcement
3. WHEN agent interactions occur, THE Vitracka_System SHALL maintain clear separation between medical boundaries, coaching, progress analysis, and gamification functions
4. THE Vitracka_System SHALL use AWS Bedrock AgentCore Runtime to host Strands agents
5. THE Vitracka_System SHALL expose internal APIs through AgentCore Gateway for profiles, weights, logs, and achievements

### Requirement 10: Notifications and User Control

**User Story:** As a user, I want to customize my notification preferences, so that I can receive timely support without being overwhelmed.

#### Acceptance Criteria

1. THE Vitracka_System SHALL provide customizable notification settings for reminders, encouragement, and check-ins
2. WHEN users request notification changes, THE Vitracka_System SHALL allow adjustment of frequency, timing, and content types
3. THE Vitracka_System SHALL respect user preferences for notification delivery methods
4. THE Vitracka_System SHALL allow users to temporarily pause or resume notifications
5. THE Vitracka_System SHALL provide opt-out options for all non-critical notifications

### Requirement 11: System Logging and Audit Trail

**User Story:** As a system administrator, I want comprehensive logging of agent interactions, so that I can ensure system quality and safety compliance.

#### Acceptance Criteria

1. THE Vitracka_System SHALL log a summary of all agent interactions in accordance with data security requirements
2. THE Vitracka_System SHALL maintain audit trails for system decisions and user interactions
3. WHEN Safety_Sentinel flags content for mental health concerns, eating disorders, suicide, self-harm, or other serious issues, THE Vitracka_System SHALL compulsorily log and flag these interactions
4. THE Vitracka_System SHALL enable regular review of flagged interactions by system administrators
5. THE Vitracka_System SHALL maintain logs for compliance, debugging, and quality assurance purposes

### Requirement 12: External Knowledge Integration

**User Story:** As a user, I want access to comprehensive and up-to-date nutrition information, so that I can make informed decisions about my food choices.

#### Acceptance Criteria

1. THE Vitracka_System SHALL integrate with MCP servers for external knowledge resources including nutrition databases
2. THE Vitracka_System SHALL access real-time nutritional information through approved external APIs
3. THE Vitracka_System SHALL maintain interoperability with external food and nutrition data sources
4. WHEN external knowledge is unavailable, THE Vitracka_System SHALL gracefully handle service interruptions
5. THE Vitracka_System SHALL validate and sanitize external data before presenting to users

### Requirement 16: Business Intelligence and Cost Management

**User Story:** As a business owner, I want comprehensive cost analysis and profitability monitoring, so that I can make informed decisions about pricing and infrastructure optimization.

#### Acceptance Criteria

1. THE Cost_Analysis_Agent SHALL monitor AWS infrastructure costs and usage patterns in real-time
2. THE Cost_Analysis_Agent SHALL calculate per-user operational costs across all services
3. THE Cost_Analysis_Agent SHALL generate subscription pricing recommendations based on cost analysis and target profit margins
4. THE Vitracka_System SHALL automatically scale resources based on user demand while optimizing costs
5. THE Vitracka_System SHALL maintain performance standards during scaling operations

### Requirement 17: International Expansion Readiness

**User Story:** As a business owner, I want the system designed for international expansion, so that I can enter new markets without costly redesign.

#### Acceptance Criteria

1. THE Vitracka_System SHALL be deployed through comprehensive Terraform scripts for infrastructure as code
2. THE Vitracka_System SHALL maintain separate Terraform configurations for development, staging, and production environments
3. THE Vitracka_System SHALL be initially deployed in eu-west-2 AWS region
4. THE Vitracka_System SHALL support multi-region deployment architecture for future expansion
5. THE Vitracka_System SHALL include localization framework for multiple languages and currencies
6. THE Vitracka_System SHALL comply with regional data protection regulations (GDPR, etc.)
7. THE Vitracka_System SHALL support time zone-aware coaching and notifications

### Requirement 18: Cross-Platform Mobile Support

**User Story:** As a user, I want to access Vitracka on both iPhone and Android devices, so that I can use the app regardless of my mobile platform preference.

#### Acceptance Criteria

1. THE Vitracka_System SHALL provide full functionality on iOS devices running iOS 14.0 or later
2. THE Vitracka_System SHALL provide full functionality on Android devices running Android API level 24 (Android 7.0) or later
3. THE Vitracka_System SHALL maintain feature parity between iOS and Android versions
4. THE Vitracka_System SHALL provide consistent user experience across both platforms
5. THE Vitracka_System SHALL support platform-specific design guidelines (iOS Human Interface Guidelines and Android Material Design)

### Requirement 19: Data Security and Privacy

**User Story:** As a user, I want my personal health data to be secure and private, so that I can trust the app with sensitive information.

#### Acceptance Criteria

1. THE Vitracka_System SHALL store all user data securely using AWS security best practices
2. THE Vitracka_System SHALL encrypt sensitive health information at rest and in transit
3. THE Vitracka_System SHALL implement proper access controls for user data
4. THE Vitracka_System SHALL allow users to export or delete their data upon request
5. THE Vitracka_System SHALL comply with relevant health data privacy regulations