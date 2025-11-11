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
        // Build a minimal, flat JSON suitable for log collectors
        const payload: Record<string, unknown> = {
          attributes: record.attributes,
          body: record.body,
          resource: record.resource.attributes,
          severityText: record.severityText,
          spanId: (record as unknown as { spanId?: string }).spanId,
          timestamp: record.hrTime, // high-resolution time tuple
          traceId: (record as unknown as { traceId?: string }).traceId,
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
