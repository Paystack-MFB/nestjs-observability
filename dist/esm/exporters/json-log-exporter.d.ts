import { LogRecordExporter } from '@opentelemetry/sdk-logs';
export declare class JSONStdoutLogExporter implements LogRecordExporter {
    export(logs: Parameters<LogRecordExporter['export']>[0], resultCallback: Parameters<LogRecordExporter['export']>[1]): void;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=json-log-exporter.d.ts.map