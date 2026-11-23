import { t } from "@lingui/core/macro";
import { HiArrowRight } from "react-icons/hi2";

import Button from "~/components/Button";

const Cta = ({ showPricing = true }: { showPricing?: boolean }) => {
  return (
    <div className="flex flex-col items-center gap-8 px-4 py-24 text-center lg:py-32">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-light-1000 sm:text-2xl lg:text-4xl dark:text-dark-1000">
          {t`Get started for free`}
        </h2>
        <p className="mt-3 text-sm text-light-900 dark:text-dark-800">
          {t`14-day free trial, cancel anytime`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          href="/signup"

          iconRight={<HiArrowRight className="h-4 w-4" />}
        >
          {t`Try Kan free`}
        </Button>
        {showPricing && (
          <Button variant="secondary" href="/pricing">
            {t`See pricing`}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Cta;
