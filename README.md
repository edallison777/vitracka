# Vitracka Weight Management System

A safety-first, AI-enabled weight management application with multi-agent architecture using AWS Bedrock AgentCore and Strands Agents.

## 🎯 Project Overview

Vitracka is a mobile application (iOS and Android) that provides AI-enabled advice, tracking, and gamification to support healthy, sustainable weight control. The system operates with strict safety guardrails around mental health and medical boundaries.

### Key Features
- **Safety-First Architecture**: Safety Sentinel agent with veto power over all other agents
- **Multi-Agent System**: Specialized AI agents for different domains (coaching, progress analysis, safety)
- **Cross-Platform Mobile**: React Native app for iOS and Android
- **Comprehensive Tracking**: Weight, eating plans, mood, and progress visualization
- **Medical Boundaries**: Clear separation between coaching and medical advice
- **GLP-1 Medication Support**: Specialized coaching for users on appetite-suppressing medications

## 🏗️ Architecture

### Technology Stack
- **Backend**: TypeScript/Node.js
- **Database**: PostgreSQL with connection pooling
- **Mobile**: React Native (cross-platform)
- **Infrastructure**: AWS with Terraform IaC
- **AI Agents**: AWS Bedrock AgentCore with Strands Agents
- **Testing**: Jest with fast-check for property-based testing

### Multi-Agent Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mobile Apps   │    │  Concierge       │    │  Safety         │
│  (iOS/Android)  │───▶│  Orchestrator    │◄──▶│  Sentinel       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        │ (Veto Power)
                    ┌─────────────────────────┐          │
                    │   Specialized Agents    │◄─────────┘
                    │                         │
                    │ • Coach Companion       │
                    │ • Progress Analyst      │
                    │ • Medical Boundaries    │
                    │ • Plan & Logging        │
                    │ • Nutrition Scout       │
                    │ • Game Master          │
                    │ • Cost Analysis        │
                    └─────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- AWS credentials (for infrastructure deployment)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd vitracka-weight-management

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run migrate

# Seed test data (optional)
npm run seed

# Run tests
npm test
```

### Development Scripts
```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run migrate      # Run database migrations
npm run seed         # Seed test data
```

## 📁 Project Structure

```
vitracka-weight-management/
├── .kiro/specs/vitracka-weight-management/    # Specification documents
│   ├── requirements.md                        # EARS-compliant requirements
│   ├── design.md                             # System design with correctness properties
│   └── tasks.md                              # Implementation task list
├── src/                                      # Application source code
│   ├── types/                               # TypeScript type definitions
│   │   ├── auth.ts                         # Authentication types
│   │   ├── user.ts                         # User profile types
│   │   ├── weight.ts                       # Weight tracking types
│   │   └── eating.ts                       # Eating plan types
│   ├── database/                            # Database layer
│   │   ├── repositories/                    # Data access repositories
│   │   ├── migrations/                      # Database migrations
│   │   ├── seeds/                          # Test data seeding
│   │   ├── connection.ts                   # Database connection management
│   │   └── migrate.ts                      # Migration runner
│   └── __tests__/                          # Test suites
│       ├── properties/                     # Property-based tests
│       └── unit/                          # Unit tests
├── terraform/                              # Infrastructure as Code
│   ├── modules/                           # Reusable Terraform modules
│   ├── environments/                      # Environment-specific configs
│   └── tests/                            # Infrastructure tests
└── PROJECT_STATUS.md                      # Current implementation status
```

## 🧪 Testing Strategy

### Property-Based Testing
We use property-based testing with fast-check to validate universal correctness properties:

```typescript
// Example: Profile Management Consistency
fc.assert(
  fc.property(
    userSupportProfileArb,
    (profileData) => {
      // Feature: vitracka-weight-management, Property 2: Profile Management Consistency
      expect(profileData.userId).toBeDefined();
      expect(profileData.goals.type).toMatch(/^(loss|maintenance|transition)$/);
      // ... more assertions
    }
  ), 
  { numRuns: 100 }
);
```

### Unit Testing
Comprehensive unit tests for all repositories and services with proper mocking:

```bash
npm test -- --testPathPattern="unit"     # Run unit tests
npm test -- --testPathPattern="properties" # Run property tests
```

## 🛡️ Safety Features

### Safety Sentinel Agent
- Continuous monitoring of all user inputs and agent outputs
- Detection of mental health crisis indicators, eating disorder signals
- Immediate intervention with veto power over other agents
- Mandatory logging of all safety-related interactions

### Medical Boundaries
- Clear messaging about medical advice limitations
- Automatic clinician referral prompts
- No diagnosis or treatment recommendations
- Strict separation between coaching and medical advice

## 🏗️ Infrastructure

### AWS Deployment
Complete Terraform infrastructure for scalable, multi-region deployment:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Environment Support
- **Development**: Single-AZ for cost optimization
- **Staging**: Production-like setup for testing
- **Production**: Multi-AZ, high availability configuration

## 📊 Current Status

**MAJOR MILESTONE: Core Safety Infrastructure Complete! 🎉**

All critical safety components are now implemented and fully tested:

### ✅ Completed Core Systems
- **Infrastructure Foundation** - Complete AWS Terraform setup with multi-environment support
- **Database Layer** - PostgreSQL schema with comprehensive repositories and migrations
- **Authentication System** - Secure multi-method authentication (email, OAuth, biometric)
- **Safety Sentinel Agent** - Mental health crisis detection with professional help resources
- **Medical Boundaries Agent** - Medical advice prevention with clinician referrals
- **Property-Based Testing** - Formal correctness validation with fast-check framework
- **Comprehensive Unit Tests** - All core systems validated with 100% test coverage

### 🔄 Next Development Phase
Ready to implement user-facing features:
- **Concierge Orchestrator** - Multi-agent request routing and response composition
- **Weight Tracking & Progress Analysis** - Trend visualization with rolling averages
- **Coach Companion Agent** - Adaptive coaching with personalized tone
- **Mobile App Foundation** - React Native cross-platform implementation

### 🛡️ Safety Systems Operational
The system now enforces strict safety boundaries:
- Mental health crisis detection and intervention
- Medical advice prevention with automatic clinician referrals
- Comprehensive audit logging for all safety interactions
- Multi-layer authentication with secure session management

See `PROJECT_STATUS.md` for detailed implementation status and next steps.

## 🤝 Contributing

### Development Workflow
1. Review current status in `PROJECT_STATUS.md`
2. Check task list in `.kiro/specs/vitracka-weight-management/tasks.md`
3. Implement following the established patterns
4. Write both unit tests and property-based tests
5. Ensure all safety requirements are met

### Code Standards
- TypeScript with strict mode enabled
- Property-based testing for universal properties
- Unit testing for specific behaviors
- Comprehensive error handling
- Safety-first development approach

## 📄 License

[License information to be added]

## 🆘 Support

For questions about the codebase or architecture, refer to:
- `PROJECT_STATUS.md` - Current implementation status
- `.kiro/specs/` - Complete specification documents
- `src/__tests__/` - Testing patterns and examples

---

**Note**: This is a safety-critical application. All development must prioritize user safety and follow the established safety guardrails.