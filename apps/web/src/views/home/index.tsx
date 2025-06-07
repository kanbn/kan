import Image from "next/image";
import Link from "next/link";
import { IoLogoGithub, IoLogoHackernews } from "react-icons/io";

import Button from "~/components/Button";
import { PageHead } from "~/components/PageHead";
import { useTheme } from "~/providers/theme";
import Cta from "./components/Cta";
import FAQs from "./components/Faqs";
import Features from "./components/Features";
import Layout from "./components/Layout";
import Pricing from "./components/Pricing";

export default function HomeView() {
  const theme = useTheme();

  const isDarkMode = theme.activeTheme === "dark";
  return (
    <Layout>
      <PageHead title="Kan.bn | The open source alternative to Trello" />
      <div className="flex h-full w-full flex-col lg:pt-[5rem]">
        <div className="w-full pb-10 pt-32 lg:py-32">
          <div className="my-10 flex h-full w-full animate-fade-down flex-col items-center justify-center px-4">
            <div className="flex items-center gap-2">
              <div className="relative animate-fade-in overflow-hidden rounded-full bg-gradient-to-b from-light-300 to-light-400 p-[2px] dark:from-dark-300 dark:to-dark-400">
                <div className="gradient-border absolute inset-0 animate-border-spin" />

                <div className="relative z-10 rounded-full bg-light-50 dark:bg-dark-50">
                  <Link
                    href="https://github.com/kanbn/kan"
                    rel="noopener noreferrer"
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-1 text-center text-xs text-light-1000 dark:text-dark-1000 lg:text-sm"
                  >
                    Star on Github
                    <IoLogoGithub size={20} />
                  </Link>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-full bg-gradient-to-b from-light-300 to-light-400 p-[2px] dark:from-dark-300 dark:to-dark-400">
                <div className="relative z-10 rounded-full bg-light-50 dark:bg-dark-50">
                  <Link
                    href="https://news.ycombinator.com/item?id=44157177"
                    rel="noopener noreferrer"
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-1 text-center text-xs text-light-1000 dark:text-dark-1000 lg:text-sm"
                  >
                    #1 Hacker News
                    <div className="relative">
                      <div className="absolute inset-1 bg-white" />
                      <IoLogoHackernews
                        size={20}
                        className="relative text-orange-500"
                      />
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <p className="mt-2 text-center text-4xl font-bold text-light-1000 dark:text-dark-1000 lg:text-5xl">
              The open source <br />
              alternative to Trello
            </p>

            <p className="text-md mt-3 max-w-[450px] text-center text-dark-900 lg:max-w-[600px] lg:text-lg">
              A powerful, flexible kanban app that helps you organise work,
              track progress, and deliver results—all in one place.
            </p>

            <div className="mt-6 flex gap-2">
              <Button href="/signup">Get started on Cloud</Button>
              <Button
                variant="secondary"
                href="https://github.com/kanbn/kan"
                openInNewTab
              >
                Self host with Github
              </Button>
            </div>
            <p className="mt-4 text-center text-sm text-dark-900">
              No credit card required
            </p>
          </div>
        </div>
        <div className="px-4">
          <div className="mb-24 rounded-[16px] border border-light-300 bg-light-50 p-1 shadow-md dark:border-dark-300 dark:bg-dark-100 lg:rounded-[24px] lg:p-2">
            <div className="overflow-hidden rounded-[12px] border border-light-300 shadow-sm dark:border-dark-300 lg:rounded-[16px]">
              <Image
                src={`/hero-${isDarkMode ? "dark" : "light"}.png`}
                alt="kanban"
                width={1100}
                height={1000}
              />
            </div>
          </div>
        </div>
        <div className="relative pt-10">
          <div id="features" className="absolute -top-20" />
          <Features theme={theme.activeTheme} />
        </div>
        <div className="relative pt-10">
          <div id="pricing" className="absolute -top-20" />
          <Pricing />
        </div>
        <div className="relative pt-10">
          <div id="faq" className="absolute -top-20" />
          <FAQs />
        </div>
        <div className="relative">
          <Cta theme={theme.activeTheme} />
        </div>
      </div>
    </Layout>
  );
}
