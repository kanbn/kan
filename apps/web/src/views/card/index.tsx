import Link from "next/link";
import { useRouter } from "next/router";
import { Select } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { IoChevronForwardSharp } from "react-icons/io5";

import Avatar from "~/components/Avatar";
import Editor from "~/components/Editor";
import FeedbackModal from "~/components/FeedbackModal";
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
import Checklists from "./components/Checklists";
import { DeleteCardConfirmation } from "./components/DeleteCardConfirmation";
import { DeleteChecklistConfirmation } from "./components/DeleteChecklistConfirmation";
import { DeleteCommentConfirmation } from "./components/DeleteCommentConfirmation";
import Dropdown from "./components/Dropdown";
import LabelSelector from "./components/LabelSelector";
import ListSelector from "./components/ListSelector";
import MemberSelector from "./components/MemberSelector";
import { NewChecklistForm } from "./components/NewChecklistForm";
import NewCommentForm from "./components/NewCommentForm";

interface FormValues {
  cardId: string;
  title: string;
  description: string;
}

export function CardRightPanel() {
  const router = useRouter();
  const cardId = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;

  const { data: card } = api.card.byId.useQuery({
    cardPublicId: cardId ?? "",
  });

  const board = card?.list.board;
  const labels = board?.labels;
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

  return (
    <div className="h-full w-[360px] border-l-[1px] border-light-300 bg-light-50 p-8 text-light-900 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900">
      <div className="mb-4 flex w-full flex-row">
        {/* <p className="my-2 mb-2 w-[100px] text-sm font-medium">{t`List`}</p>
        <ListSelector
          cardPublicId={cardId ?? ""}
          lists={formattedLists}
          isLoading={!card}
        /> */}
      </div>
      <div className="mb-4 flex w-full flex-row">
        <p className="my-2 mb-2 w-[100px] text-sm font-medium">{t`Labels`}</p>
        <LabelSelector
          cardPublicId={cardId ?? ""}
          labels={formattedLabels}
          isLoading={!card}
        />
      </div>
      <div className="flex w-full flex-row">
        <p className="my-2 mb-2 w-[100px] text-sm font-medium">{t`Members`}</p>
        <MemberSelector
          cardPublicId={cardId ?? ""}
          members={formattedMembers}
          isLoading={!card}
        />
      </div>
    </div>
  );
}

