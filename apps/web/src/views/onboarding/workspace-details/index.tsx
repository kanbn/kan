import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  HiArrowLeft,
  HiArrowPath,
  HiArrowRight,
  HiCheck,
  HiEllipsisVertical,
  HiInformationCircle,
  HiLockClosed,
} from "react-icons/hi2";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import Input from "~/components/Input";
import LoadingSpinner from "~/components/LoadingSpinner";
import Toggle from "~/components/Toggle";
import { Tooltip } from "~/components/Tooltip";
import { useDebounce } from "~/hooks/useDebounce";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export default function WorkspaceNameView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") ?? "solo";
  const billing = searchParams.get("billing") ?? "annual";
  const returnUrl = searchParams.get("returnUrl") ?? "/boards";
  const { showPopup } = usePopup();
  const [isProToggle, setIsProToggle] = useState(plan === "pro");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    if (isProToggle && !slugManuallyEdited) {
      setSlug(slugify(value));
    }
  };

  const [debouncedSlug] = useDebounce(slug, 500);
  const isTyping = slug !== debouncedSlug;

  const slugAvailability = api.workspace.checkSlugAvailability.useQuery(
    { workspaceSlug: debouncedSlug },
    { enabled: isProToggle && debouncedSlug.length >= 3 && !isTyping },
  );

  const isSlugAvailable =
    slugAvailability.data?.isAvailable && !slugAvailability.data?.isReserved;
  const isSlugTaken =
    slugAvailability.data?.isAvailable === false &&
    !slugAvailability.data?.isReserved;
  const isSlugReserved = slugAvailability.data?.isReserved === true;

  const slugError = isSlugTaken
    ? t`This URL has already been taken`
    : isSlugReserved
      ? t`This URL is reserved`
      : undefined;

  const { data: session } = authClient.useSession();
  const { data: user } = api.user.getUser.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const { data: workspaces } = api.workspace.all.useQuery();
  const hasExistingWorkspace = !!workspaces?.length;

  const utils = api.useUtils();

  const previewSlug = isProToggle
    ? slugify(slug) || slugify(name) || "your-workspace"
    : "your-workspace";

  const createWorkspace = api.workspace.create.useMutation({
    onSuccess: async (workspace) => {
      if (!workspace.publicId) return;
      localStorage.setItem("workspacePublicId", workspace.publicId);
      void utils.workspace.all.invalidate();
      router.push("/boards");
    },
    onError: () => {
      showPopup({
        header: t`Unable to create workspace`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) return;

    if (plan === "solo") {
      createWorkspace.mutate({
        name: name.trim(),
        ...(description.trim() && { description: description.trim() }),
      });
      return;
    }

    // team/pro: redirect to Stripe — workspace created on checkout_success
    setIsRedirectingToCheckout(true);
    try {
      const response = await fetch("/api/stripe/create_checkout_session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceName: name.trim(),
          ...(description.trim() && {
            workspaceDescription: description.trim(),
          }),
          ...(plan === "pro" && slug ? { workspaceSlug: slug } : {}),
          cancelUrl: window.location.pathname + window.location.search,
          successUrl: "/boards",
          billing,
          plan,
        }),
      });
      const data = await response.json();
      const url = (data as { url: string }).url;
      if (url) {
        window.location.href = url;
        return;
      }
    } catch {
      // fall through
    }
    setIsRedirectingToCheckout(false);
    showPopup({
      header: t`Unable to start checkout`,
      message: t`Please try again later, or contact customer support.`,
      icon: "error",
    });
  };

  useEffect(() => {
    document.getElementById("workspace-name-input")?.focus();
  }, []);

  const displayName = user?.name ?? session?.user.name ?? "";

  const BOARDS = [t`Roadmap`, t`Engineering`, t`Marketing`];
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const timers = BOARDS.slice(1).map((_, i) =>
      setTimeout(() => setVisibleCount(i + 2), (i + 1) * 2000),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-light-100 px-4 py-8 dark:bg-dark-50 md:px-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-light-400 bg-light-200 shadow-xl dark:border-dark-400 dark:bg-dark-100">
        <div className="flex flex-col md:h-[520px] md:flex-row">
          {/* Left panel */}
          <div className="flex flex-col p-6 md:w-[55%] md:p-8">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-light-1000 dark:text-dark-1000">
                {t`Set up your workspace`}
              </h2>
              <p className="mt-1 text-sm text-light-800 dark:text-dark-800">
                {t`You can always change these later in settings.`}
              </p>

              <div className="mt-6 space-y-3">
                <Input
                  id="workspace-name-input"
                  placeholder={t`Workspace name`}
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                  maxLength={64}
                />

                <div className="space-y-2">
                  <Input
                    placeholder={t`your-workspace`}
                    value={isProToggle ? slug : t`your-workspace`}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9\s-]/g, "")
                          .replace(/\s+/g, "-")
                          .replace(/-+/g, "-")
                          .slice(0, 60),
                      );
                    }}
                    disabled={!isProToggle}
                    prefix="kan.bn/"
                    className={
                      !isProToggle ? "cursor-not-allowed opacity-50" : ""
                    }
                    errorMessage={slugError}
                    iconRight={
                      !isProToggle ? (
                        <Tooltip
                          content={
                            <span className="text-xs">{t`Custom usernames require upgrading to a Pro plan`}</span>
                          }
                          placement="top"
                          delay={0}
                        >
                          <HiInformationCircle className="h-4 w-4 leading-[0] text-dark-700 dark:text-dark-700" />
                        </Tooltip>
                      ) : isProToggle && slug.length >= 3 ? (
                        isTyping || slugAvailability.isPending ? (
                          <LoadingSpinner />
                        ) : isSlugAvailable ? (
                          <HiCheck className="h-4 w-4 text-white" />
                        ) : null
                      ) : null
                    }
                  />
                </div>

                {plan !== "pro" && (
                  <div className="pb-2">
                    <Toggle
                      isChecked={isProToggle}
                      onChange={() => setIsProToggle((v) => !v)}
                      label={t`Upgrade to Pro ($29/month)`}
                      labelPosition="after"
                    />
                  </div>
                )}

                <div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t`Workspace description`}
                    maxLength={280}
                    rows={3}
                    className="block w-full resize-none rounded-md border-0 bg-dark-300 bg-white/5 py-1.5 text-sm shadow-sm ring-1 ring-inset ring-light-600 placeholder:text-dark-800 focus:ring-2 focus:ring-inset focus:ring-light-700 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700 sm:leading-6"
                  />
                  <p className="mt-1 text-right text-[10px] text-light-700 dark:text-dark-700">
                    {description.length}/280
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="ml-auto flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() =>
                    router.replace(
                      `/onboarding/select-plan?plan=${plan}&billing=${billing}&returnUrl=${encodeURIComponent(returnUrl)}`,
                    )
                  }
                >
                  {t`Back`}
                </Button>
                <Button
                  onClick={() => void handleContinue()}
                  disabled={
                    !name.trim() ||
                    createWorkspace.isPending ||
                    isRedirectingToCheckout ||
                    (isProToggle &&
                      slug.length >= 3 &&
                      (isTyping || slugAvailability.isPending || !!slugError))
                  }
                  isLoading={
                    createWorkspace.isPending || isRedirectingToCheckout
                  }
                >
                  {t`Continue`}
                </Button>
              </div>
            </div>
          </div>

          {/* Right panel — browser mockup */}
          <div className="hidden flex-col bg-light-300 dark:bg-dark-200 md:flex md:w-[45%]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-light-400 px-3 py-2.5 dark:border-dark-400">
              <div className="flex items-center gap-1.5 text-light-700 dark:text-dark-700">
                <HiArrowLeft className="h-3.5 w-3.5" />
                <HiArrowRight className="h-3.5 w-3.5" />
                <HiArrowPath className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-1 items-center gap-1.5 rounded-md bg-light-200 px-2.5 py-1 dark:bg-dark-300">
                <HiLockClosed className="h-3 w-3 flex-shrink-0 text-light-700 dark:text-dark-700" />
                <span className="truncate text-xs text-light-900 dark:text-dark-900">
                  kan.bn/
                  <span className="text-light-1000 dark:text-dark-1000">
                    {previewSlug}
                  </span>
                </span>
              </div>
              <HiEllipsisVertical className="h-4 w-4 flex-shrink-0 text-light-700 dark:text-dark-700" />
            </div>

            {/* Browser content */}
            <div className="flex flex-1 flex-col items-center overflow-hidden px-14 py-8">
              {/* Workspace name + description */}
              <p className="text-center text-xs font-bold text-light-1000 dark:text-dark-1000">
                {name || t`Your workspace`}
              </p>
              <p className="mt-0.5 line-clamp-2 break-all text-center text-[10px] text-light-800 dark:text-dark-800">
                {description || t`Your workspace description`}
              </p>

              {/* Boards area */}
              <div className="mt-3 flex w-full flex-1 flex-col rounded-lg bg-light-200 p-2 dark:bg-dark-300">
                <div className="flex flex-1 flex-col gap-1.5">
                  {BOARDS.map((board, i) => (
                    <motion.div
                      key={board}
                      initial={{ opacity: 0, y: -12 }}
                      animate={
                        i < visibleCount
                          ? { opacity: 1, y: 0 }
                          : { opacity: 0, y: -12 }
                      }
                      transition={{
                        opacity: { duration: 0.2 },
                        y: { duration: 0.25, ease: "easeOut" },
                      }}
                      className="flex w-full flex-1 items-center justify-center rounded border border-dashed border-light-400 bg-light-50 px-3 text-[10px] font-medium text-light-900 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-900"
                    >
                      {board}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <p className="mt-2 text-[10px] font-semibold text-light-900 dark:text-dark-900">
                kan.bn
              </p>
            </div>
          </div>
        </div>
      </div>
      {!hasExistingWorkspace && (
        <Button variant="ghost" onClick={() => authClient.signOut()}>
          {t`Sign out`}
        </Button>
      )}
    </div>
  );
}
