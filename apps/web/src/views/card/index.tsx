import Link from "next/link";
import { useRouter } from "next/router";
import ContentEditable from "react-contenteditable";
import { useForm } from "react-hook-form";
import { IoChevronForwardSharp } from "react-icons/io5";

import Avatar from "~/components/Avatar";
import { LabelForm } from "~/components/LabelForm";
import LabelIcon from "~/components/LabelIcon";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import { DeleteLabelConfirmation } from "../../components/DeleteLabelConfirmation";
import ActivityList from "./components/ActivityList";
import { DeleteCardConfirmation } from "./components/DeleteCardConfirmation";
import { DeleteCommentConfirmation } from "./components/DeleteCommentConfirmation";
import Dropdown from "./components/Dropdown";
import LabelSelector from "./components/LabelSelector";
import ListSelector from "./components/ListSelector";
import MemberSelector from "./components/MemberSelector";
import NewCommentForm from "./components/NewCommentForm";
import Editor from "~/components/Editor";
import { MDXEditorMethods } from "@mdxeditor/editor";
import { useEffect, useRef } from "react";
import '@mdxeditor/editor/style.css';

interface FormValues {
  cardId: string;
  title: string;
  description: string;
}

export default function CardPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const { modalContentType, entityId } = useModal();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const editorRef = useRef<MDXEditorMethods>(null);

  const cardId = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;

  const { data: card, isLoading } = api.card.byId.useQuery({
    cardPublicId: cardId ?? "",
  });

  useEffect(() => {
    if (card?.description) {
      editorRef.current?.setMarkdown(card.description);
    }
  }, [card]);

  const refetchCard = async () => {
    if (cardId) await utils.card.byId.refetch({ cardPublicId: cardId });
  };

  const board = card?.list.board;
  const boardId = board?.publicId;
  const labels = board?.labels;
  const activities = card?.activities;
  const workspaceMembers = board?.workspace.members;
  const selectedLabels = card?.labels;
  const selectedMembers = card?.members;

  const formattedLabels =
    labels?.map((label) => {
      const isSelected = selectedLabels?.some(
        (selectedLabel) => selectedLabel.publicId === label.publicId,
      );

      return {
        key: label.publicId,
        value: label.name,
        selected: isSelected ?? false,
        leftIcon: <LabelIcon colourCode={label.colourCode} />,
      };
    }) ?? [];

  const formattedLists =
    board?.lists.map((list) => ({
      key: list.publicId,
      value: list.name,
      selected: list.publicId === card?.list.publicId,
    })) ?? [];

  const formattedMembers =
    workspaceMembers?.map((member) => {
      const isSelected = selectedMembers?.some(
        (assignedMember) => assignedMember.publicId === member.publicId,
      );

      return {
        key: member.publicId,
        value: formatMemberDisplayName(
          member.user?.name ?? null,
          member.user?.email ?? member.email,
        ),
        imageUrl: member.user?.image
          ? getAvatarUrl(member.user.image)
          : undefined,
        selected: isSelected ?? false,
        leftIcon: (
          <Avatar
            size="xs"
            name={member.user?.name ?? ""}
            imageUrl={
              member.user?.image ? getAvatarUrl(member.user.image) : undefined
            }
            email={member.user?.email ?? member.email}
          />
        ),
      };
    }) ?? [];

  const updateCard = api.card.update.useMutation({
    onError: () => {
      showPopup({
        header: "Unable to update card",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId: cardId });
    },
  });

  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    values: {
      cardId: cardId ?? "",
      title: card?.title ?? "",
      description: card?.description ?? "",
    },
  });

  const onSubmit = (values: FormValues) => {
    updateCard.mutate({
      cardPublicId: values.cardId,
      title: values.title,
      description: values.description,
    });
  };

  if (!cardId) return <></>;

  return (
    <>
      <PageHead
        title={`${card?.title ?? "Card"} | ${board?.name ?? "Board"}`}
      />
      <div className="flex h-full flex-1 flex-row">
        <div className="flex h-full w-full flex-col overflow-hidden">
          <div className="h-full max-h-[calc(100vh-4rem)] overflow-y-auto p-8">
            <div className="mb-8 flex w-full items-center justify-between">
              {!card && isLoading && (
                <div className="flex space-x-2">
                  <div className="h-[2.3rem] w-[150px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
                  <div className="h-[2.3rem] w-[300px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
                </div>
              )}
              {card && (
                <>
                  <Link
                    className="whitespace-nowrap font-bold leading-[2.3rem] tracking-tight text-light-900 dark:text-dark-900 sm:text-[1.2rem]"
                    href={`/boards/${board?.publicId}`}
                  >
                    {board?.name}
                  </Link>
                  <IoChevronForwardSharp
                    size={18}
                    className="mx-2 text-light-900 dark:text-dark-900"
                  />
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="w-full space-y-6"
                  >
                    <div>
                      <input
                        type="text"
                        id="title"
                        {...register("title")}
                        onBlur={handleSubmit(onSubmit)}
                        className="block w-full border-0 bg-transparent p-0 py-0 font-bold tracking-tight text-neutral-900 focus:ring-0 dark:text-dark-1000 sm:text-[1.2rem]"
                      />
                    </div>
                  </form>
                  <div className="flex">
                    <Dropdown />
                  </div>
                </>
              )}
              {!card && !isLoading && (
                <p className="block p-0 py-0 font-bold leading-[2.3rem] tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
                  Card not found
                </p>
              )}
            </div>
            {card && (
              <>
                <div className="mb-10 flex w-full max-w-2xl justify-between">
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="w-full space-y-6"
                  >
                    <div className="mt-2">
                      <Editor
                    editorRef={editorRef}
                        placeholder="Add description..."
                        markdown={watch("description")}
                            onChange={(e) => setValue("description", e)}
                        onBlur={() => handleSubmit(onSubmit)()}
                          />
                    </div>
                  </form>
                </div>
                <div className="border-t-[1px] border-light-600 pt-12 dark:border-dark-400">
                  <h2 className="text-md pb-4 font-medium text-light-900 dark:text-dark-1000">
                    Activity
                  </h2>
                  <div>
                    <ActivityList
                      cardPublicId={cardId}
                      activities={activities ?? []}
                      isLoading={!card}
                      isAdmin={workspace.role === "admin"}
                    />
                  </div>
                  <div className="mt-6">
                    <NewCommentForm cardPublicId={cardId} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="w-[475px] border-l-[1px] border-light-600 bg-light-200 p-8 text-light-900 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-900">
          <div className="mb-4 flex w-full">
            <p className="my-2 w-[100px] text-sm">List</p>
            <ListSelector
              cardPublicId={cardId}
              lists={formattedLists}
              isLoading={!card}
            />
          </div>
          <div className="mb-4 flex w-full">
            <p className="my-2 w-[100px] text-sm">Labels</p>
            <LabelSelector
              cardPublicId={cardId}
              labels={formattedLabels}
              isLoading={!card}
            />
          </div>
          <div className="flex w-full">
            <p className="my-2 w-[100px] text-sm">Members</p>
            <MemberSelector
              cardPublicId={cardId}
              members={formattedMembers}
              isLoading={!card}
            />
          </div>
        </div>

        <Modal>
          {modalContentType === "NEW_LABEL" && (
            <LabelForm boardPublicId={boardId ?? ""} refetch={refetchCard} />
          )}
          {modalContentType === "EDIT_LABEL" && (
            <LabelForm
              boardPublicId={boardId ?? ""}
              refetch={refetchCard}
              isEdit
            />
          )}
          {modalContentType === "DELETE_LABEL" && (
            <DeleteLabelConfirmation
              refetch={refetchCard}
              labelPublicId={entityId}
            />
          )}
          {modalContentType === "DELETE_CARD" && (
            <DeleteCardConfirmation
              boardPublicId={boardId ?? ""}
              cardPublicId={cardId}
            />
          )}
          {modalContentType === "DELETE_COMMENT" && (
            <DeleteCommentConfirmation
              cardPublicId={cardId}
              commentPublicId={entityId}
            />
          )}
          {modalContentType === "NEW_WORKSPACE" && <NewWorkspaceForm />}
        </Modal>
      </div>
    </>
  );
}
