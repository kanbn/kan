import { useEffect, useState } from "react";

import { env } from "~/env";

export const useSwUpdate = () => {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (env.NODE_ENV !== "production") return;

    const reloadOnActivate = () => window.location.reload();

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      reloadOnActivate,
    );

    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (!reg) return;
        if (reg.waiting) setUpdateReady(true);

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setUpdateReady(true);
            }
          });
        });
      })
      .catch((err) => console.error("SW update check fail", err));

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        reloadOnActivate,
      );
    };
  }, []);

  const applyUpdate = () => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
      })
      .catch((err) => console.error("SW apply update fail", err));
  };

  return { updateReady, applyUpdate };
};
