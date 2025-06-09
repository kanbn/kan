import { HiMiniCheck, HiMiniClipboard } from "react-icons/hi2";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useClipboard } from "~/hooks/useClipboard";
import { useModal } from "~/providers/modal";

export default function CreatedApiKeyDisplay() {
  const { entityId, entityLabel, closeModal } = useModal();
  const { copied, copy } = useClipboard({ timeout: 2000 });

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          API key created
        </h2>
        <p className="text-sm text-light-900 dark:text-dark-1000">
          Your new API key <span className="font-medium">{entityLabel}</span>{" "}
          has been created.
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Input
            value={entityId}
            className="text-sm text-light-900 dark:text-dark-1000"
            readOnly
          />
          <Button
            variant="secondary"
            iconRight={copied ? <HiMiniCheck /> : <HiMiniClipboard />}
            onClick={() => copy(entityId)}
            className={
              copied
                ? "border border-green-600 text-green-600 dark:border-green-600 dark:text-green-600"
                : ""
            }
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-sm text-light-900 dark:text-dark-1000">
          You're only gonna see the API key this one time, so please keep it
          somewhere safe.
        </p>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={() => closeModal()}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
