import Link from "next/link";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { HiMiniMinusSmall, HiMiniPlusSmall } from "react-icons/hi2";

const Text = ({ children }: { children: React.ReactNode }) => {
  return (
    <p className="text-sm leading-relaxed text-light-900 dark:text-dark-800">
      {children}
    </p>
  );
};

const Faqs = () => {
  const faqs = [
    {
      question: t`What's the difference between Kan and Trello?`,
      answer: (
        <Text>
          {t`Kan keeps the simplicity that made Trello great, without the bloat. It's open source, has a built-in MCP server for AI agents, and doesn't lock basic features like the number of boards behind a paywall.`}
        </Text>
      ),
    },
    {
      question: t`How do AI agents work with Kan?`,
      answer: (
        <Text>
          {t`Kan has a built-in MCP server. Connect Claude, Cursor or any MCP client to your workspace and agents can read boards, create cards and move work forward alongside your team. Available on Teams and Enterprise plans, and on every self-hosted install.`}
        </Text>
      ),
    },
    {
      question: t`How does the free trial work?`,
      answer: (
        <Text>
          {t`Team plans start with a 14-day free trial. You can switch plans or cancel anytime.`}
        </Text>
      ),
    },
    {
      question: t`Do you offer a free plan?`,
      answer: <Text>{t`Yes, Kan is free forever for individual use.`}</Text>,
    },
    {
      question: t`How do I import my Trello boards?`,
      answer: (
        <Text>
          <Trans>
            Follow our{" "}
            <Link
              href="https://docs.kan.bn/imports/trello"
              className="underline"
            >
              step-by-step guide
            </Link>{" "}
            to bring your Trello boards across in a few clicks.
          </Trans>
        </Text>
      ),
    },
    {
      question: t`How do I invite team members?`,
      answer: (
        <Text>
          {t`Go to the members page in your workspace, click "Invite" and enter their email address. They'll get a link to join.`}
        </Text>
      ),
    },
    {
      question: t`Is Kan open source?`,
      answer: (
        <Text>
          <Trans>
            Yes, Kan is licensed under AGPL-3.0. You can browse the code or
            self-host it by following the instructions in our{" "}
            <Link href="https://github.com/kanbn/kan" className="underline">
              GitHub repo
            </Link>
            .
          </Trans>
        </Text>
      ),
    },
  ];

  return (
    <div className="grid gap-8 px-4 pb-24 lg:grid-cols-[1fr_2fr]">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-light-1000 lg:text-xl dark:text-dark-1000">
        {t`FAQs`}
      </h2>
      <dl className="divide-y divide-light-300 dark:divide-dark-200">
        {faqs.map((faq) => (
          <Disclosure
            key={faq.question}
            as="div"
            className="py-4 first:pt-0 last:pb-0"
          >
            <dt>
              <DisclosureButton className="group flex w-full items-center justify-between text-left text-light-1000 dark:text-dark-1000">
                <span className="text-sm font-medium">{faq.question}</span>
                <span className="ml-6 flex h-6 items-center text-light-800 dark:text-dark-800">
                  <HiMiniPlusSmall
                    aria-hidden="true"
                    className="size-5 group-data-open:hidden"
                  />
                  <HiMiniMinusSmall
                    aria-hidden="true"
                    className="size-5 group-[&:not([data-open])]:hidden"
                  />
                </span>
              </DisclosureButton>
            </dt>
            <DisclosurePanel as="dd" className="mt-2 pr-12">
              {faq.answer}
            </DisclosurePanel>
          </Disclosure>
        ))}
      </dl>
    </div>
  );
};

export default Faqs;
