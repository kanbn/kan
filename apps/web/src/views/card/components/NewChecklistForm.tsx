import { t } from "@lingui/core/macro";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";

import { useCreateChecklist } from "@kan/api-client/hooks";
import { generateUID } from "@kan/shared/utils";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useCardCache } from "~/utils/cardCache";
import { invalidateCard } from "~/utils/cardInvalidation";

interface NewChecklistFormInput {
  name: string;
  cardPublicId: string;
}

export function NewChecklistForm({ cardPublicId }: { cardPublicId: string }) {
  const { closeModal, setModalState } = useModal();
  const { showPopup } = usePopup();

  const cardCache = useCardCache();

  const { register, handleSubmit, reset, watch } =
    useForm<NewChecklistFormInput>({
      defaultValues: {
        name: "Checklist",
        cardPublicId,
      },
    });

  const createChecklist = useCreateChecklist({
    mutation: {
      onMutate: async (args) => {
        await cardCache.byId.cancel({ cardPublicId: args.cardPublicId });
        const previous = cardCache.byId.getData({
          cardPublicId: args.cardPublicId,
        });
        const optimisticPublicId = `PLACEHOLDER_${generateUID()}`;
        cardCache.byId.setData({ cardPublicId: args.cardPublicId }, (old) => {
          if (!old) return old;
          const placeholderChecklist = {
            publicId: optimisticPublicId,
            name: args.data.name,
            index: old.checklists.length,
            items: [] as {
              publicId: string;
              title: string;
              completed: boolean;
              index: number;
            }[],
          };
          return {
            ...old,
            checklists: [...old.checklists, placeholderChecklist],
          };
        });
        return { previous, optimisticPublicId };
      },
      onSuccess: (result, vars, context) => {
        setModalState("ADD_CHECKLIST", {
          createdChecklistId: result.data.publicId,
        });
        cardCache.byId.setData({ cardPublicId: vars.cardPublicId }, (old) => {
          if (!old) return old;
          const updatedChecklists = old.checklists.map((cl) =>
            cl.publicId === context.optimisticPublicId
              ? { ...cl, publicId: result.data.publicId }
              : cl,
          );
          return { ...old, checklists: updatedChecklists };
        });
      },
      onError: (_error, vars, ctx) => {
        if (ctx?.previous)
          cardCache.byId.setData(
            { cardPublicId: vars.cardPublicId },
            ctx.previous,
          );
        showPopup({
          header: t`Unable to create checklist`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        });
      },
      onSettled: async (_data, _error, vars) => {
        await invalidateCard(cardCache, vars.cardPublicId);
      },
    },
  });

  useEffect(() => {
    const nameElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#checklist-name");
    if (nameElement) nameElement.focus();
  }, []);

  const onSubmit = (data: NewChecklistFormInput) => {
    closeModal();
    reset({
      name: "",
    });

    createChecklist.mutate({
      cardPublicId: data.cardPublicId,
      data: { name: data.name },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
            {t`New checklist`}
          </h2>
          <button
            type="button"
            className="rounded-sm p-1 hover:bg-light-200 focus:outline-hidden dark:hover:bg-dark-300"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        <Input
          id="checklist-name"
          placeholder={t`Checklist name`}
          {...register("name")}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await handleSubmit(onSubmit)();
            }
          }}
        />
      </div>
      <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <div>
          <Button
            type="submit"
            disabled={createChecklist.isPending || !watch("name")}
          >
            {t`Create checklist`}
          </Button>
        </div>
      </div>
    </form>
  );
}
