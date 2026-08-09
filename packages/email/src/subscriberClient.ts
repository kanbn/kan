import { createLogger } from "@kan/logger";

const log = createLogger("subscriberClient");

export const subscriberClient =
  process.env.NEXT_PUBLIC_KAN_ENV === "cloud" &&
  process.env.SUBSCRIBER_API_URL &&
  process.env.SUBSCRIBER_API_KEY &&
  process.env.SUBSCRIBER_ENVIRONMENT_ID
    ? {
        apiUrl: process.env.SUBSCRIBER_API_URL,
        apiKey: process.env.SUBSCRIBER_API_KEY,
        environmentId: process.env.SUBSCRIBER_ENVIRONMENT_ID,
      }
    : null;

async function subscriberRequest(
  method: string,
  path: string,
  body: unknown,
  errorMessage: string,
) {
  if (!subscriberClient) return;

  const url = `${subscriberClient.apiUrl}${path}`;

  log.debug({ method, url, body }, "subscriber.dev request");

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": subscriberClient.apiKey,
      },
      body: JSON.stringify(body),
    });

    const responseBody = await response.text().catch(() => undefined);

    log.debug(
      { method, url, status: response.status, body: responseBody },
      "subscriber.dev response",
    );

    if (!response.ok) {
      log.error(
        { status: response.status, body: responseBody },
        errorMessage,
      );
    }
  } catch (error) {
    log.error({ err: error }, errorMessage);
  }
}

interface CreateSubscriberInput {
  publicId: string;
  email: string;
  externalId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  attributes?: Record<string, unknown>;
}

export async function createSubscriber(input: CreateSubscriberInput) {
  if (!subscriberClient) return;

  await subscriberRequest(
    "POST",
    `/environments/${subscriberClient.environmentId}/subscribers`,
    input,
    "Failed to create subscriber.dev subscriber",
  );
}

interface UpdateSubscriberPreferencesInput {
  email: boolean;
}

export async function updateSubscriberPreferences(
  subscriberId: string,
  input: UpdateSubscriberPreferencesInput,
) {
  if (!subscriberClient) return;

  await subscriberRequest(
    "PATCH",
    `/environments/${subscriberClient.environmentId}/subscribers/${subscriberId}/preferences`,
    input,
    "Failed to update subscriber preferences",
  );
}

interface TriggerWorkflowSubscriberInput {
  publicId?: string;
  externalId?: string;
  email?: string;
}

export async function triggerSubscriberWorkflow(
  key: string,
  subscriber: TriggerWorkflowSubscriberInput,
  payload?: Record<string, unknown>,
) {
  if (!subscriberClient) return;

  await subscriberRequest(
    "POST",
    `/environments/${subscriberClient.environmentId}/workflows/trigger`,
    { key, subscriber, payload },
    "Failed to trigger subscriber.dev workflow",
  );
}
