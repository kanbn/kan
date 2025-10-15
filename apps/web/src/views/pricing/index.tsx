import { t } from "@lingui/core/macro";

import { PageHead } from "~/components/PageHead";
import Layout from "../home/components/Layout";
import PricingTiers from "./components/PricingTiers";

export default function PricingView() {
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
            <p className="text:md lg:text-md mt-6 max-w-[500px] text-center text-dark-900">
              {t`Get started for free, with no usage limits. For collaboration, upgrade to a plan that fits the size of your team.`}
            </p>
          </div>
          <PricingTiers />
        </div>
      </div>
    </Layout>
  );
}
