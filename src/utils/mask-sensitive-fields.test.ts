import { describe, it, expect, beforeEach } from 'vitest';

import {
  addSensitiveFields,
  getAllSensitiveFields,
  maskSensitiveFields,
  resetAdditionalSensitiveFields,
} from './mask-sensitive-fields';

describe('maskSensitiveFields', () => {
  beforeEach(() => {
    // Reset additional fields before each test
    resetAdditionalSensitiveFields();
  });

  it('should mask sensitive keys in objects', () => {
    const data = {
      username: 'john_doe',
      password: 'secret123',
      apiKey: 'abc123',
      email: 'john@example.com',
      token: 'bearer_token_here',
    };

    const result = maskSensitiveFields(data);

    expect(result).toEqual({
      username: 'john_doe',
      password: '[MASKED]',
      apiKey: '[MASKED]',
      email: '[MASKED]',
      token: '[MASKED]',
    });
  });

  it('should handle arrays with sensitive data', () => {
    const data = [
      { name: 'user1', password: 'pass1' },
      { name: 'user2', secret: 'secret2' },
    ];

    const result = maskSensitiveFields(data);

    expect(result).toEqual([
      { name: 'user1', password: '[MASKED]' },
      { name: 'user2', secret: '[MASKED]' },
    ]);
  });

  it('should handle nested objects', () => {
    const data = {
      user: {
        name: 'John',
        credentials: {
          password: 'secret',
          apiKey: 'key123',
        },
      },
      settings: {
        public: true,
        secret: 'hidden',
      },
    };

    const result = maskSensitiveFields(data);

    expect(result).toEqual({
      user: {
        name: 'John',
        credentials: {
          password: '[MASKED]',
          apiKey: '[MASKED]',
        },
      },
      settings: {
        public: true,
        secret: '[MASKED]',
      },
    });
  });

  it('should preserve primitive values', () => {
    expect(maskSensitiveFields('string')).toBe('string');
    expect(maskSensitiveFields(123)).toBe(123);
    expect(maskSensitiveFields(true)).toBe(true);
    expect(maskSensitiveFields(null)).toBe(null);
    expect(maskSensitiveFields(undefined)).toBe(undefined);
  });

  it('should preserve Date objects', () => {
    const date = new Date('2023-01-01');
    expect(maskSensitiveFields(date)).toBe(date);
  });

  it('should handle circular references', () => {
    const data: { name: string; self?: unknown } = { name: 'test' };
    data.self = data;

    const result = maskSensitiveFields(data);
    expect(result).toEqual({
      name: 'test',
      self: '[Circular Reference]',
    });
  });

  it('should be case-insensitive for sensitive keys', () => {
    const data = {
      PASSWORD: 'secret',
      ApiKey: 'key123',
      TOKEN: 'bearer',
      normalField: 'value',
    };

    const result = maskSensitiveFields(data);

    expect(result).toEqual({
      PASSWORD: '[MASKED]',
      ApiKey: '[MASKED]',
      TOKEN: '[MASKED]',
      normalField: 'value',
    });
  });

  it('should handle empty objects and arrays', () => {
    expect(maskSensitiveFields({})).toEqual({});
    expect(maskSensitiveFields([])).toEqual([]);
  });

  it('should mask payment-related fields', () => {
    const data = {
      transaction: {
        amount: 10000,
        pan: '1234567890123456',
        cvv: '123',
        card: { number: '4111111111111111' },
        accountNumber: '0123456789',
      },
    };

    const result = maskSensitiveFields(data);

    expect(result).toEqual({
      transaction: {
        amount: 10000,
        pan: '[MASKED]',
        cvv: '[MASKED]',
        card: '[MASKED]',
        accountNumber: '[MASKED]',
      },
    });
  });

  it('should mask PII fields', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      address: '123 Main St',
      ssn: '123-45-6789',
      surname: 'Doe',
    };

    const result = maskSensitiveFields(data);

    expect(result).toEqual({
      name: 'John Doe',
      email: '[MASKED]',
      phone: '[MASKED]',
      address: '[MASKED]',
      ssn: '[MASKED]',
      surname: '[MASKED]',
    });
  });

  describe('addSensitiveFields', () => {
    it('should allow adding custom sensitive fields', () => {
      addSensitiveFields(['customField', 'internalSecret']);

      const data = {
        username: 'john',
        customField: 'should-be-masked',
        internalSecret: 'also-masked',
        normalField: 'visible',
      };

      const result = maskSensitiveFields(data);

      expect(result).toEqual({
        username: 'john',
        customField: '[MASKED]',
        internalSecret: '[MASKED]',
        normalField: 'visible',
      });
    });

    it('should handle custom fields case-insensitively', () => {
      addSensitiveFields(['CustomField']);

      const data = {
        customfield: 'should-be-masked',
        CUSTOMFIELD: 'also-masked',
      };

      const result = maskSensitiveFields(data);

      expect(result).toEqual({
        customfield: '[MASKED]',
        CUSTOMFIELD: '[MASKED]',
      });
    });
  });

  describe('getAllSensitiveFields', () => {
    it('should return all sensitive fields including additional ones', () => {
      addSensitiveFields(['custom1', 'custom2']);

      const fields = getAllSensitiveFields();

      expect(fields).toContain('password');
      expect(fields).toContain('token');
      expect(fields).toContain('custom1');
      expect(fields).toContain('custom2');
    });
  });
});
