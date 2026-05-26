export class JSONStdoutLogExporter {
    export(logs, resultCallback) {
        try {
            for (const record of logs) {
                const traceId = record.spanContext?.traceId;
                const spanId = record.spanContext?.spanId;
                const payload = {
                    body: record.body,
                    severityText: record.severityText,
                    timestamp: record.hrTime,
                    ...(traceId && { traceId }),
                    ...(spanId && { spanId }),
                    attributes: record.attributes,
                    resource: record.resource.attributes,
                };
                console.log(JSON.stringify(payload));
            }
            resultCallback({ code: 0 });
        }
        catch (error) {
            console.error('JSONStdoutLogExporter failed:', error);
            resultCallback({ code: 1, error: error });
        }
    }
    shutdown() {
        return Promise.resolve();
    }
}
//# sourceMappingURL=json-log-exporter.js.map