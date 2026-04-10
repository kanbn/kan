import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { Radio, RadioGroup } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { HiUser } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import { api } from "~/utils/api";

type PlanId = "solo" | "team" | "pro";
type Billing = "monthly" | "annual";

// Each user orbits via a zero-size pivot div at center (144,144) that rotates.
// The icon is offset from the pivot by `radius` pixels along the x-axis.
// A counter-rotation on the icon keeps it upright.
const ORBIT_USERS: Record<
  PlanId,
  { id: string; angle: number; radius: number; duration: number }[]
> = {
  solo: [],
  team: [
    { id: "t1", angle: 45, radius: 104, duration: 50 },
    { id: "t2", angle: 170, radius: 104, duration: 50 },
    { id: "t3", angle: 290, radius: 104, duration: 50 },
  ],
  pro: [
    { id: "t1", angle: 45, radius: 104, duration: 50 },
    { id: "t2", angle: 170, radius: 104, duration: 50 },
    { id: "t3", angle: 290, radius: 104, duration: 50 },
    { id: "p1", angle: 10, radius: 144, duration: 70 },
    { id: "p2", angle: 120, radius: 144, duration: 70 },
    { id: "p4", angle: 240, radius: 144, duration: 70 },
    { id: "p3", angle: 230, radius: 64, duration: 30 },
  ],
};

