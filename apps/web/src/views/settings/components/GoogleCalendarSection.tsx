import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import { HiMiniArrowTopRightOnSquare } from "react-icons/hi2";

import Button from "~/components/Button";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

export default function GoogleCalendarSection() {
  const { showPopup } = usePopup();
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: status, refetch: refetchStatus } =
    api.googleCalendar.status.useQuery();
  const { data: authUrlData, refetch: refetchAuthUrl } =
    api.googleCalendar.getAuthUrl.useQuery(undefined, {
      enabled: status?.connected === false,
    });

  const { mutateAsync: connect } = api.googleCalendar.connect.useMutation({
    onSuccess: () => {
      void refetchStatus();
      showPopup({
        header: t`Google Calendar connected`,
        message: t`Your Google Calendar is now connected. Task due dates will sync automatically.`,
        icon: "success",
      });
    },
    onError: () => {
      showPopup({
        header: t`Couldn't connect Google Calendar`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const { mutateAsync: disconnect } = api.googleCalendar.disconnect.useMutation(
    {
      onSuccess: () => {
        void refetchStatus();
        showPopup({
          header: t`Google Calendar disconnected`,
          message: t`Your Google Calendar has been disconnected.`,
          icon: "success",
        });
      },
      onError: () => {
        showPopup({
          header: t`Couldn't disconnect Google Calendar`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        });
      },
    },
  );

  useEffect(() => {
    const { google_calendar: action, code } = router.query;

    if (action === "callback" && typeof code === "string") {
      void router.replace("/settings/integrations", undefined, {
        shallow: true,
      });

      setIsConnecting(true);
      connect({ code }).finally(() => {
        setIsConnecting(false);
      });
    }

    if (action === "error") {
      void router.replace("/settings/integrations", undefined, {
        shallow: true,
      });
      showPopup({
        header: t`Connection failed`,
        message: t`Google Calendar connection was cancelled or failed.`,
        icon: "error",
      });
    }
  }, [router.query, connect, showPopup, router]);

  const handleConnect = () => {
    if (authUrlData?.url) {
      window.open(
        authUrlData.url,
        "google_calendar_auth",
        "height=700,width=500",
      );
    }
  };

  return (
    <div className="mb-8 border-t border-light-300 dark:border-dark-300">
      <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
        {t`Google Calendar`}
      </h2>

      {!status?.connected ? (
        <>
          <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
            {t`Connect your Google Calendar to sync your assigned tasks' due dates instantly.`}
          </p>
          <Button
            variant="primary"
            iconRight={<HiMiniArrowTopRightOnSquare />}
            isLoading={isConnecting}
            onClick={handleConnect}
          >
            {t`Connect Google Calendar`}
          </Button>
        </>
      ) : (
        <>
          <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
            {t`Your Google Calendar is connected. Tasks with due dates will sync automatically.`}
          </p>
          <Button variant="secondary" onClick={() => disconnect()}>
            {t`Disconnect Google Calendar`}
          </Button>
        </>
      )}
    </div>
  );
}
