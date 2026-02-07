# Vitracka Development Guide

## 🎯 Quick Resume Instructions

If you're resuming development after a session break, follow these steps:

### 1. Check Current Status
```bash
# Read the current project status
cat PROJECT_STATUS.md

# Check task progress
cat .kiro/specs/vitracka-weight-management/tasks.md
```

### 2. Verify Environment
```bash
# Install dependencies if needed
npm install

# Run tests to verify everything works
npm test

# Check if database connection works (if DB is set up)
npm run migrate
```

### 3. Identify Next Task
- Open `.kiro/specs/vitracka-weight-management/tasks.md`
- Look for tasks marked with `[ ]` (not started) or `[-]` (in progress)
- The next logical task is **Task 3: Authentication System Implementation**

## 📋 Implementation Patterns

### Repository Pattern
All data access follows the repository pattern established in `src/database/repositories/`:

```typescript
export class ExampleRepository {
  private db = DatabaseConnection.getInstance();

  async create(data: Omit<Entity, 'id' | 'createdAt'>): Promise<Entity> {
    // Implementation with proper SQL and validation
  }

  async findById(id: string): Promise<Entity | null> {
    // Implementation with error handling
  }

  private mapRowToEntity(row: any): Entity {
    // Map database row to TypeScript interface
  }
}
```

### Testing Pattern
Every feature needs both unit tests and property-based tests:

```typescript
// Property-based test (universal properties)
it('should maintain consistency for all valid operations', () => {
  fc.assert(
    fc.property(
      arbitraryGenerator,
      (data) => {
        // Feature: vitracka-weight-management, Property X: Description
        // Test universal properties that should hold for ALL inputs
      }
    ), 
    { numRuns: 100 }
  );
});

// Unit test (specific examples)
it('should handle specific edge case', async () => {
  // Test specific behavior with mocked dependencies
});
```

### Safety-First Development
Every agent and feature must consider safety:

```typescript
// Always check for safety triggers
if (containsSafetyTriggers(userInput)) {
  return safetySentinel.handleIntervention(userInput);
}

// Log safety-related interactions
await safetyLogger.log({
  userId,
  triggerType: 'eating_disorder',
  content: userInput,
  response: interventionResponse
});
```

## 🔄 Next Implementation Steps

### Task 3: Authentication System Implementation

**Files to Create/Modify:**
```
src/
├── services/
│   ├── AuthService.ts              # Main authentication service
│   ├── JWTService.ts              # JWT token management
│   └── OAuthService.ts            # OAuth integration
├── middleware/
│   └── AuthMiddleware.ts          # Authentication middleware
└── __tests__/
    ├── unit/services/             # Unit tests for services
    └── properties/                # Property tests for auth
```

**Implementation Order:**
1. Create `AuthService.ts` with password hashing
2. Implement `JWTService.ts` for token management
3. Add OAuth integration in `OAuthService.ts`
4. Write property tests for authentication security
5. Write unit tests for each service
6. Create authentication middleware

### Task 4: Safety Sentinel Agent

**Files to Create:**
```
src/
├── agents/
│   ├── SafetySentinelAgent.ts     # Core safety agent
│   ├── TriggerDetector.ts         # Safety trigger detection
│   └── InterventionGenerator.ts   # Response generation
├── services/
│   └── SafetyLogger.ts            # Safety audit logging
└── __tests__/
    └── agents/                    # Agent tests
```

## 🧪 Testing Guidelines

### Property-Based Test Creation
1. **Identify Universal Properties**: What should be true for ALL valid inputs?
2. **Create Generators**: Use fast-check to generate test data
3. **Write Assertions**: Test the universal property
4. **Reference Design**: Tag with property number from design.md

### Unit Test Creation
1. **Mock Dependencies**: Use Jest mocks for external dependencies
2. **Test Edge Cases**: Focus on error conditions and boundaries
3. **Verify Behavior**: Test specific expected behaviors
4. **Follow Patterns**: Use existing tests as templates

### Running Tests
```bash
# Run all tests
npm test

# Run specific test types
npm test -- --testPathPattern="properties"
npm test -- --testPathPattern="unit"

# Run specific test file
npm test -- --testPathPattern="AuthService"

# Run with coverage
npm test -- --coverage
```

