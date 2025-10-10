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

const FeatureItem = ({
  feature,
}: {
  feature: {
    title: string;
    description: string;
    icon: Record<string, unknown>;
    comingSoon?: boolean;
    new?: boolean;
  };
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [index, setIndex] = useState(0);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setIndex((index) => index + 1);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      className="group relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-light-200 bg-light-50 p-2 dark:border-dark-200 dark:bg-dark-50"
    >
      <div className="absolute left-8 top-8 h-2 w-2 rounded-full bg-light-200 dark:bg-dark-200" />
      <div className="absolute right-8 top-8 h-2 w-2 rounded-full bg-light-200 dark:bg-dark-200" />
      <div className="absolute bottom-8 left-8 h-2 w-2 rounded-full bg-light-200 dark:bg-dark-200" />
      <div className="absolute bottom-8 right-8 h-2 w-2 rounded-full bg-light-200 dark:bg-dark-200" />

      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-light-300 bg-light-200 dark:border-dark-600 dark:bg-dark-200">
        <LottieIcon index={index} json={feature.icon} isPlaying={isHovered} />
      </div>

      <div className="relative mt-2 w-full px-4 text-center">
        <p className="text-sm font-bold text-light-1000 dark:text-dark-1000 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-0">
          {feature.title}
        </p>
        <p className="max mt-2 text-sm text-light-950 dark:text-dark-900 sm:absolute sm:inset-0 sm:mt-0 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
          {feature.description}
        </p>
      </div>

      {feature.comingSoon && (
        <div className="absolute right-4 top-4 rounded-full border border-light-300 px-2 py-1 text-[10px] text-light-1000 dark:border-dark-600 dark:bg-dark-50 dark:text-dark-900">
          {t`Coming soon`}
        </div>
      )}

      {feature.new && (
        <div className="absolute right-4 top-4 rounded-full border border-light-300 px-2 py-1 text-[10px] text-light-1000 dark:border-dark-600 dark:bg-dark-50 dark:text-dark-900">
          {t`New`}
        </div>
      )}
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
      new: true,
    },
    {
      title: t`Integrations`,
      description: t`Connect your favorite tools to streamline your workflow.`,
      icon: isDark ? integrationsIconDark : integrationsIconLight,
      comingSoon: true,
    },
  ];

  return (
    <>
      <div className="flex flex-col items-center justify-center px-4 pb-24">
        <div className="flex items-center gap-2 rounded-full border bg-light-50 px-4 py-1 text-center text-xs text-light-1000 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900 lg:text-sm">
          <p>{t`Features`}</p>
        </div>

        <p className="mt-2 text-center text-3xl font-bold text-light-1000 dark:text-dark-1000 lg:text-4xl">
          {t`Kanban reimagined`}
        </p>
        <p className="text-md lg:text-md mt-3 max-w-[500px] text-center text-dark-900">
          {t`Simple, visual task management that just works. Drag and drop cards, collaborate with your team, and get more done.`}
        </p>
        <div className="mx-auto mt-16 w-full max-w-7xl">
          <div className="grid w-full grid-cols-1 gap-4 [mask-image:linear-gradient(to_bottom,black_92%,transparent_100%)] sm:grid-cols-2 md:grid-cols-3 md:[mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)] lg:grid-cols-4 lg:[mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)]">
            {features.map((feature, index) => (
              <FeatureItem key={`feature-${index}`} feature={feature} />
            ))}
          </div>
        </div>

        <div>
          <div className="mt-8 flex items-center gap-2 rounded-full border bg-light-50 px-4 py-1 text-center text-sm text-light-1000 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900">
            <p className="text-xs lg:text-sm">
              {t`We're just getting started. `}
              <Link href="/kan/roadmap" className="underline">
                {t`View our roadmap.`}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Features;
