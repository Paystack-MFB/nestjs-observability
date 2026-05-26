import { randomUUID } from 'crypto';
export function extractTag(headers) {
    if (!headers) {
        return randomUUID();
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
    return randomUUID();
}
export function getTagHeaderNames() {
    return ['tag', 'x-aws-sqsd-attr-tag'];
}
//# sourceMappingURL=tag-extractor.js.map