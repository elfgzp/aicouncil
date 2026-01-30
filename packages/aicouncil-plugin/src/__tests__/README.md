# AICouncil Plugin Tests

## Test Structure

```
src/__tests__/
├── integration/           # Integration tests
│   └── council.integration.test.ts
├── mocks/                 # Mock utilities
│   └── providers.ts
└── utils/                 # Test helpers
    └── test-helpers.ts

src/
├── utils/
│   └── index.test.ts     # Unit tests alongside source
├── core/
│   ├── council.test.ts
│   ├── participant.test.ts
│   └── round.test.ts
├── providers/
│   └── adapter.test.ts
├── i18n/
│   └── index.test.ts
└── tools/
    ├── setup.test.ts
    ├── discuss.test.ts
    ├── status.test.ts
    ├── next.test.ts
    ├── end.test.ts
    └── models.test.ts
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- src/core/council.test.ts

# Run integration tests only
npm test -- --testPathPattern=integration
```

## Test Categories

### Unit Tests

Test individual modules in isolation:

- **Utils**: Helper functions, event emitter, retry logic
- **Core**: Council orchestration, participant management, round lifecycle
- **Providers**: Adapter pattern, API calls, error handling
- **i18n**: Translations, locale switching, interpolation
- **Tools**: Command validation, execution, output formatting

### Integration Tests

Test complete workflows:

- Full discussion flow with multiple rounds
- Error recovery and retry mechanisms
- State management across operations
- Configuration handling

## Mocking

### Provider Adapter

```typescript
import { providerAdapter } from '../providers/adapter'

vi.mocked(providerAdapter.call).mockResolvedValue({
  content: 'Mock response'
})
```

### Mock Factory

```typescript
import { createMockParticipant, createMockResponse } from './mocks/providers'

const participant = createMockParticipant({ isHost: true })
const response = createMockResponse('Hello')
```

## Best Practices

1. **Isolate tests**: Reset state in `beforeEach`
2. **Mock external dependencies**: Don't call real APIs
3. **Test edge cases**: Errors, timeouts, empty inputs
4. **Use descriptive names**: `it('should handle timeout errors')`
5. **Keep tests fast**: Avoid real timers, use mocks

## Coverage Goals

- Core modules: >90%
- Tools: >85%
- Utilities: >80%
- Overall: >85%
