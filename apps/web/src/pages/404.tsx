import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { HiArrowRight } from "react-icons/hi2";

import Button from "~/components/Button";
import { PageHead } from "~/components/PageHead";
import Layout from "~/views/home/components/Layout";

export default function NotFoundPage() {
  return (
    <Layout>
      <PageHead title={t`404 - Page Not Found | kan.bn`} />
      <div className="flex min-h-[70vh] flex-col justify-center px-4 pt-36 pb-24">
        <p className="text-sm font-medium text-light-900 dark:text-dark-800">
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-light-1000 lg:text-3xl dark:text-dark-1000">
          <Trans>Page not found</Trans>
        </h1>
        <p className="mt-3 max-w-[420px] text-sm text-pretty text-light-900 dark:text-dark-800">
          <Trans>
            The page you're looking for doesn't exist or has been moved.
          </Trans>
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button href="/" iconRight={<HiArrowRight className="h-4 w-4" />}>
            <Trans>Go to homepage</Trans>
          </Button>
          <Button href="/boards" variant="secondary">
            <Trans>Go to boards</Trans>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
