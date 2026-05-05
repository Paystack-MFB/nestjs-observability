---
'@paystackhq/nestjs-observability': patch
---

Fix Grafana mislabeling info logs as errors by emitting `severityNumber` on every OpenTelemetry log record.

Previously, `LoggerService` only set `severityText` (e.g. `'INFO'`) when emitting log records. The OpenTelemetry log data model treats `severityNumber` as the canonical severity field — when it is absent, downstream tools fall back to `SEVERITY_NUMBER_UNSPECIFIED`, which Grafana renders as `error`. This surfaced in services consuming this package as `200 OK` API calls showing up with an `error` label in Grafana.

`LoggerService` now maps each log level to its corresponding `SeverityNumber` (`DEBUG`, `INFO`, `WARN`, `ERROR`) and emits both fields. The internal `emit()` method's `level` parameter is also tightened to a `LogLevel` union so the severity lookup is total at compile time — a typo at a callsite is now a build error instead of a silent severity downgrade.

No public API changes. Consumers do not need to update any code; severity in Grafana/DataDog will start rendering correctly after upgrading.
