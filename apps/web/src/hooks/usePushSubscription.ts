import { env } from "next-runtime-env";
import { useEffect, useState } from "react";

import { api } from "~/utils/api";

type SubscriptionStatus = undefined | boolean;

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export const usePushSubscription = () => {
  const vapidKey = env("NEXT_PUBLIC_VAPID_PUBLIC_KEY");

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

  const statusQuery = api.notification.getSubscriptionStatus.useQuery(
    { endpoint: localEndpoint ?? null },
    { enabled: typeof localEndpoint === "string" },
  );

  const subscribed: SubscriptionStatus =
    localEndpoint === undefined
      ? undefined
      : localEndpoint === null
        ? false
        : statusQuery.data?.subscribed;

  const subscribeMutation = api.notification.subscribePush.useMutation({
    onSuccess: () => statusQuery.refetch(),
  });
  const unsubscribeMutation = api.notification.unsubscribe.useMutation({
    onSuccess: () => statusQuery.refetch(),
  });

  const subscribe = async () => {
    if (!("serviceWorker" in navigator) || !vapidKey) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await subscribeMutation.mutateAsync({
        subscription: JSON.stringify(sub),
      });
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
