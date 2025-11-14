import { LogRecordExporter } from '@opentelemetry/sdk-logs';

/**
 * Simple JSON stdout exporter for log records (single-line JSON per record)
 */
export class JSONStdoutLogExporter implements LogRecordExporter {
  export(
    logs: Parameters<LogRecordExporter['export']>[0],
    resultCallback: Parameters<LogRecordExporter['export']>[1]
  ): void {
    try {
      for (const record of logs) {
        const traceId = record.spanContext?.traceId;
        const spanId = record.spanContext?.spanId;

        const payload: Record<string, unknown> = {
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
    } catch (error) {
      console.error('JSONStdoutLogExporter failed:', error);
      resultCallback({ code: 1, error: error as Error });
    }
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
