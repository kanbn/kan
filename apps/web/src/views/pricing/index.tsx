import Link from "next/link";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";

import { PageHead } from "~/components/PageHead";
import Cta from "../home/components/Cta";
import Divider from "../home/components/Divider";
import Faqs from "../home/components/Faqs";
import Layout from "../home/components/Layout";
import Logos from "../home/components/Logos";
import FeatureComparisonTable from "./components/FeatureComparisonTable";
import PricingTiers from "./components/PricingTiers";

type FrequencyValue = "monthly" | "annually";

export default function PricingView() {
  const frequencies = [
    {
      value: "monthly" as FrequencyValue,
      label: t`Monthly`,
      priceSuffix: t`per user/month`,
    },
    {
      value: "annually" as FrequencyValue,
      label: t`Yearly`,
      priceSuffix: t`per user/month`,
    },
  ];

  const [frequency, setFrequency] = useState(frequencies[1]);

  return (
    <Layout>
      <PageHead
        title={`${t`Pricing`} | kan.bn`}
        description={t`Simple, transparent pricing. Start free with unlimited boards and cards, upgrade as your team grows. No hidden fees, no contracts.`}
      />

      <div className="flex h-full w-full flex-col lg:pt-20">
        <div className="w-full pt-32 pb-16">
          <div className="flex flex-col items-center justify-center px-4 pb-10">
            <h1 className="text-center text-[28px] font-semibold tracking-[-0.035em] text-light-1000 lg:text-[40px] dark:text-dark-1000">
              {t`Simple pricing`}
            </h1>
            <p className="mt-4 max-w-[340px] text-center text-sm text-pretty text-light-950 sm:text-base dark:text-dark-900">
              {t`Start free. Upgrade as your team grows. No hidden fees, no contracts.`}
            </p>
          </div>
          <PricingTiers
            frequency={frequency}
            frequencies={frequencies}
            setFrequency={setFrequency}
          />
        </div>

        <Divider />
        <Logos />
        <Divider />

        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="w-full">
            <FeatureComparisonTable
              frequencyValue={frequency?.value ?? "annually"}
            />
            <p className="mt-4 text-xs text-light-900 dark:text-dark-800">
              <Trans>
                Unlimited features are subject to our{" "}
                <Link
                  href="/terms#fair-use"
                  className="underline underline-offset-4"
                >
                  fair use policy
                </Link>
                .
              </Trans>
            </p>
          </div>
        </div>
        <Divider />
        <div className="pt-16">
          <Faqs />
        </div>
        <Divider />
        <div className="relative">
          <Cta showPricing={false} />
        </div>
      </div>
    </Layout>
  );
}
