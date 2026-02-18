import Link from "next/link";
import { Radio, RadioGroup } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { HiBolt, HiCheckCircle } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

type FrequencyValue = "monthly" | "annually";

interface Frequency {
  value: FrequencyValue;
  label: string;
  priceSuffix: string;
}

const Pricing = ({
  frequency,
  frequencies,
  setFrequency,
}: {
  frequency: Frequency | undefined;
  frequencies: Frequency[];
  setFrequency: (frequency: Frequency) => void;
}) => {
  const tiers = [
    {
      name: t`Free`,
      id: "tier-free",
      href: "signup",
      buttonText: t`Get started`,
      price: { monthly: t`$0`, annually: t`$0` },
      description: t`Free for everyone`,
      bestFor: t`Best for individuals and solo creators getting started`,
      featureHeader: undefined,
      features: [
        { text: t`1 user` },
        { text: t`Unlimited boards` },
        { text: t`Unlimited cards` },
        { text: t`Custom board templates` },
        { text: t`Checklists` },
      ],
      showPrice: true,
      ctaSubtext: undefined,
      mostPopular: false,
      highlighted: false,
    },
    {
      name: t`Teams`,
      id: "tier-teams",
      href: "signup",
      buttonText: t`Get started`,
      price: { monthly: "$10", annually: "$8" },
      description: t`Perfect for small and growing teams looking to collaborate.`,
      bestFor: t`Best for small and growing teams that need collaboration`,
      featureHeader: undefined,
      features: [
        { text: t`All Free features +` },
        { text: t`Workspace members` },
        { text: t`Invite links` },
        { text: t`Unlimited file uploads` },
        { text: t`Email notifications for mentions` },
        { text: t`Priority email support` },
      ],
      highlighted: false,
      showPrice: true,
      showPriceSuffix: true,
      ctaSubtext: t`14 day free trial · Switch plans or cancel anytime`,
      mostPopular: false,
    },
    {
      name: t`Pro`,
      id: "tier-pro",
      href: "signup",
      buttonText: t`Get started`,
      price: { monthly: "$29", annually: "$24" },
      description: t`Unlimited seats and advanced features for growing teams.`,
      bestFor: t`Best for teams that want to scale without limits`,
      featureHeader: undefined,
      features: [
        { text: t`All Teams features +` },
        { text: t`Unlimited members` },
        { text: t`Custom workspace username` },
        { text: t`Configurable user roles and permissions` },
        { text: t`Custom branding` },
      ],
      highlighted: true,
      showPrice: true,
      showPriceSuffix: false,
      ctaSubtext: t`14 day free trial · Switch plans or cancel anytime`,
      mostPopular: true,
    },
    {
      name: t`Enterprise`,
      id: "tier-enterprise",
      href: "mailto:support@kan.bn?subject=Enterprise Inquiry",
      buttonText: t`Contact Sales`,
      price: { monthly: t`Contact us`, annually: t`Contact us` },
      description: t`Advanced security, compliance, and dedicated support for large organizations.`,
      bestFor: t`Best for large organizations with advanced needs`,
      featureHeader: undefined,
      features: [
        { text: t`All Pro features +` },
        { text: t`SAML SSO` },
        { text: t`Advanced admin controls` },
        { text: t`Dedicated account manager` },
        { text: t`Custom SLA` },
        { text: t`On-premise deployment option` },
      ],
      highlighted: false,
      showPrice: true,
      showPriceSuffix: false,
      ctaSubtext: undefined,
      mostPopular: false,
    },
  ];

  return (
    <>
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 flex items-center justify-center">
          <fieldset aria-label={t`Payment frequency`}>
            <RadioGroup
              value={frequency}
              onChange={(value) => setFrequency(value)}
              className="flex gap-1 rounded-lg border border-light-300 bg-light-50 p-1 dark:border-dark-300 dark:bg-dark-50"
            >
              {frequencies.map((option) => (
                <Radio
                  key={option.value}
                  value={option}
                  className={twMerge(
                    "cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                    frequency?.value === option.value
                      ? "bg-white text-light-1000 shadow-sm dark:bg-dark-100 dark:text-dark-1000"
                      : "text-light-600 dark:text-dark-700",
                  )}
                >
                  {option.label}
                </Radio>
              ))}
            </RadioGroup>
          </fieldset>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={twMerge(
              "relative flex h-full flex-col rounded-lg border p-6",
              tier.mostPopular
                ? "border-light-400 bg-light-200 dark:border-dark-400 dark:bg-dark-100"
                : "border-light-300 bg-light-50 dark:border-dark-300 dark:bg-dark-50",
            )}
          >
            {tier.id === "tier-pro" && (
              <div className="absolute right-2 top-2 z-10">
                <span className="inline-flex items-center gap-1 rounded-full border border-light-400 bg-light-100 px-3 py-1 text-center text-xs text-dark-600 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-900">
                  <HiBolt className="h-3 w-3 -ml-0.5" />
                  {t`Launch offer`}
                </span>
              </div>
            )}
            <h3
              id={tier.id}
              className={twMerge(
                "mb-4 flex items-center text-base font-semibold",
                tier.mostPopular
                  ? "text-light-1000 dark:text-dark-1000"
                  : "text-light-1000 dark:text-dark-1000",
              )}
            >
              {tier.name}
              {tier.id === "tier-pro" && <span className="ml-1 text-xl leading-none">∞</span>}
            </h3>
            <div className="mb-4">
              <p className="flex items-baseline gap-x-1">
                <span
                  className={twMerge(
                    "text-2xl font-semibold",
                    tier.mostPopular
                      ? "text-light-1000 dark:text-dark-1000"
                      : "text-light-1000 dark:text-dark-1000",
                    !tier.showPrice && "opacity-0",
                  )}
                >
                  {tier.price[frequency?.value ?? "monthly"]}
                </span>
                {tier.id === "tier-pro" && (
                  <span
                    className={twMerge(
                      "text-2xl font-semibold line-through",
                      tier.mostPopular
                        ? "text-light-600 dark:text-dark-600"
                        : "text-light-600 dark:text-dark-600",
                    )}
                  >
                    {frequency?.value === "annually" ? "$79" : "$100"}
                  </span>
                )}
                {tier.showPriceSuffix && (
                  <span className="text-sm font-normal text-dark-400 dark:text-dark-700">
                    {frequency?.priceSuffix}
                  </span>
                )}
                {tier.id === "tier-pro" && (
                  <span className="text-sm font-normal text-dark-400 dark:text-dark-700">
                    {t`/month`}
                  </span>
                )}
              </p>
            </div>
            {tier.bestFor && (
              <p className="mb-6 text-sm text-dark-400 dark:text-dark-700">
                {tier.bestFor}
              </p>
            )}
            <div className="mb-6">
              {tier.id === "tier-enterprise" ? (
                <a
                  href={tier.href}
                  aria-describedby={tier.id}
                  className="block w-full rounded-md border border-dark-200 bg-transparent px-4 py-2 text-center text-sm font-medium text-dark-50 transition-colors hover:bg-dark-50 hover:text-light-50 dark:border-dark-300 dark:text-dark-1000 dark:hover:bg-dark-200"
                >
                  {tier.buttonText}
                </a>
              ) : (
                <>
                  <Link
                    href={tier.href}
                    aria-describedby={tier.id}
                    className={twMerge(
                      "block w-full rounded-md px-4 py-2 text-center text-sm font-medium transition-colors",
                      tier.mostPopular
                        ? "bg-dark-50 text-light-50 shadow-sm hover:bg-dark-100 dark:bg-dark-1000 dark:text-dark-50 dark:hover:bg-dark-900"
                        : "border border-dark-200 bg-transparent text-dark-50 transition-colors hover:bg-dark-50 hover:text-light-50 dark:border-dark-300 dark:text-dark-1000 dark:hover:bg-dark-200",
                    )}
                  >
                    {tier.buttonText}
                  </Link>
                </>
              )}
            </div>
            <ul role="list" className="space-y-2.5">
              {tier.features.map((feature, index) => (
                <li
                  key={`${tier.id}-feature-${index}`}
                  className="flex items-start gap-x-2.5"
                >
                  <HiCheckCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-light-1000 dark:text-dark-1000"
                  />
                  <span className="text-sm text-dark-600 dark:text-dark-800">
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        </div>
        <div className="mx-auto mt-8 max-w-3xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-light-50 px-4 py-1 text-center text-xs text-light-1000 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900">
            <p>{t`14 day free trial · Switch plans or cancel anytime`}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Pricing;
