import { useEffect, useState } from "react";

import { env } from "next-runtime-env";

import { api } from "~/utils/api";

/**
 * Converts a VAPID public key (base64url) into the `Uint8Array` the Push API
 * expects for `pushManager.subscribe({ applicationServerKey })`.
 */
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

/**
 * Manages web-push opt-in for the current account on THIS device.
 *
 * `subscribed` is per-device-per-user: `true` only when this browser holds a
 * subscription that is registered to the logged-in user (checked against the
 * server, not just the browser's local state). It is `undefined` while the
 * initial check is loading, `false` when this device has no subscription (or
 * it belongs to a different account), and `true` once wired up.
 *
 * @returns `subscribed` state plus `subscribe` / `unsubscribe` actions that
 *   request notification permission, create/remove the browser subscription,
 *   and sync it to the server.
 */
export const usePushSubscription = () => {
  const vapidKey = env("NEXT_PUBLIC_VAPID_PUBLIC_KEY");

  // This device's local push subscription endpoint, if any.
  // undefined = still checking; null = none on this device; string = endpoint.
  const [localEndpoint, setLocalEndpoint] = useState<string | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setLocalEndpoint(null);
      return;
    }
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setLocalEndpoint(sub?.endpoint ?? null);
      })
      .catch((err) => {
        console.error("Failed to check existing push subscription", err);
        if (!cancelled) setLocalEndpoint(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Per-device-per-user: is THIS browser's subscription registered to the
  // current user? Only ask once we know this device has a subscription.
  const statusQuery = api.notification.getSubscriptionStatus.useQuery(
    { endpoint: localEndpoint ?? null },
    { enabled: typeof localEndpoint === "string" },
  );

  // undefined = loading, false/true = resolved
  const subscribed =
    localEndpoint === undefined
      ? undefined // still detecting the local subscription
      : localEndpoint === null
        ? false // this device has never subscribed
        : statusQuery.data?.subscribed; // DB says it's wired to this user

  const subscribeMutation = api.notification.subscribePush.useMutation({
    onSuccess: () => statusQuery.refetch(),
  });
  const unsubscribeMutation = api.notification.unsubscribe.useMutation({
    onSuccess: () => statusQuery.refetch(),
  });

  const subscribe = async () => {
    if (!("serviceWorker" in navigator) || !vapidKey) return;

    // Request permission up-front — pushManager.subscribe rejects otherwise.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    try {
      const reg = await navigator.serviceWorker.ready;
      // subscribe() returns the existing subscription if one already exists,
      // so re-clicking "Enable" safely re-syncs a leftover local subscription.
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await subscribeMutation.mutateAsync({ subscription: JSON.stringify(sub) });
      setLocalEndpoint(sub.endpoint);
      return sub;
    } catch (err) {
      console.error("Push subscription failed", err);
    }
  };

  const unsubscribe = async () => {
    if (!("serviceWorker" in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await unsubscribeMutation.mutateAsync({ endpoint: sub.endpoint });
      }
      setLocalEndpoint(null);
    } catch (err) {
      console.error("Push unsubscribe failed", err);
    }
  };

  return { subscribed, subscribe, unsubscribe };
};
