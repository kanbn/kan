import { Menu } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { HiMiniPlus } from "react-icons/hi2";

import Badge from "~/components/Badge";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface LabelSelectorProps {
  cardPublicId: string;
  labels: {
    key: string;
    value: string;
    selected: boolean;
    leftIcon: React.ReactNode;
  }[];
  isLoading: boolean;
}

export default function LabelSelector({
  cardPublicId,
  labels,
  isLoading,
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
      await utils.card.byId.invalidate({ cardPublicId });
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
          handleEdit={(labelPublicId) => openModal("EDIT_LABEL", labelPublicId)}
          asChild
        >
          {selectedLabels.length ? (
            <div className="flex flex-wrap gap-x-0.5">
              {selectedLabels.map((label) => (
                <Menu.Button key={label.key}>
                  <Badge value={label.value} iconLeft={label.leftIcon} />
                </Menu.Button>
              ))}
              {/* <Menu.Button>
                <Badge
                  value={t`Add label`}
                  iconLeft={<HiMiniPlus size={14} />}
                />
              </Menu.Button> */}
            </div>
          ) : (
            <Menu.Button className="flex h-full w-full items-center rounded-[5px] border-[1px] border-light-50 pl-2 text-left text-sm text-neutral-900 hover:border-light-300 hover:bg-light-200 dark:border-dark-50 dark:text-dark-1000 dark:hover:border-dark-200 dark:hover:bg-dark-100">
              <HiMiniPlus size={22} className="pr-2" />
              {t`Add label`}
            </Menu.Button>
          )}
        </CheckboxDropdown>
      )}
    </>
  );
}
