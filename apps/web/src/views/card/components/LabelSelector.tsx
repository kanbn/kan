import { t } from "@lingui/core/macro";
import { HiMiniPlus } from "react-icons/hi2";

import Badge from "~/components/Badge";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface LabelSelectorProps {
  cardPublicId: string;
  labels: {
    key: string;
    value: string;
    selected: boolean;
    leftIcon: React.ReactNode;
  }[];
  isLoading: boolean;
  disabled?: boolean;
}

export default function LabelSelector({
  cardPublicId,
  labels,
  isLoading,
  disabled = false,
}: LabelSelectorProps) {
  const utils = api.useUtils();
  const { openModal } = useModal();
  const { showPopup } = usePopup();

  const addOrRemoveLabel = api.card.addOrRemoveLabel.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel();

      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;

        const hasLabel = oldCard.labels.some(
          (label) => label.publicId === update.labelPublicId,
        );

        const labelToAdd = oldCard.labels.find(
          (label) => label.publicId === update.labelPublicId,
        );

        const updatedLabels = hasLabel
          ? oldCard.labels.filter(
              (label) => label.publicId !== update.labelPublicId,
            )
          : [
              ...oldCard.labels,
              {
                publicId: update.labelPublicId,
                name: labelToAdd?.name ?? "",
                colourCode: labelToAdd?.colourCode ?? "",
              },
            ];

        return {
          ...oldCard,
          labels: updatedLabels,
        };
      });

      return { previousCard };
    },
    onError: (_error, _newList, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: t`Unable to update labels`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
      await utils.board.byId.invalidate();
    },
  });

  const selectedLabels = labels.filter((label) => label.selected);

  return (
    <>
      {isLoading ? (
        <div className="flex w-full">
          <div className="h-full w-[175px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
        </div>
      ) : (
        <CheckboxDropdown
          items={labels}
          handleSelect={(_, label) => {
            addOrRemoveLabel.mutate({ cardPublicId, labelPublicId: label.key });
          }}
          handleEdit={disabled ? undefined : (labelPublicId) => openModal("EDIT_LABEL", labelPublicId)}
          handleCreate={disabled ? undefined : () => openModal("NEW_LABEL")}
          createNewItemLabel={t`Create new label`}
          disabled={disabled}
          asChild
        >
          {selectedLabels.length ? (
            <div className="flex flex-wrap gap-x-0.5">
              {selectedLabels.map((label) => (
                <Badge
                  key={label.key}
                  value={label.value}
                  iconLeft={label.leftIcon}
                />
              ))}
              <Badge value={t`Add label`} iconLeft={<HiMiniPlus size={14} />} />
            </div>
          ) : (
            <div className={`flex h-full w-full items-center rounded-[5px] border-[1px] border-light-50 pl-2 text-left text-sm text-neutral-900 dark:border-dark-50 dark:text-dark-1000 ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-light-300 hover:bg-light-200 dark:hover:border-dark-200 dark:hover:bg-dark-100"}`}>
              <HiMiniPlus size={22} className="pr-2" />
              {t`Add label`}
            </div>
          )}
        </CheckboxDropdown>
      )}
    </>
  );
}