## 🏗️ Architecture Decisions

### Database Layer
- **Connection Pooling**: Using pg.Pool for efficient connections
- **Migrations**: Versioned migrations with rollback support
- **Repositories**: Clean separation between business logic and data access
- **Validation**: Database constraints + application validation

### Type Safety
- **Strict TypeScript**: All code must pass strict type checking
- **Interface Definitions**: Clear contracts between layers
- **Validation**: Runtime validation for external data
- **Error Types**: Typed error handling

### Agent Architecture
- **Separation of Concerns**: Each agent has a specific responsibility
- **Safety Override**: Safety Sentinel can veto any other agent
- **Medical Boundaries**: Medical Boundaries Agent prevents medical advice
- **Logging**: All agent interactions are logged
- **Modularity**: Agents can be developed and tested independently

## 🛡️ Implemented Safety Systems

### Safety Sentinel Agent ✅
- **Location**: `src/services/SafetySentinelService.ts`
- **Purpose**: Continuous monitoring with veto power over all agents
- **Triggers**: Mental health, eating disorders, self-harm detection
- **Response**: Immediate intervention with professional help resources
- **Testing**: Property-based tests (Property 3) and comprehensive unit tests

### Medical Boundaries Agent ✅
- **Location**: `src/services/MedicalBoundariesService.ts`
- **Purpose**: Prevent medical advice and redirect to healthcare professionals
- **Detection**: Diagnosis, treatment, medication, substantial weight loss requests
- **Response**: Clinician referral with appropriate disclaimers
- **Testing**: Property-based tests (Property 4) and comprehensive unit tests

### Authentication System ✅
- **Location**: `src/services/AuthenticationService.ts`
- **Methods**: Email/password, Google OAuth, Facebook OAuth, biometric
- **Security**: bcrypt password hashing, JWT tokens, secure sessions
- **Testing**: Property-based tests (Property 1) and comprehensive unit tests

## 🚨 Safety Requirements

### Critical Safety Rules
1. **No Medical Advice**: Never provide diagnosis, treatment, or medication advice
2. **Safety Triggers**: Always detect and respond to mental health crisis indicators
3. **Veto Power**: Safety Sentinel must be able to override any other agent
4. **Medical Boundaries**: All medical requests must be redirected to healthcare professionals
5. **Audit Logging**: All safety interventions must be logged for review
4. **Mandatory Logging**: All safety-related interactions must be logged
5. **Professional Referral**: Always direct users to healthcare professionals when appropriate

### Safety Trigger Detection
Monitor for these patterns:
- Eating disorder keywords: "purge", "starve", "restrict", "binge"
- Self-harm indicators: "hurt myself", "not worth it", "end it all"
- Extreme weight loss goals: BMI targets below healthy ranges
- Medication misuse: "skip doses", "double dose", "stop taking"

## 📚 Key Resources

### Specification Documents
- **Requirements**: `.kiro/specs/vitracka-weight-management/requirements.md`
- **Design**: `.kiro/specs/vitracka-weight-management/design.md`
- **Tasks**: `.kiro/specs/vitracka-weight-management/tasks.md`

### Implementation References
- **Type Definitions**: `src/types/`
- **Repository Pattern**: `src/database/repositories/`
- **Test Patterns**: `src/__tests__/`
- **Database Schema**: `src/database/schema.sql`

### External Documentation
- [Fast-check Documentation](https://fast-check.dev/) - Property-based testing
- [Jest Documentation](https://jestjs.io/) - Unit testing framework
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - Database
- [AWS Bedrock AgentCore](https://docs.aws.amazon.com/bedrock/) - AI agents

## 🔧 Troubleshooting

### Common Issues
1. **Database Connection**: Check `.env` file and PostgreSQL service
2. **Test Failures**: Review mocking setup and test isolation
3. **TypeScript Errors**: Ensure all types are properly defined
4. **Property Test Failures**: Improve generators rather than relaxing properties

### Debug Commands
```bash
# Check database connection
npm run migrate

# Verify TypeScript compilation
npm run build

# Run tests with verbose output
npm test -- --verbose

# Check test coverage
npm test -- --coverage
```

This guide provides everything needed to resume development efficiently and maintain the established patterns and safety requirements.