# @paystackhq/nestjs-observability

## 0.1.4

### Patch Changes

- **chore**: Update OpenTelemetry dependencies to consistent versions
  - Updated `@opentelemetry/api-logs` to `^0.54.0`
  - Updated `@opentelemetry/sdk-logs` to `^0.54.0`
  - Updated `@opentelemetry/exporter-logs-otlp-http` to `^0.54.0`
  - Ensures compatibility across all OpenTelemetry packages

## 0.1.3

### Patch Changes

- **fix**: Resolve OTLP logs undefined issue by properly structuring log record body
  - Fixed log record body structure to use `AnyValueMap` instead of JSON string
  - Added `@opentelemetry/api-logs` and `prom-client` dependencies
  - Added comprehensive OTLP export tests
  - OpenTelemetry collector now receives properly structured log data instead of `undefined`
- **fix**: Align example app NestJS versions with main package to resolve type conflicts
  - Updated example app dependencies to match main package versions
  - Resolved TypeScript compilation errors in example app

## 0.1.2

### Patch Changes

- Fix: Updated the log format to match the required structure.

## 0.1.1

### Patch Changes

- 5b4b7b3: Initial release
