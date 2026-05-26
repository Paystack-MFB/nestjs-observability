const SENSITIVE_FIELDS = [
    'access_token',
    'accesstoken',
    'apikey',
    'bearer',
    'jwt',
    'key',
    'password',
    'pin',
    'secret',
    'secretkey',
    'token',
    'webhook_authentication_token',
    'securitycredential',
    'accountnumber',
    'card',
    'credit',
    'cvc',
    'cvv',
    'number',
    'pan',
    'address',
    'email',
    'identifiervalue',
    'identitynumber',
    'idnumber',
    'phone',
    'social',
    'ssn',
    'surname',
];
let additionalSensitiveFields = [];
export function addSensitiveFields(fields) {
    additionalSensitiveFields.push(...fields.map((f) => f.toLowerCase()));
}
export function getAllSensitiveFields() {
    return [...SENSITIVE_FIELDS, ...additionalSensitiveFields];
}
function isSensitiveField(key) {
    const lowerKey = key.toLowerCase();
    return (SENSITIVE_FIELDS.includes(lowerKey) ||
        additionalSensitiveFields.includes(lowerKey));
}
export function maskSensitiveFields(data, visited = new WeakSet()) {
    if (data === null || data === undefined) {
        return data;
    }
    if (typeof data !== 'object') {
        return data;
    }
    if (data instanceof Date) {
        return data;
    }
    if (visited.has(data)) {
        return '[Circular Reference]';
    }
    visited.add(data);
    if (Array.isArray(data)) {
        return data.map((item) => maskSensitiveFields(item, visited));
    }
    return Object.entries(data).reduce((accumulator, [key, value]) => {
        if (isSensitiveField(key)) {
            return { ...accumulator, [key]: '****' };
        }
        return { ...accumulator, [key]: maskSensitiveFields(value, visited) };
    }, {});
}
export function resetAdditionalSensitiveFields() {
    additionalSensitiveFields = [];
}
//# sourceMappingURL=mask-sensitive-fields.js.map