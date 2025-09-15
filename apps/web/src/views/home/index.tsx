import Image from "next/image";
import Link from "next/link";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
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
      <PageHead title="Costao Lavanderia" />
      <div className="flex h-full w-full flex-col lg:pt-[5rem]">
        <div className="w-full pb-10 pt-32 lg:py-32">
         
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
        
      </div>
    </Layout>
  );
}