export default function CardPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const {
    modalContentType,
    entityId,
    openModal,
    getModalState,
    clearModalState,
    isOpen,
  } = useModal();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const [activeChecklistForm, setActiveChecklistForm] = useState<string | null>(
    null,
  );

  const cardId = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;

  const { data: card, isLoading } = api.card.byId.useQuery({
    cardPublicId: cardId ?? "",
  });

  const refetchCard = async () => {
    if (cardId) await utils.card.byId.refetch({ cardPublicId: cardId });
  };

  const board = card?.list.board;
  const boardId = board?.publicId;
  const activities = card?.activities;
  const labels = board?.labels;
  const selectedLabels = card?.labels;

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

  const updateCard = api.card.update.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.card.byId.invalidate({ cardPublicId: cardId });
    },
  });

  const formattedLists =
    board?.lists.map((list) => ({
      key: list.publicId,
      value: list.name,
      selected: list.publicId === card?.list.publicId,
    })) ?? [];

  const handleMotoristaColetaChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = e.target.value;
    setValue("motoristaColeta", value);
    if (!cardId) return;
    updateCard.mutate({
      cardPublicId: cardId,
      motoristaColeta: value,
    });
  };

  const handleMotoristaEntregaChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = e.target.value;
    setValue("motoristaEntrega", value);
    if (!cardId) return;
    updateCard.mutate({
      cardPublicId: cardId,
      motoristaEntrega: value,
    });
  };

  const { register, handleSubmit, setValue, watch } = useForm<any>({
    values: {
      cardId: cardId ?? "",
      title: card?.title ?? "",
      description: card?.description ?? "",
      hospedeName: card?.hospedeName ?? "",
      hospedeDocumento: card?.hospedeDocumento ?? "",
      hospedeTelefone: card?.hospedeTelefone ?? "",
      tipoEntrega: card?.tipoEntrega ?? "normal",
      motoristaColeta: card?.motoristaColeta ?? "",
      motoristaEntrega: card?.motoristaEntrega ?? "",
    },
  });

  const onSubmit = (values: any) => {
    updateCard.mutate({
      cardPublicId: values.cardId,
      title: values.title,
      description: values.description,
      hospedeName: values.hospedeName,
      hospedeDocumento: values.hospedeDocumento,
      hospedeTelefone: values.hospedeTelefone,
      tipoEntrega: values.tipoEntrega,
      motoristaColeta: values.motoristaColeta,
      motoristaEntrega: values.motoristaEntrega,
    });
  };

  // Open the new item form after creating a new checklist
  useEffect(() => {
    if (!card) return;
    const state = getModalState("ADD_CHECKLIST");
    const createdId: string | undefined = state?.createdChecklistId;
    if (createdId) {
      setActiveChecklistForm(createdId);
      clearModalState("ADD_CHECKLIST");
    }
  }, [card, getModalState, clearModalState]);

  if (!cardId) return <></>;

  const isGuest = workspace.role === "guest";
  return (
    <>
      <PageHead
        title={t`${card?.title ?? "Card"} | ${board?.name ?? "Board"}`}
      />
      <div className="flex h-full flex-1 flex-row overflow-hidden">
        <div className="scrollbar-thumb-rounded-[4px] scrollbar-track-rounded-[4px] w-full flex-1 overflow-y-auto scrollbar scrollbar-track-light-200 scrollbar-thumb-light-400 hover:scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-300 dark:hover:scrollbar-thumb-dark-300">
          <div className="p-auto mx-auto flex h-full w-full max-w-[800px] flex-col">
            <div className="p-6 md:p-8">
              <div className="mb-8 flex w-full items-center justify-between md:mt-6">
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

                    <div className="flex">{!isGuest && <Dropdown />}</div>
                  </>
                )}
                {!card && !isLoading && (
                  <p className="block p-0 py-0 font-bold leading-[2.3rem] tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
                    {`Card not found`}
                  </p>
                )}
              </div>
              {card && (
                <>
                  <div className="mb-10 flex w-full max-w-2xl flex-col justify-between">
                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      className="w-full space-y-6"
                    >
                      <div className="mt-2">
                        <Editor
                          content={card.description}
                          onChange={(e) => setValue("description", e)}
                          onBlur={() => handleSubmit(onSubmit)()}
                          workspaceMembers={board?.workspace.members ?? []}
                        />
                        <div>
                          <p className="my-2 mb-2 w-[100px] text-sm font-medium">{t`Labels`}</p>
                          <LabelSelector
                            cardPublicId={cardId ?? ""}
                            labels={formattedLabels}
                            isLoading={!card}
                          />
                        </div>

                        <div className="flex flex-col justify-between gap-4 pt-8 text-sm md:flex-row md:items-center">
                          <div>
                            <p className="pb-2">Mudar Status do pedido</p>
                            <ListSelector
                              cardPublicId={cardId ?? ""}
                              lists={formattedLists}
                              isLoading={!card}
                            />
                          </div>
                          {!isGuest && (
                            <>
                              <div>
                                <p>Motorista que coletou</p>
                                <Select
                                  name="motoristaColeta"
                                  aria-label="Project status"
                                  onChange={handleMotoristaColetaChange}
                                  value={card.motoristaColeta ?? ""}
                                  className="w-full rounded-md border border-neutral-400 bg-neutral-50 px-8 py-1 text-sm"
                                >
                                  <option value="" disabled>
                                    {" "}
                                    Selecione seu motorista
                                  </option>
                                  <option value="motorista-1">
                                    Motorista 1
                                  </option>
                                  <option value="motorista-2">
                                    Motorista 2
                                  </option>
                                  <option value="motorista-3">
                                    Motorista 3
                                  </option>
                                  <option value="motorista-4">
                                    Motorista 4
                                  </option>
                                </Select>
                              </div>
                              <div>
                                <p>Motorista da entrega final</p>
                                <Select
                                  name="motoristaEntrega"
                                  aria-label="Project status"
                                  onChange={handleMotoristaEntregaChange}
                                  value={card.motoristaEntrega ?? ""}
                                  className="w-full rounded-md border border-neutral-400 bg-neutral-50 px-8 py-1 text-sm"
                                >
                                  <option value="" disabled>
                                    {" "}
                                    Selecione seu motorista
                                  </option>
                                  <option value="motorista-1">
                                    Motorista 1
                                  </option>
                                  <option value="motorista-2">
                                    Motorista 2
                                  </option>
                                  <option value="motorista-3">
                                    Motorista 3
                                  </option>
                                  <option value="motorista-4">
                                    Motorista 4
                                  </option>
                                </Select>
                              </div>
                            </>
                          )}
                        </div>
                        {/* Laundry details section (read-only) */}
                        <div className="mb-4 mt-4 rounded-lg bg-neutral-100 p-4 shadow-sm dark:bg-neutral-800">
                          <h3 className="mb-3 text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                            {`Detalhes do hóspede`}
                          </h3>

                          {/* Using a grid for clean alignment */}
                          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                            {/* Row 1: Nome */}
                            <span className="font-medium text-neutral-600 dark:text-neutral-400">{`Nome:`}</span>
                            <span className="text-neutral-900 dark:text-neutral-100">
                              {card?.hospedeName || (
                                <span className="italic text-neutral-500 dark:text-neutral-500">{`Não informado`}</span>
                              )}
                            </span>
                            <span className="font-medium text-neutral-600 dark:text-neutral-400">{`Apartamento:`}</span>
                            <span className="text-neutral-900 dark:text-neutral-100">
                              {card?.hospedeApartamento || (
                                <span className="italic text-neutral-500 dark:text-neutral-500">{`Não informado`}</span>
                              )}
                            </span>
                            {/* Row 2: Documento */}
                            <span className="font-medium text-neutral-600 dark:text-neutral-400">{`Documento:`}</span>
                            <span className="text-neutral-900 dark:text-neutral-100">
                              {card?.hospedeDocumento || (
                                <span className="italic text-neutral-500 dark:text-neutral-500">{`Não informado`}</span>
                              )}
                            </span>

                            {/* Row 3: Telefone */}
                            <span className="font-medium text-neutral-600 dark:text-neutral-400">{`Telefone:`}</span>
                            <span className="text-neutral-900 dark:text-neutral-100">
                              {card?.hospedeTelefone || (
                                <span className="italic text-neutral-500 dark:text-neutral-500">{`Não informado`}</span>
                              )}
                            </span>

                            {/* Row 4: Tipo de entrega */}
                            {/* <span className="font-medium text-neutral-600 dark:text-neutral-400">{`Tipo de entrega:`}</span> */}
                            {/* <span className="text-neutral-900 dark:text-neutral-100">
                              {card?.tipoEntrega === "express"
                                ? `Express`
                                : `Normal`}
                            </span> */}
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                  <Checklists
                    checklists={card.checklists.map((checklist) => ({
                      ...checklist,
                      items: checklist.items.map((item) => ({
                        ...item,
                        itemValue:
                          typeof item.itemValue === "string"
                            ? Number(item.itemValue) || 0
                            : (item.itemValue ?? 0),
                      })),
                    }))}
                    cardPublicId={cardId}
                    activeChecklistForm={activeChecklistForm}
                    setActiveChecklistForm={setActiveChecklistForm}
                    viewOnly={
                      workspace.role != "admin" && workspace.role != "member"
                    }
                  />
                  <div className="border-t-[1px] border-light-300 pt-12 dark:border-dark-300">
                    <h2 className="text-md pb-4 font-medium text-light-1000 dark:text-dark-1000">
                      {t`Activity`}
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
        </div>

        <>
          <Modal
            modalSize="md"
            isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
          >
            <FeedbackModal />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_LABEL"}
          >
            <LabelForm boardPublicId={boardId ?? ""} refetch={refetchCard} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "EDIT_LABEL"}
          >
            <LabelForm
              boardPublicId={boardId ?? ""}
              refetch={refetchCard}
              isEdit
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_LABEL"}
          >
            <DeleteLabelConfirmation
              refetch={refetchCard}
              labelPublicId={entityId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_CARD"}
          >
            <DeleteCardConfirmation
              boardPublicId={boardId ?? ""}
              cardPublicId={cardId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_COMMENT"}
          >
            <DeleteCommentConfirmation
              cardPublicId={cardId}
              commentPublicId={entityId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
          >
            <NewWorkspaceForm />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "ADD_CHECKLIST"}
          >
            <NewChecklistForm cardPublicId={cardId} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_CHECKLIST"}
          >
            <DeleteChecklistConfirmation
              cardPublicId={cardId}
              checklistPublicId={entityId}
            />
          </Modal>
        </>
      </div>
    </>
  );
}
