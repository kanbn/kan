import { t } from "@lingui/core/macro";
import { useEffect, useRef, useState } from "react";
import { HiXMark } from "react-icons/hi2";

import { parseCustomFieldsConfig } from "@kan/shared";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface Props {
  boardPublicId: string;
  currentConfig: string | null;
}

export function CustomFieldsConfigForm({ boardPublicId, currentConfig }: Props) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [yaml, setYaml] = useState(currentConfig ?? "");
  const [parseError, setParseError] = useState<string | null>(null);

  const updateBoard = api.board.update.useMutation({
    onSuccess: () => {
      showPopup({
        header: t`Custom fields saved`,
        message: t`The custom fields configuration has been saved.`,
        icon: "success",
      });
      void utils.board.byId.invalidate();
      closeModal();
    },
    onError: (err) => {
      showPopup({
        header: t`Unable to save custom fields`,
        message: err.message ?? t`Please try again later.`,
        icon: "error",
      });
    },
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleChange = (value: string) => {
    setYaml(value);
    if (!value.trim()) {
      setParseError(null);
      return;
    }
    try {
      parseCustomFieldsConfig(value);
      setParseError(null);
    } catch (err) {
      setParseError((err as Error).message);
    }
  };

  const handleSave = () => {
    if (parseError) return;

    updateBoard.mutate({
      boardPublicId,
      customFieldsConfig: yaml.trim() || null,
    });
  };

  const isValid = !parseError;
  const isDirty = yaml !== (currentConfig ?? "");

  return (
    <div className="flex flex-col" style={{ width: 520 }}>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
            {t`Custom Fields`}
          </h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-200 focus:outline-none dark:hover:bg-dark-300"
            onClick={closeModal}
          >
            <HiXMark className="h-[16px] w-[16px] text-neutral-600 dark:text-dark-900" />
          </button>
        </div>

        <p className="mb-3 text-xs text-neutral-500 dark:text-dark-700">
          {t`Configure custom fields for cards on this board using YAML. Leave empty to use default fields only.`}
        </p>

        <textarea
          ref={textareaRef}
          className={`w-full rounded border bg-transparent p-3 font-mono text-xs focus:outline-none ${
            parseError
              ? "border-red-400 focus:border-red-500"
              : "border-light-400 focus:border-neutral-400 dark:border-dark-400 dark:focus:border-dark-600"
          } text-neutral-900 dark:text-dark-1000`}
          rows={20}
          value={yaml}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`# Example:\nmain:\n  fields:\n    description:\n      title: Notes\nsidebar:\n  fields:\n    list:\n      title: Status\n    lastContacted:\n      title: Last Contacted\n      type: date\n      showOnBoard: true`}
          spellCheck={false}
        />

        {parseError && (
          <p className="mt-1 text-xs text-red-500 dark:text-red-400">
            {parseError}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-light-300 px-5 py-4 dark:border-dark-300">
        <Button variant="secondary" onClick={closeModal} type="button">
          {t`Cancel`}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!isValid || !isDirty || updateBoard.isPending}
          type="button"
        >
          {updateBoard.isPending ? t`Saving…` : t`Save`}
        </Button>
      </div>
    </div>
  );
}
