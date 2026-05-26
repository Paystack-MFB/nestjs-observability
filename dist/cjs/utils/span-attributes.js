"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSensitivePatterns = addSensitivePatterns;
exports.addSpanAttribute = addSpanAttribute;
exports.addSpanAttributes = addSpanAttributes;
exports.addSpanAttributesUnsafe = addSpanAttributesUnsafe;
exports.addSpanAttributeUnsafe = addSpanAttributeUnsafe;
exports.addSpanEvent = addSpanEvent;
exports.configureAttributeSanitization = configureAttributeSanitization;
exports.getCurrentSpan = getCurrentSpan;
exports.getCurrentSpanId = getCurrentSpanId;
exports.getCurrentTraceId = getCurrentTraceId;
exports.getSanitizationConfig = getSanitizationConfig;
exports.hasActiveSpan = hasActiveSpan;
exports.isSensitiveKey = isSensitiveKey;
exports.recordSpanException = recordSpanException;
exports.setSpanStatus = setSpanStatus;
const api_1 = require("@opentelemetry/api");
const DEFAULT_SENSITIVE_PATTERNS = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /auth/i,
    /bearer/i,
    /jwt/i,
    /credit/i,
    /card/i,
    /ssn/i,
    /social/i,
    /email/i,
    /phone/i,
    /address/i,
];
let globalSanitizationConfig = {
    additionalSensitivePatterns: [],
};
function addSensitivePatterns(patterns) {
    globalSanitizationConfig.additionalSensitivePatterns.push(...patterns);
}
function addSpanAttribute(key, value) {
    const span = getCurrentSpan();
    if (!span) {
        return;
    }
    const sanitizedValue = sanitizeAttributeValue(key, value);
    span.setAttribute(key, sanitizedValue);
}
function addSpanAttributes(attributes) {
    const span = getCurrentSpan();
    if (!span) {
        return;
    }
    for (const [key, value] of Object.entries(attributes)) {
        const sanitizedValue = sanitizeAttributeValue(key, value);
        span.setAttribute(key, sanitizedValue);
    }
}
function addSpanAttributesUnsafe(attributes) {
    const span = getCurrentSpan();
    if (!span) {
        return;
    }
    for (const [key, value] of Object.entries(attributes)) {
        span.setAttribute(key, String(value));
    }
}
function addSpanAttributeUnsafe(key, value) {
    const span = getCurrentSpan();
    if (!span) {
        return;
    }
    span.setAttribute(key, String(value));
}
function addSpanEvent(name, attributes) {
    const span = getCurrentSpan();
    if (!span) {
        return;
    }
    if (attributes) {
        const sanitizedAttributes = {};
        for (const [key, value] of Object.entries(attributes)) {
            sanitizedAttributes[key] = sanitizeAttributeValue(key, value);
        }
        span.addEvent(name, sanitizedAttributes);
    }
    else {
        span.addEvent(name);
    }
}
function configureAttributeSanitization(config) {
    globalSanitizationConfig = {
        ...globalSanitizationConfig,
        ...config,
    };
}
function getCurrentSpan() {
    const span = api_1.trace.getActiveSpan();
    return span ?? undefined;
}
function getCurrentSpanId() {
    const span = getCurrentSpan();
    if (span) {
        const spanContext = span.spanContext();
        return spanContext.spanId;
    }
    return undefined;
}
function getCurrentTraceId() {
    const span = getCurrentSpan();
    if (span) {
        const spanContext = span.spanContext();
        return spanContext.traceId;
    }
    return undefined;
}
function getSanitizationConfig() {
    return { ...globalSanitizationConfig };
}
function hasActiveSpan() {
    return getCurrentSpan() !== undefined;
}
function isSensitiveKey(key) {
    const matchesDefault = DEFAULT_SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
    const matchesAdditional = globalSanitizationConfig.additionalSensitivePatterns.some((pattern) => pattern.test(key));
    return matchesDefault || matchesAdditional;
}
function recordSpanException(exception) {
    const span = getCurrentSpan();
    if (!span) {
        return;
    }
    span.recordException(exception);
    span.setStatus({ code: 2, message: exception.message });
}
function setSpanStatus(status, message) {
    const span = getCurrentSpan();
    if (!span) {
        return;
    }
    const code = status === 'OK' ? 1 : 2;
    if (message) {
        span.setStatus({ code, message });
    }
    else {
        span.setStatus({ code });
    }
}
function getRedactedPlaceholder() {
    return (globalSanitizationConfig.customRedactedPlaceholder ??
        process.env['OTEL_SPAN_ATTRIBUTE_REDACTED_PLACEHOLDER'] ??
        '[REDACTED]');
}
function isSanitizationEnabled() {
    const envValue = process.env['OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED'];
    if (envValue === undefined) {
        return true;
    }
    return envValue.toLowerCase() === 'true' || envValue === '1';
}
function sanitizeAttributeValue(key, value) {
    if (!isSanitizationEnabled()) {
        return String(value);
    }
    if (isSensitiveKey(key)) {
        return getRedactedPlaceholder();
    }
    return String(value);
}
//# sourceMappingURL=span-attributes.js.map