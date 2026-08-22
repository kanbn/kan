import { t } from "@lingui/core/macro";
import { colours } from "node_modules/@kan/shared/src/constants/colours";
import { HiCheck, HiXMark } from "react-icons/hi2";

import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface QueryParams {
  boardPublicId: string;
}

export function BoardBackgroundSettingsForm({
  boardPublicId,
  backgroundColor,
  queryParams,
}: {
  boardPublicId: string;
  backgroundColor: string | null;
  queryParams: QueryParams;
}) {
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  // const schema = z.object({
  //   backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  // });

  // type FormValues = z.infer<typeof schema>;

  // const {
  //   register,
  //   handleSubmit,
  //   formState: { isDirty, errors },
  //   watch,
  //   setValue,
  // } = useForm<FormValues>({
  //   resolver: zodResolver(schema),
  //   values: {
  //     backgroundColor: backgroundColor ?? "",
  //   },
  //   mode: "onChange",
  // });

  // const color = watch("backgroundColor");

  const updateBoardBackgroundColor = api.board.update.useMutation({
    onSuccess: () => {
      showPopup({
        header: t`Board background updated`,
        message: t`The background of your board has been updated.`,
        icon: "success",
      });
    },
    onError: () => {
      showPopup({
        header: t`Unable to update board background color`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      // closeModal();
      await utils.board.byId.invalidate(queryParams);
    },
  });

  const selectedColour = backgroundColor;

  const setColour = (colourCode: string | null) => {
    updateBoardBackgroundColor.mutate({
      boardPublicId,
      backgroundColor: colourCode,
    });
  };

  return (
    <form className="mb-10">
      <div className="mb-3 text-sm text-light-900 dark:text-dark-900">
        {t`Background color`}
      </div>
      <div className="flex flex-wrap gap-2">
        {/* None / clear */}
        <button
          type="button"
          aria-label={t`No cover colour`}
          onClick={() => setColour(null)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-light-400 bg-light-50 text-light-900 hover:border-light-600 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-900 dark:hover:border-dark-600"
        >
          {selectedColour === null ? (
            <HiCheck className="h-4 w-4" />
          ) : (
            <HiXMark className="h-4 w-4" />
          )}
        </button>
        {colours.map((colour) => {
          const isSelected = selectedColour === colour.code;
          return (
            <button
              key={colour.code}
              type="button"
              aria-label={colour.name}
              title={colour.name}
              onClick={() => setColour(colour.code)}
              style={{ backgroundColor: colour.code }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 hover:ring-2 hover:ring-light-600 dark:border-white/10 dark:hover:ring-dark-600"
            >
              {isSelected && <HiCheck className="h-4 w-4 text-white" />}
            </button>
          );
        })}
      </div>
    </form>
  );
}
