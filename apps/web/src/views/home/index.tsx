import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useTheme } from "next-themes";
import { HiArrowRight } from "react-icons/hi2";
import { IoLogoGithub } from "react-icons/io";

import Button from "~/components/Button";
import { PageHead } from "~/components/PageHead";
import Agents from "./components/Agents";
import Cta from "./components/Cta";
import Divider from "./components/Divider";
import FAQs from "./components/Faqs";
import Features from "./components/Features";
import Layout from "./components/Layout";
import Logos from "./components/Logos";
import Testimonials from "./components/Testimonials";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Kan",
  url: "https://kan.bn",
  description:
    "Kanban for teams and agents. A simpler, faster alternative to Trello with a built-in MCP server.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  license: "https://www.gnu.org/licenses/agpl-3.0.html",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    {
      "@type": "Offer",
      name: "Teams",
      price: "8",
      priceCurrency: "USD",
      description: "Per user per month, billed yearly",
    },
  ],
  publisher: {
    "@type": "Organization",
    name: "Kan",
    url: "https://kan.bn",
    sameAs: ["https://github.com/kanbn/kan"],
  },
};

export default function HomeView() {
  const { resolvedTheme } = useTheme();

  return (
    <Layout>
      <PageHead
        title="kan.bn | Kanban for teams and agents"
        description="Your team plans the work, your agents help get it done. A simpler, faster alternative to Trello with a built-in MCP server. Try it free for 14 days."
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </Head>
      <div className="flex h-full w-full flex-col">
        <section className="w-full px-4 pt-36 pb-14 lg:pt-44 lg:pb-16">
          <div className="flex animate-fade-down flex-col items-start">
            <Link
              href="https://github.com/kanbn/kan"
              rel="noopener noreferrer"
              target="_blank"
              className="group flex items-center gap-1.5 rounded-full border border-light-300 bg-light-50/60 py-0.5 pr-2.5 pl-0.5 text-[11px] text-light-950 backdrop-blur-sm transition-colors hover:text-light-1000 dark:border-dark-300 dark:bg-dark-100/60 dark:text-dark-900 dark:hover:text-dark-1000"
            >
              <span className="flex items-center gap-1 rounded-full bg-light-200 px-1.5 py-0.5 text-light-1000 dark:bg-dark-300 dark:text-dark-1000">
                <IoLogoGithub size={12} />
                {t`Open source`}
              </span>
              {t`Star us on GitHub`}
              <HiArrowRight
                size={10}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>

            <h1 className="mt-6 max-w-[600px] bg-linear-to-br from-light-1000 from-40% to-light-900 bg-clip-text pb-1 text-[28px] leading-[1.1] font-semibold tracking-[-0.035em] text-balance text-transparent sm:text-4xl lg:text-[48px] dark:from-dark-1000 dark:to-dark-800">
              <Trans>Kanban for teams and agents</Trans>
            </h1>

            <p className="mt-4 max-w-[480px] text-sm text-pretty text-light-950 sm:text-base dark:text-dark-900">
              {t`Your team plans the work, your agents help get it done.`}
              <br />
              {t`A simpler, faster alternative to Trello.`}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                href="/signup"

                iconRight={<HiArrowRight className="h-4 w-4" />}
              >
                {t`Try Kan free`}
              </Button>
              <Button variant="secondary" href="/pricing">
                {t`See pricing`}
              </Button>
            </div>
            <p className="mt-4 text-xs text-light-900 sm:text-sm dark:text-dark-800">
              {t`14-day free trial, cancel anytime`}
            </p>
          </div>
        </section>

        <section className="px-4 pb-10">
          <div className="rounded-[16px] border border-light-300 bg-light-50 p-1 lg:rounded-[20px] lg:p-1.5 dark:border-white/10 dark:bg-dark-100">
            <div className="relative overflow-hidden rounded-[12px] border border-light-300 lg:rounded-[14px] dark:border-white/10">
              <Image
                src={`/hero-light.png`}
                alt="kanban"
                width={1100}
                height={1000}
                priority
                className="block dark:hidden"
              />
              <Image
                src={`/hero-dark.png`}
                alt="kanban"
                width={1100}
                height={1000}
                priority
                className="hidden dark:block"
              />
            </div>
          </div>
        </section>

        <Divider />
        <Logos />
        <Divider />
        <div className="relative pt-16">
          <div id="features" className="absolute -top-20" />
          <Features theme={resolvedTheme === "dark" ? "dark" : "light"} />
        </div>
        <Divider />
        <div className="relative pt-16">
          <div id="agents" className="absolute -top-20" />
          <Agents />
        </div>
        <Divider />
        <div className="relative pt-16">
          <div id="testimonials" className="absolute -top-20" />
          <Testimonials />
        </div>
        <Divider />
        <div className="relative pt-16">
          <div id="faq" className="absolute -top-20" />
          <FAQs />
        </div>
        <Divider />
        <div className="relative">
          <Cta />
        </div>
      </div>
    </Layout>
  );
}
