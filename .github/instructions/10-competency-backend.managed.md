<!--
This file is managed by @paystackhq/pkg-ai-coding-rules
Do not edit manually - changes will be overwritten
Source: bundles/competency/backend.md
-->

# Backend Competency Rules

## API Design

- API responses must be consistent in structure across the application
- Use appropriate HTTP status codes (2xx for success, 4xx for client errors, 5xx for server errors)
- Validate all input data at the API boundary before processing
- API endpoints should be idempotent where possible

## Error Handling

- Always return meaningful error messages that help diagnose issues without exposing sensitive implementation details
- Log errors with sufficient context (request ID, user ID, relevant parameters) for debugging
- Never expose stack traces or internal system details to API consumers
- Handle database connection failures and timeouts gracefully

## Data Access

- Prevent SQL injection by using parameterized queries or query builders rather than string concatenation
- Keep database transactions as short as possible
- Ensure database connections are properly closed, even when errors occur
- Use connection pooling for database access

## Security

- Never log or expose authentication tokens, passwords, or sensitive user data
- Validate and sanitize all user input to prevent injection attacks

## Asynchronous Operations

- Handle promise rejections explicitly - never leave promises unhandled
- Avoid blocking operations in request handlers

## Testing

- Use the AAA (Arrange-Act-Assert) pattern for test structure
- Test error conditions and edge cases, not just happy paths
- Use real database instances in tests, not mocks (except for external HTTP services)
