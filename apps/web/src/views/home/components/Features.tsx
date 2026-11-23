import Link from "next/link";
import { t } from "@lingui/core/macro";
import { useState } from "react";

import activityLogsIconDark from "~/assets/activity-logs-dark.json";
import activityLogsIconLight from "~/assets/activity-logs-light.json";
import boardVisibilityIconDark from "~/assets/board-visibility-dark.json";
import boardVisibilityIconLight from "~/assets/board-visibility-light.json";
import commentsIconDark from "~/assets/comments-dark.json";
import commentsIconLight from "~/assets/comments-light.json";
import importsIconDark from "~/assets/imports-dark.json";
import importsIconLight from "~/assets/imports-light.json";
import integrationsIconDark from "~/assets/integrations-dark.json";
import integrationsIconLight from "~/assets/integrations-light.json";
import labelsIconDark from "~/assets/labels-dark.json";
import labelsIconLight from "~/assets/labels-light.json";
import membersIconDark from "~/assets/members-dark.json";
import membersIconLight from "~/assets/members-light.json";
import templatesIconDark from "~/assets/templates-dark.json";
import templatesIconLight from "~/assets/templates-light.json";
import LottieIcon from "~/components/LottieIcon";
import SectionHeading from "./SectionHeading";

const FeatureItem = ({
  feature,
  className,
}: {
  feature: {
    title: string;
    description: string;
    icon: Record<string, unknown>;
    new?: boolean;
  };
  className?: string;
}) => {
  const [index, setIndex] = useState(0);

  return (
    <div
      onMouseEnter={() => setIndex((index) => index + 1)}
      className={`group relative flex flex-col justify-between gap-6 overflow-hidden bg-light-50 p-6 transition-colors hover:bg-light-100 lg:gap-10 lg:p-8 dark:bg-dark-50 dark:hover:bg-dark-100 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-light-300 bg-light-200 dark:border-dark-300 dark:bg-dark-200">
          <LottieIcon index={index} json={feature.icon} isPlaying={index > 0} />
        </div>
        {feature.new && (
          <span className="rounded-full border border-light-300 px-2 py-0.5 text-[11px] text-light-900 dark:border-dark-300 dark:text-dark-900">
            {t`New`}
          </span>
        )}
      </div>

      <div>
        <p className="font-medium tracking-tight text-light-1000 dark:text-dark-1000">
          {feature.title}
        </p>
        <p className="mt-1.5 text-sm text-pretty text-light-900 dark:text-dark-800">
          {feature.description}
        </p>
      </div>
    </div>
  );
};

const Features = ({ theme }: { theme: "light" | "dark" }) => {
  const isDark = theme === "dark";

  const features = [
    {
      title: t`Board visibility`,
      description: t`Control who can view and edit your boards.`,
      icon: isDark ? boardVisibilityIconDark : boardVisibilityIconLight,
    },
    {
      title: t`Workspace members`,
      description: t`Collaborate seamlessly with your team.`,
      icon: isDark ? membersIconDark : membersIconLight,
    },
    {
      title: t`Trello imports`,
      description: t`Import your Trello boards and hit the ground running.`,
      icon: isDark ? importsIconDark : importsIconLight,
    },
    {
      title: t`Labels & Filters`,
      description: t`Organize and find cards quickly with powerful filtering tools.`,
      icon: isDark ? labelsIconDark : labelsIconLight,
    },
    {
      title: t`Comments`,
      description: t`Discuss and collaborate on cards.`,
      icon: isDark ? commentsIconDark : commentsIconLight,
    },
    {
      title: t`Activity logs`,
      description: t`Track all card changes with detailed activity history.`,
      icon: isDark ? activityLogsIconDark : activityLogsIconLight,
    },
    {
      title: t`Templates`,
      description: t`Save time with reusable board templates.`,
      icon: isDark ? templatesIconDark : templatesIconLight,
    },
    {
      title: t`MCP server`,
      description: t`Connect Claude, Cursor and other agents to your boards with the Kan MCP server.`,
      icon: isDark ? integrationsIconDark : integrationsIconLight,
      new: true,
    },
  ];

  return (
    <div className="px-4 pb-24">
      <SectionHeading
        eyebrow={t`Features`}
        title={t`All of the essentials, none of the bloat.`}
      />

      <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-light-300 bg-light-300 sm:grid-cols-2 lg:grid-cols-4 dark:border-dark-200 dark:bg-dark-200">
        {features.map((feature, index) => (
          <FeatureItem
            key={`feature-${index}`}
            feature={feature}
            className={[0, 1, 6, 7].includes(index) ? "lg:col-span-2" : ""}
          />
        ))}
      </div>

      <p className="mt-6 text-sm text-light-900 dark:text-dark-800">
        {t`New features ship weekly.`}{" "}
        <Link
          href="/kan/roadmap"
          className="text-light-1000 underline-offset-4 hover:underline dark:text-dark-1000"
        >
          {t`See what's next →`}
        </Link>
      </p>
    </div>
  );
};

export default Features;
