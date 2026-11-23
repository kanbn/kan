import Link from "next/link";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import { HiArrowUp, HiCheck } from "react-icons/hi2";
import {
  SiClaude,
  SiCursor,
  SiGithubcopilot,
  SiGooglegemini,
  SiWindsurf,
  SiZedindustries,
} from "react-icons/si";

import SectionHeading from "./SectionHeading";

const clients = [
  { name: "Claude", Icon: SiClaude },
  { name: "Cursor", Icon: SiCursor },
  { name: "GitHub Copilot", Icon: SiGithubcopilot },
  { name: "Windsurf", Icon: SiWindsurf },
  { name: "Zed", Icon: SiZedindustries },
  { name: "Gemini", Icon: SiGooglegemini },
];

const Agents = () => {
  const scenarios = [
    {
      prompt: t`Turn the notes from today's planning call into cards on the Roadmap board.`,
      calls: [
        { name: "find_board_by_name", arg: `"Roadmap"` },
        { name: "create_card", arg: `"Billing page"` },
        { name: "create_card", arg: `"Invite links"` },
        { name: "create_card", arg: `"Search"` },
      ],
      reply: t`Added 3 cards to Planned on the Roadmap board.`,
    },
    {
      prompt: t`What's holding up the launch?`,
      calls: [
        { name: "get_board", arg: `"Launch"` },
        { name: "get_card_activities", arg: `"In review"` },
      ],
      reply: t`Two cards are stuck in review: Billing page and Invite links. Neither has been updated in 3 days.`,
    },
    {
      prompt: t`I've fixed the duplicate emails bug. Update the card and let the team know.`,
      calls: [
        { name: "search_workspace", arg: `"duplicate emails"` },
        { name: "update_card", arg: `list: "Done"` },
        { name: "add_card_comment", arg: `"Fixed in #482"` },
      ],
      reply: t`Moved “Duplicate notification emails” to Done and left a comment for the team.`,
    },
  ];

  const [{ scenario, stage }, setState] = useState({ scenario: 0, stage: 0 });
  const current = scenarios[scenario];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState({ scenario: 0, stage: 99 });
      return;
    }
    const interval = setInterval(() => {
      setState((prev) => {
        const end = (scenarios[prev.scenario]?.calls.length ?? 0) + 2;
        // Hold the finished reply for 3 ticks before the next example
        if (prev.stage < end + 3) return { ...prev, stage: prev.stage + 1 };
        return {
          scenario: (prev.scenario + 1) % scenarios.length,
          stage: 0,
        };
      });
    }, 900);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!current) return null;
  const replyStage = current.calls.length + 2;

  return (
    <div className="grid gap-10 px-4 pb-24 lg:grid-cols-[2fr_3fr] lg:items-center lg:gap-16">
      <div>
        <SectionHeading
          eyebrow={t`AI agents`}
          title={t`Hand off work to your agents.`}
        />
        <p className="mt-4 max-w-[440px] text-sm text-pretty text-light-900 dark:text-dark-800">
          {t`Kan's built-in MCP server lets agents work on your boards alongside your team.`}{" "}
          <Link
            href="https://docs.kan.bn/mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-light-1000 underline-offset-4 hover:underline dark:text-dark-1000"
          >
            {t`Read the docs →`}
          </Link>
        </p>

        <p className="mt-10 text-xs text-light-900 dark:text-dark-800">
          {t`Works with any MCP client`}
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
          {clients.map(({ name, Icon }) => (
            <li
              key={name}
              className="flex items-center gap-2 text-sm font-medium text-light-900 dark:text-dark-800"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {name}
            </li>
          ))}
        </ul>
      </div>

      <div
        aria-hidden="true"
        className="flex items-center rounded-3xl border border-light-300 bg-light-50 px-5 py-8 lg:px-8 lg:py-10 dark:border-dark-200 dark:bg-dark-50"
      >
        <div className="flex w-full flex-col">
          <div
            key={scenario}
            className="flex min-h-[260px] animate-fade-in flex-col gap-4"
          >
            {stage >= 1 && (
              <p className="max-w-[85%] animate-fade-in self-end rounded-2xl rounded-br-sm bg-light-200 px-3.5 py-2 text-sm text-light-1000 dark:bg-dark-200 dark:text-dark-1000">
                {current.prompt}
              </p>
            )}
            {stage >= 2 && (
              <div className="flex animate-fade-in gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d97757] text-white">
                  <SiClaude className="h-3.5 w-3.5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {current.calls.slice(0, stage - 1).map((call, i) => (
                    <div
                      key={`${call.name}-${i}`}
                      className="flex max-w-full animate-fade-in items-center gap-2 self-start truncate rounded-lg border border-light-300 px-2.5 py-1.5 font-mono text-[11px] dark:border-dark-200"
                    >
                      <HiCheck className="h-3 w-3 shrink-0 text-light-900 dark:text-dark-800" />
                      <span className="text-light-1000 dark:text-dark-1000">
                        {call.name}
                      </span>
                      <span className="truncate text-light-900 dark:text-dark-800">
                        {call.arg}
                      </span>
                    </div>
                  ))}
                  {stage >= replyStage ? (
                    <p className="animate-fade-in text-sm text-pretty text-light-950 dark:text-dark-900">
                      {current.reply}
                    </p>
                  ) : (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-light-900 dark:bg-dark-800" />
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 flex items-center justify-between rounded-xl border border-light-300 px-3.5 py-2.5 text-sm text-light-900 dark:border-dark-200 dark:text-dark-800">
            {t`Ask your agent…`}
            <HiArrowUp className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agents;
