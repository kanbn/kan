import Link from "next/link";
import { Radio, RadioGroup } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { useState } from "react";
import { HiCheckCircle } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

type Frequency = "monthly" | "annually";

const Pricing = () => {
  const frequencies = [
    {
      value: "monthly" as Frequency,
      label: t`Monthly`,
      priceSuffix: t`per user/month`,
    },
    {
      value: "annually" as Frequency,
      label: t`Yearly`,
      priceSuffix: t`per user/month`,
    },
  ];

  const [frequency, setFrequency] = useState(frequencies[1]);

  const tiers = [
    {
      name: t`Individuals`,
      id: "tier-individuals",
      href: "signup",
      buttonText: t`Get Started`,
      price: { monthly: t`Free`, annually: t`Free` },
      description: t`Everything you need, free forever. Unlimited boards, unlimited lists, unlimited cards. Upgrade any time.`,
      featureHeader: t`Free, forever`,
      features: [
        t`1 user`,
        t`Unlimited boards`,
        t`Unlimited lists`,
        t`Unlimited cards`,
        t`Unlimited comments`,
        t`Unlimited activity log`,
      ],
      showPrice: true,
    },
    {
      name: t`Teams`,
      id: "tier-teams",
      href: "signup",
      buttonText: t`Get Started`,
      price: { monthly: "$10.00", annually: "$8.00" },
      description: t`Kanban is better with a team. Perfect for small and growing teams looking to collaborate.`,
      featureHeader: t`Everything in the free plan, plus:`,
      features: [
        t`Workspace members`,
        t`Admin roles`,
        t`Priority email support`,
        t`Support the development of the project`,
      ],
      highlighted: true,
      showPrice: true,
      showPriceSuffix: true,
    },
    {
      name: t`Self Host`,
      id: "tier-self-host",
      href: "https://github.com/kanbn/kan",
      buttonText: t`View docs`,
      price: { monthly: "-", annually: "-" },
      description: t`Host Kan on your own infrastructure. Ideal for organisations that need complete control over their data.`,
      featureHeader: t`Complete control and ownership:`,
      features: [
        t`Run on your own infrastructure`,
        t`Own your data`,
        t`Custom domain`,
      ],
      mostPopular: false,
      showPrice: false,
    },
  ];

  return (
    <>
      <div className="flex flex-col items-center justify-center px-4 pb-10">
        <div className="flex items-center gap-2 rounded-full border bg-light-50 px-4 py-1 text-center text-xs text-light-1000 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900 lg:text-sm">
          <p>{t`Pricing`}</p>
        </div>

        <p className="mt-2 text-center text-3xl font-bold text-light-1000 dark:text-dark-1000 lg:text-4xl">
          {t`Simple pricing`}
        </p>
        <p className="text:md lg:text-md mt-3 max-w-[500px] text-center text-dark-900">
          {t`Get started for free, with no usage limits. For collaboration, upgrade to a plan that fits the size of your team.`}
        </p>

        <div className="mt-16 flex justify-center">
          <fieldset aria-label={t`Payment frequency`}>
            <RadioGroup
              value={frequency}
              onChange={(value) => setFrequency(value)}
              className="grid grid-cols-2 gap-x-1 rounded-full p-1 text-center text-xs/5 font-semibold ring-1 ring-inset ring-light-600 dark:ring-dark-600"
            >
              {frequencies.map((option) => (
                <Radio
                  key={option.value}
                  value={option}
                  className={twMerge(
                    "cursor-pointer rounded-full px-2.5 py-1 text-xs transition-colors lg:text-sm",
                    frequency?.value === option.value
                      ? "bg-dark-50 text-white dark:bg-light-50 dark:text-dark-50"
                      : "text-light-900 hover:bg-light-100 dark:hover:bg-dark-100",
                  )}
                >
                  {option.label}
                </Radio>
              ))}
            </RadioGroup>
          </fieldset>
        </div>
      </div>

      <div className="isolate mx-auto mb-20 grid max-w-md grid-cols-1 gap-8 px-4 lg:mx-0 lg:max-w-none lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={twMerge(
              tier.highlighted
                ? "bg-dark-50 ring-1 ring-dark-50 dark:ring-dark-800"
                : "bg-light-50 ring-1 ring-light-300 dark:bg-dark-50 dark:ring-dark-300",
              "rounded-3xl p-8 xl:p-10",
            )}
          >
            <div className="flex items-center justify-between gap-x-4">
              <h3
                id={tier.id}
                className={twMerge(
                  tier.highlighted
                    ? "text-dark-1000 dark:text-dark-1000"
                    : "text-dark-50 dark:text-dark-1000",
                  "text-lg/8 font-semibold",
                )}
              >
                {tier.name}
              </h3>
              {tier.highlighted && frequency?.value === "annually" ? (
                <p className="rounded-full bg-light-50 px-2.5 py-1 text-[12px] font-semibold text-dark-500 dark:bg-dark-1000 dark:text-dark-50">
                  -20%
                </p>
              ) : null}
            </div>
            <p
              className={twMerge(
                "mt-4 text-sm/6 text-dark-950 dark:text-dark-900",
                tier.highlighted ? "text-light-100" : "text-dark-50",
              )}
            >
              {tier.description}
            </p>
            <p className="mt-6 flex items-baseline gap-x-1">
              <span
                className={twMerge(
                  "text-4xl font-semibold tracking-tight text-light-100",
                  tier.highlighted
                    ? "text-light-50 dark:text-dark-1000"
                    : "text-gray-900 dark:text-dark-1000",
                  !tier.showPrice && "opacity-0",
                )}
              >
                {tier.price[frequency?.value || "monthly"]}
              </span>
              {tier.showPriceSuffix && (
                <span className="text-sm/6 font-semibold text-light-50 dark:text-dark-900">
                  {frequency?.priceSuffix}
                </span>
              )}
            </p>
            <Link
              href={tier.href}
              aria-describedby={tier.id}
              className={twMerge(
                tier.highlighted
                  ? "bg-light-50 text-dark-50 shadow-sm dark:bg-dark-1000 dark:text-dark-50"
                  : "bg-dark-50 text-light-50 dark:bg-dark-200 dark:text-dark-1000",
                "mt-6 block rounded-md px-3 py-2 text-center text-sm/6 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
              )}
            >
              {tier.buttonText}
            </Link>
            <p
              className={twMerge(
                "mt-8 text-sm/6 font-bold",
                tier.highlighted
                  ? "text-light-100 dark:text-dark-1000"
                  : "text-dark-50 dark:text-dark-1000",
              )}
            >
              {tier.featureHeader}
            </p>
            <ul
              role="list"
              className={twMerge(
                "mt-2 space-y-3 text-sm/6 text-light-600",
                tier.highlighted
                  ? "text-light-100 dark:text-dark-1000"
                  : "text-dark-50 dark:text-dark-1000",
              )}
            >
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-center gap-x-3">
                  <HiCheckCircle className="h-5 w-5" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
};

export default Pricing;
