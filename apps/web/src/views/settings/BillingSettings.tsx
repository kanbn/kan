import { useRouter } from "next/navigation";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { HiMiniArrowTopRightOnSquare } from "react-icons/hi2";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export default function BillingSettings() {
  const { modalContentType, isOpen } = useModal();
  const router = useRouter();
  const isCloud = env("NEXT_PUBLIC_KAN_ENV") === "cloud";
  const { workspace } = useWorkspace();

  const { data: workspaceData } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId && workspace.publicId.length >= 12 },
  );

  const subscription = workspaceData?.subscriptions.find((s) =>
    ["active", "trialing", "past_due"].includes(s.status),
  );

  const planLabel = (() => {
    if (!subscription) return t`Free (1 member)`;
    if (subscription.unlimitedSeats) {
      const name =
        subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
      return `${name} (${t`unlimited members`})`;
    }
    if (subscription.seats != null) {
      const name =
        subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
      return `${name} (${subscription.seats} ${subscription.seats === 1 ? t`member` : t`members`})`;
    }
    return (
      subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
    );
  })();

  const handleOpenBillingPortal = async () => {
    try {
      const response = await fetch("/api/stripe/create_billing_session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const { url } = (await response.json()) as { url: string };
      if (url) window.location.href = url;
    } catch (error) {
      console.error("Error creating billing session:", error);
    }
  };

  return (
    <>
      <PageHead title={t`Settings | Billing`} />

      <div className="border-t border-light-300 dark:border-dark-300">
        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Plan`}
        </h2>
        <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
          {planLabel}
        </p>
        {!subscription && isCloud && (
          <div className="mb-8">
            <Button
              onClick={() =>
                router.push(
                  `/upgrade/select-plan?plan=pro&workspacePublicId=${workspace.publicId}&returnUrl=${encodeURIComponent("/settings/billing")}`,
                )
              }
            >
              {t`Choose plan`}
            </Button>
          </div>
        )}
      </div>

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Billing`}
        </h2>
        <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
          {t`View and manage your billing and subscription.`}
        </p>
        <Button
          variant="primary"
          iconRight={<HiMiniArrowTopRightOnSquare />}
          onClick={handleOpenBillingPortal}
        >
          {t`Billing portal`}
        </Button>
      </div>

      {/* Global modals */}
      <Modal
        modalSize="md"
        isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
      >
        <FeedbackModal />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
      >
        <NewWorkspaceForm />
      </Modal>
    </>
  );
}
