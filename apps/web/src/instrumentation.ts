export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PUBLIC_KAN_ENV !== "cloud" ||
    !process.env.AXIOM_TOKEN ||
    !process.env.AXIOM_DATASET
  ) {
    return;
  }

  const { NodeSDK } = await import("@opentelemetry/sdk-node");
  const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-http");
  const { getNodeAutoInstrumentations } = await import("@opentelemetry/auto-instrumentations-node");

  const sdk = new NodeSDK({
    serviceName: "kan",
    traceExporter: new OTLPTraceExporter({
      url: "https://api.axiom.co/v1/traces",
      headers: {
        Authorization: `Bearer ${process.env.AXIOM_TOKEN}`,
        "X-Axiom-Dataset": process.env.AXIOM_DATASET,
      },
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();
}
