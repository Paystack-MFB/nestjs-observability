"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTag = extractTag;
exports.getTagHeaderNames = getTagHeaderNames;
const crypto_1 = require("crypto");
function extractTag(headers) {
    if (!headers) {
        return (0, crypto_1.randomUUID)();
    }
    const tagHeader = headers['tag'];
    if (tagHeader) {
        const value = (Array.isArray(tagHeader) ? tagHeader[0] : tagHeader);
        const trimmed = value?.trim();
        if (trimmed) {
            return trimmed;
        }
    }
    const sqsTagHeader = headers['x-aws-sqsd-attr-tag'];
    if (sqsTagHeader) {
        const value = (Array.isArray(sqsTagHeader) ? sqsTagHeader[0] : sqsTagHeader);
        const trimmed = value?.trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return (0, crypto_1.randomUUID)();
}
function getTagHeaderNames() {
    return ['tag', 'x-aws-sqsd-attr-tag'];
}
//# sourceMappingURL=tag-extractor.js.map