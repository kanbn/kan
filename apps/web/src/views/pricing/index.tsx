import { t } from "@lingui/core/macro";
import { useTheme } from "next-themes";
import { useState } from "react";

import Button from "~/components/Button";
import { PageHead } from "~/components/PageHead";
import Cta from "../home/components/Cta";
import Layout from "../home/components/Layout";
import FeatureComparisonTable from "./components/FeatureComparisonTable";
import PricingTiers from "./components/PricingTiers";

type FrequencyValue = "monthly" | "annually";

export default function PricingView() {
  const { resolvedTheme } = useTheme();
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
      <PageHead title={`${t`Pricing`} | kan.bn`} />

      <div className="flex h-full w-full flex-col lg:pt-[5rem]">
        <div className="w-full pb-10 pt-32 lg:py-32">
          <div className="flex flex-col items-center justify-center px-4 pb-10">
            <div className="flex items-center gap-2 rounded-full border bg-light-50 px-4 py-1 text-center text-xs text-light-1000 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900 lg:text-sm">
              <p>{t`Pricing`}</p>
            </div>

            <p className="mt-4 text-center text-3xl font-bold text-light-1000 dark:text-dark-1000 lg:text-5xl">
              {t`Simple pricing`}
            </p>
            <p className="text:md lg:text-md mt-6 max-w-[500px] text-center text-light-950 dark:text-dark-900">
              {t`Get started for free, with no usage limits. For collaboration, upgrade to a plan that fits the size of your team.`}
            </p>
          </div>
          <PricingTiers
            frequency={frequency}
            frequencies={frequencies}
            setFrequency={setFrequency}
          />
        </div>

        <div className="pb-22 flex flex-col items-center justify-center px-4">
          <div className="flex items-center gap-2 rounded-full border bg-light-50 px-4 py-1 text-center text-xs text-light-1000 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900 lg:text-sm">
            <p>{t`Features`}</p>
          </div>

          <p className="mt-4 text-center text-3xl font-bold text-light-1000 dark:text-dark-1000 lg:text-4xl">
            {t`Feature breakdown`}
          </p>
          <p className="text-md lg:text-md my-4 max-w-[500px] text-center text-light-950 dark:text-dark-900">
            {t`Compare our features to see why Kan is the best choice.`}
          </p>
          <div className="mt-2">
            <Button variant="primary" href="/signup">
              {t`Get started`}
            </Button>
          </div>

          <div className="mt-10 w-full max-w-[900px]">
            <FeatureComparisonTable
              frequencyValue={frequency?.value ?? "annually"}
            />
          </div>
        </div>
        <div className="relative">
          <Cta theme={resolvedTheme ?? "light"} />
        </div>
      </div>
    </Layout>
  );
}
