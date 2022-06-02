import type { Agent, TraceEvent, ResourceSpan, InstrumentationLibrarySpan } from '@grafana/agent-core';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { IExportTraceServiceRequest, createExportTraceServiceRequest } from '@opentelemetry/otlp-transformer';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

interface GrafanaAgentTraceExporterConfig {
  agent: Agent;
}

export class GrafanaAgentTraceExporter implements SpanExporter {
  constructor(private config: GrafanaAgentTraceExporterConfig) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const traceEvent = exportTraceServiceRequestToTraceEvent(createExportTraceServiceRequest(spans, true));
    this.config.agent.api.pushTraces(traceEvent);
    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }
}

// @TODO temporary, transforming trace export request to earlier version where "scope" -> "instrumentationLibrary"
function exportTraceServiceRequestToTraceEvent(req: IExportTraceServiceRequest): TraceEvent {
  const { resourceSpans, ...rest } = req;
  return {
    ...rest,
    resourceSpans: resourceSpans?.map((rsp): ResourceSpan => {
      const { scopeSpans, ...rest } = rsp;
      return {
        ...rest,
        instrumentationLibrarySpans: scopeSpans?.map((scopeSpan): InstrumentationLibrarySpan => {
          const { scope, ...rest } = scopeSpan;
          return {
            ...rest,
            instrumentationLibrary: scope,
          };
        }),
      };
    }),
  };
}