export default function SelectPlanView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<PlanId>(
    (searchParams.get("plan") as PlanId | null) ?? "solo",
  );
  const [billing, setBilling] = useState<Billing>(
    (searchParams.get("billing") as Billing | null) ?? "annual",
  );
  const returnUrl = searchParams.get("returnUrl") ?? "/boards";
  const { data: workspaces } = api.workspace.all.useQuery();
  const { data: session } = authClient.useSession();
  const { data: user } = api.user.getUser.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const userImage = user?.image ?? session?.user.image ?? null;

  const hasExistingWorkspace = !!workspaces?.length;

  const FREQUENCIES: { value: Billing; label: string }[] = [
    { value: "monthly", label: t`Monthly` },
    { value: "annual", label: t`Annual` },
  ];

  const PLANS: {
    id: PlanId;
    name: string;
    monthly: string;
    annual: string;
    description: string;
    trial?: boolean;
  }[] = [
    {
      id: "solo",
      name: t`Solo`,
      monthly: t`Free`,
      annual: t`Free`,
      description: t`Good for individuals starting out who just need the essentials.`,
    },
    {
      id: "team",
      name: t`Team`,
      monthly: "$10/user/mo",
      annual: "$8/user/mo",
      description: t`Best for small teams who want to collaborate and move faster together.`,
      trial: true,
    },
    {
      id: "pro",
      name: t`Pro`,
      monthly: "$29/mo",
      annual: "$23/mo",
      description: t`Unlimited members and a custom workspace username for teams ready to scale.`,
      trial: true,
    },
  ];

  const handleSelectPlan = (plan: PlanId) => {
    setSelected(plan);
    router.replace(`/onboarding/select-plan?plan=${plan}&billing=${billing}&returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  const handleSetBilling = (b: Billing) => {
    setBilling(b);
    router.replace(`/onboarding/select-plan?plan=${selected}&billing=${b}&returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  const handleContinue = () =>
    router.push(`/onboarding/workspace?plan=${selected}&billing=${billing}&returnUrl=${encodeURIComponent(returnUrl)}`);

  const handleCancel = () => router.push(returnUrl);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-light-100 px-4 py-8 dark:bg-dark-50 md:px-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-light-400 bg-light-200 shadow-xl dark:border-dark-400 dark:bg-dark-100">
        <div className="flex flex-col md:h-[520px] md:flex-row">
          {/* Left panel */}
          <div className="flex flex-col p-6 md:w-[55%] md:p-8">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-light-1000 dark:text-dark-1000">
                {t`Choose a plan`}
              </h2>
              <p className="mt-1 text-sm text-light-800 dark:text-dark-800">
                {t`Pick a plan to get started. All paid plans include a 14-day free trial.`}
              </p>

              {/* Billing toggle */}
              <div className="mt-4 flex justify-end">
                <RadioGroup
                  value={billing}
                  onChange={handleSetBilling}
                  className="grid grid-cols-2 gap-x-1 rounded-full p-1 text-center text-xs font-semibold ring-1 ring-inset ring-light-600 dark:ring-dark-600"
                >
                  {FREQUENCIES.map((f) => (
                    <Radio
                      key={f.value}
                      value={f.value}
                      className={twMerge(
                        "cursor-pointer rounded-full px-2.5 py-0.5 text-xs transition-colors",
                        billing === f.value
                          ? "bg-dark-50 text-white dark:bg-light-50 dark:text-dark-50"
                          : "text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200",
                      )}
                    >
                      {f.label}
                    </Radio>
                  ))}
                </RadioGroup>
              </div>

              <div className="mt-4 space-y-3">
                {PLANS.map((plan) => {
                  const badge =
                    billing === "annual" ? plan.annual : plan.monthly;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`relative w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                        selected === plan.id
                          ? "border-light-700 bg-light-300 dark:border-dark-600 dark:bg-dark-200"
                          : "border-light-500 bg-light-200 hover:border-light-600 dark:border-dark-500 dark:bg-dark-100 dark:hover:border-dark-600"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-8">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-light-1000 dark:text-dark-1000">
                              {plan.name}
                            </span>
                            <span className="rounded-full bg-neutral-700 px-2 py-px text-[11px] font-medium text-neutral-200">
                              {badge}
                            </span>
                            {plan.trial && billing === "annual" && (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-px text-[11px] font-medium text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400">
                                -20%
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-light-800 dark:text-dark-800">
                            {plan.description}
                          </p>
                        </div>
                        <div className="mt-0.5 flex-shrink-0">
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                              selected === plan.id
                                ? "border-light-900 bg-light-900 dark:border-dark-900 dark:bg-dark-900"
                                : "border-light-700 dark:border-dark-700"
                            }`}
                          >
                            {selected === plan.id && (
                              <div className="h-1.5 w-1.5 rounded-full bg-light-100 dark:bg-dark-100" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 md:mt-8">
              {hasExistingWorkspace && (
                <Button variant="ghost" onClick={handleCancel}>
                  {t`Cancel`}
                </Button>
              )}
              <Button onClick={handleContinue}>{t`Continue`}</Button>
            </div>
          </div>

          {/* Right panel */}
          <div className="hidden items-center justify-center bg-light-200 dark:bg-dark-200 md:flex md:w-[45%]">
            <div className="relative h-72 w-72">
              {/* Orbit rings */}
              <div className="absolute inset-0 m-auto h-72 w-72 rounded-full border border-light-400 dark:border-dark-400" />
              <div className="absolute inset-0 m-auto h-52 w-52 rounded-full border border-light-400 dark:border-dark-400" />
              <div className="absolute inset-0 m-auto h-32 w-32 rounded-full border border-light-400 dark:border-dark-400" />

              {/* Centre person */}
              <div className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-light-300 dark:bg-dark-300">
                {userImage ? (
                  <img
                    src={userImage}
                    alt={t`Your avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <HiUser className="h-7 w-7 text-light-700 dark:text-dark-700" />
                )}
              </div>

              {/* Orbiting users — zero-size pivot at center rotates; icon offset by radius stays on the ring */}
              <AnimatePresence>
                {ORBIT_USERS[selected].map((u) => (
                  <motion.div
                    key={u.id}
                    style={{ position: "absolute", left: 144, top: 144 }}
                    initial={{ opacity: 0, rotate: u.angle }}
                    animate={{ opacity: 1, rotate: u.angle + 360 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      opacity: { duration: 0.3 },
                      rotate: {
                        duration: u.duration,
                        repeat: Infinity,
                        ease: "linear",
                        repeatType: "loop",
                      },
                    }}
                  >
                    {/* Counter-rotate icon so it stays upright */}
                    <motion.div
                      style={{
                        position: "absolute",
                        left: u.radius - 12,
                        top: -12,
                      }}
                      initial={{ rotate: -u.angle }}
                      animate={{ rotate: -(u.angle + 360) }}
                      transition={{
                        duration: u.duration,
                        repeat: Infinity,
                        ease: "linear",
                        repeatType: "loop",
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-light-400 dark:bg-dark-400"
                    >
                      <HiUser className="h-3.5 w-3.5 text-light-800 dark:text-dark-800" />
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
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
