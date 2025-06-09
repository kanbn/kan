import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineLink,
} from "react-icons/hi2";

import Button from "~/components/Button";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

interface QueryParams {
  boardPublicId: string;
  members: string[];
  labels: string[];
}

const VisibilityButton = ({
  visibility,
  boardPublicId,
  boardSlug,
  queryParams,
  isLoading,
  isAdmin,
}: {
  visibility: "public" | "private";
  boardPublicId: string;
  boardSlug: string;
  queryParams: QueryParams;
  isLoading: boolean;
  isAdmin: boolean;
}) => {
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const utils = api.useUtils();
  const [stateVisibility, setStateVisibility] = useState<"public" | "private">(
    visibility,
  );
  const router = useRouter();

  useEffect(() => {
    setStateVisibility(visibility);
  }, [visibility]);

  const isPublic = stateVisibility === "public";

  const updateBoardVisibility = api.board.update.useMutation({
    onSuccess: () => {
      setStateVisibility(isPublic ? "private" : "public");
      showPopup({
        header: "Board visibility updated",
        message: `The visibility of your board has been set to ${isPublic ? "public" : "private"}.`,
        icon: "success",
      });
    },
    onError: () => {
      showPopup({
        header: "Unable to update board visibility",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate(queryParams);
    },
  });

  return (
    <div className="relative">
      <CheckboxDropdown
        items={[
          {
            key: "public",
            value: "Public",
            selected: isPublic,
          },
          {
            key: "private",
            value: "Private",
            selected: !isPublic,
          },
        ]}
        handleSelect={(_g, i) =>
          updateBoardVisibility.mutate({
            visibility: i.key as "public" | "private",
            boardPublicId,
          })
        }
      >
        <Button
          variant="secondary"
          iconLeft={isPublic ? <HiOutlineEye /> : <HiOutlineEyeSlash />}
          isLoading={updateBoardVisibility.isPending}
          disabled={isLoading || !isAdmin}
        >
          {isPublic ? "Public" : "Private"}
        </Button>
        {isPublic && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push("/" + workspace.slug + "/" + boardSlug);
            }}
            aria-label="Clear filters"
            className="absolute -right-[8px] -top-[8px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-light-100 bg-light-1000 text-[8px] font-[700] text-light-600 dark:border-dark-50 dark:bg-dark-1000 dark:text-dark-600"
          >
            <span className="text-light-50 dark:text-dark-50">
              <HiOutlineLink size={12} />
            </span>
          </button>
        )}
      </CheckboxDropdown>
    </div>
  );
};

export default VisibilityButton;
