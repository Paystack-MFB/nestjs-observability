import { describe, it, expect } from 'vitest';
import { extractTag, getTagHeaderNames } from './tag-extractor';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('tag-extractor', () => {
  describe('extractTag', () => {
    it('should extract tag from "tag" header', () => {
      const headers = { tag: 'test-tag-123' };
      const result = extractTag(headers);
      expect(result).toBe('test-tag-123');
    });

    it('should extract tag from "x-aws-sqsd-attr-tag" header when "tag" is missing', () => {
      const headers = { 'x-aws-sqsd-attr-tag': 'sqs-tag-456' };
      const result = extractTag(headers);
      expect(result).toBe('sqs-tag-456');
    });

    it('should prioritize "tag" header over "x-aws-sqsd-attr-tag"', () => {
      const headers = {
        tag: 'direct-tag',
        'x-aws-sqsd-attr-tag': 'sqs-tag',
      };
      const result = extractTag(headers);
      expect(result).toBe('direct-tag');
    });

    it('should handle array header values and use first element', () => {
      const headers = { tag: ['first-tag', 'second-tag'] };
      const result = extractTag(headers);
      expect(result).toBe('first-tag');
    });

    it('should generate UUID when no tag headers are present', () => {
      const headers = { 'content-type': 'application/json' };
      const result = extractTag(headers);
      expect(result).toMatch(uuidRegex);
    });

    it('should generate UUID when headers is undefined', () => {
      const result = extractTag(undefined);
      expect(result).toMatch(uuidRegex);
    });

    it('should generate UUID when headers is empty object', () => {
      const result = extractTag({});
      expect(result).toMatch(uuidRegex);
    });

    it('should generate different UUIDs on each call', () => {
      const tag1 = extractTag({});
      const tag2 = extractTag({});

      expect(tag1).not.toBe(tag2);
    });

    it('should generate UUID when tag header is empty string', () => {
      const result = extractTag({ tag: '' });
      expect(result).toMatch(uuidRegex);
    });

    it('should generate UUID when tag header array contains empty string', () => {
      const result = extractTag({ tag: [''] });
      expect(result).toMatch(uuidRegex);
    });

    it('should generate UUID when tag header contains only whitespace', () => {
      const result = extractTag({ tag: '   ' });
      expect(result).toMatch(uuidRegex);
    });

    it('should generate UUID when SQS header is empty string', () => {
      const result = extractTag({ 'x-aws-sqsd-attr-tag': '' });
      expect(result).toMatch(uuidRegex);
    });

    it('should generate UUID when SQS header array contains empty string', () => {
      const result = extractTag({ 'x-aws-sqsd-attr-tag': [''] });
      expect(result).toMatch(uuidRegex);
    });

    it('should generate UUID when SQS header contains only whitespace', () => {
      const result = extractTag({ 'x-aws-sqsd-attr-tag': '   ' });
      expect(result).toMatch(uuidRegex);
    });

    it('should trim whitespace from valid tag header', () => {
      const result = extractTag({ tag: '  test-tag-123  ' });
      expect(result).toBe('test-tag-123');
    });

    it('should trim whitespace from valid SQS header', () => {
      const result = extractTag({ 'x-aws-sqsd-attr-tag': '  sqs-tag-456  ' });
      expect(result).toBe('sqs-tag-456');
    });
  });

  describe('getTagHeaderNames', () => {
    it('should return array of tag header names', () => {
      const result = getTagHeaderNames();
      expect(result).toEqual(['tag', 'x-aws-sqsd-attr-tag']);
    });
  });
});
