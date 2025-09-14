import { t } from "@lingui/core/macro";
import { HiMiniArrowTopRightOnSquare } from "react-icons/hi2";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";

export default function BillingSettings() {
  const { modalContentType, isOpen } = useModal();

  const handleOpenBillingPortal = async () => {
    try {
      const response = await fetch("/api/stripe/create_billing_session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const { url } = (await response.json()) as { url: string };

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error creating billing session:", error);
    }
  };

  return (
    <>
      <PageHead title="Settings | Billing" />

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        <h2 className="mb-4 mt-8 text-[14px] text-neutral-900 dark:text-dark-1000">
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
