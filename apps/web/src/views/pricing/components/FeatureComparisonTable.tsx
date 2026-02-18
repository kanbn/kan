import { t } from "@lingui/core/macro";
import React, { useEffect, useRef, useState } from "react";
import { HiCheckCircle, HiXCircle } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

type FrequencyValue = "monthly" | "annually";

interface PlanFeature {
  key: string;
  label: string;
  free: string | boolean | { text: string; highlight?: string };
  teams: string | boolean | { text: string; highlight?: string };
  pro: string | boolean | { text: string; highlight?: string };
  enterprise: string | boolean | { text: string; highlight?: string };
}

interface FeatureSection {
  name: string;
  features: PlanFeature[];
}

const FeatureComparisonTable = ({
  frequencyValue: _frequencyValue,
}: {
  frequencyValue: FrequencyValue;
}) => {
  // Keep pricing column headers visible as you scroll
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHeaderFixed, setIsHeaderFixed] = useState(false);
  const [headerRect, setHeaderRect] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  useEffect(() => {
    const HEADER_OFFSET = 64; // px; matches fixed top nav height

    const handleScroll = () => {
      if (!containerRef.current) return;

      // Hide fixed header on mobile (screens smaller than 620px)
      if (window.innerWidth < 620) {
        setIsHeaderFixed(false);
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const pastHeader = rect.top <= HEADER_OFFSET;
      const aboveBottom = rect.bottom > HEADER_OFFSET + 40;

      const shouldFix = pastHeader && aboveBottom;
      setIsHeaderFixed(shouldFix);

      if (shouldFix) {
        setHeaderRect({
          left: rect.left,
          width: rect.width,
        });
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);
  const planSpecificLimits: PlanFeature[] = [
    {
      key: "boards",
      label: t`Boards`,
      free: { text: t`Unlimited boards`, highlight: "Unlimited" },
      teams: { text: t`Unlimited boards`, highlight: "Unlimited" },
      pro: { text: t`Unlimited boards`, highlight: "Unlimited" },
      enterprise: { text: t`Unlimited boards`, highlight: "Unlimited" },
    },
    {
      key: "members",
      label: t`Members`,
      free: { text: t`1 user`, highlight: "1" },
      teams: { text: t`Per-seat pricing`, highlight: "Per-seat" },
      pro: { text: t`Unlimited members`, highlight: "Unlimited" },
      enterprise: { text: t`Unlimited members`, highlight: "Unlimited" },
    },
    {
      key: "file-uploads",
      label: t`File uploads`,
      free: { text: t`10mb file uploads`, highlight: "10mb" },
      teams: { text: t`Unlimited file uploads`, highlight: "Unlimited" },
      pro: { text: t`Unlimited file uploads`, highlight: "Unlimited" },
      enterprise: { text: t`Unlimited file uploads`, highlight: "Unlimited" },
    },
      {
        key: "workspace-username",
        label: t`Workspace username`,
        free: { text: t`Default username`, highlight: "Default" },
        teams: { text: t`Default username`, highlight: "Default" },
        pro: { text: t`Custom username`, highlight: "Custom" },
        enterprise: { text: t`Custom username`, highlight: "Custom" },
      },
  ];

  const coreFeatures: PlanFeature[] = [
    {
      key: "checklists",
      label: t`Checklists`,
      free: true,
      teams: true,
      pro: true,
      enterprise: true,
    },
    {
      key: "custom-templates",
      label: t`Board templates`,
      free: true,
      teams: true,
      pro: true,
      enterprise: true,
    },
    {
      key: "labels-filters",
      label: t`Labels & filters`,
      free: true,
      teams: true,
      pro: true,
      enterprise: true,
    },
    {
      key: "board-visibility",
      label: t`Board visibility`,
      free: true,
      teams: true,
      pro: true,
      enterprise: true,
    },
    {
      key: "search",
      label: t`Intelligent search`,
      free: true,
      teams: true,
      pro: true,
      enterprise: true,
    },
    {
      key: "activity-log",
      label: t`Activity log`,
      free: true,
      teams: true,
      pro: true,
      enterprise: true,
    },
    {
      key: "comments",
      label: t`Comments`,
      free: true,
      teams: true,
      pro: true,
      enterprise: true,
    },
    {
      key: "roles-permissions",
      label: t`Roles & permissions`,
      free: false,
      teams: false,
      pro: true,
      enterprise: true,
    },
    {
      key: "custom-branding",
      label: t`Custom branding`,
      free: false,
      teams: false,
      pro: true,
      enterprise: true,
    },
  ];

  const collaborationFeatures: PlanFeature[] = [
    {
      key: "mentions",
      label: t`Mentions`,
      free: false,
      teams: true,
      pro: true,
      enterprise: true,
    },
    {
      key: "email-notifications",
      label: t`Email notifications`,
      free: false,
      teams: true,
      pro: true,
      enterprise: true,
    },
    {
      key: "assignees",
      label: t`Assignees`,
      free: false,
      teams: true,
      pro: true,
      enterprise: true,
    },
    {
      key: "invite-links",
      label: t`Invite links`,
      free: false,
      teams: true,
      pro: true,
      enterprise: true,
    },
  ];

  const importsFeatures: PlanFeature[] = [
    {
      key: "import-export",
      label: t`Trello`,
      free: true,
      teams: true,
      pro: true,
      enterprise: true,
    },
  ];

  const platformFeatures: PlanFeature[] = [
    {
      key: "open-source",
      label: t`Open source`,
      free: true,
      teams: true,
      pro: true,
      enterprise: true,
    },
    {
      key: "rest-api",
      label: t`API`,
      free: { text: t`Limited API access` },
      teams: { text: t`Full API access` },
      pro: { text: t`Full API access` },
      enterprise: { text: t`Full API access` },
    },
    {
      key: "self-hostable",
      label: t`On-premise`,
      free: false,
      teams: false,
      pro: false,
      enterprise: true,
    },
  ];

  const securityFeatures: PlanFeature[] = [
    {
      key: "sso",
      label: t`SSO`,
      free: { text: t`Google SSO` },
      teams: { text: t`Google SSO` },
      pro: { text: t`Google SSO` },
      enterprise: { text: t`Google SSO + SAML` },
    },
    {
      key: "admin-roles",
      label: t`Admin roles`,
      free: { text: t`Admin roles` },
      teams: { text: t`Admin roles` },
      pro: { text: t`Admin roles` },
      enterprise: { text: t`Advanced admin roles` },
    },
  ];

  const supportFeatures: PlanFeature[] = [
    {
      key: "priority-email-support",
      label: t`Priority email support`,
      free: false,
      teams: true,
      pro: true,
      enterprise: true,
    },
    {
      key: "account-manager",
      label: t`Account manager`,
      free: false,
      teams: false,
      pro: false,
      enterprise: true,
    },
    {
      key: "sla",
      label: t`SLA`,
      free: false,
      teams: false,
      pro: false,
      enterprise: true,
    },
  ];

  const sections: FeatureSection[] = [
    {
      name: "",
      features: planSpecificLimits,
    },
    {
      name: t`Core features`,
      features: coreFeatures,
    },
    {
      name: t`Collaboration`,
      features: collaborationFeatures,
    },
    {
      name: t`Imports`,
      features: importsFeatures,
    },
    {
      name: t`Platform`,
      features: platformFeatures,
    },
    {
      name: t`Security`,
      features: securityFeatures,
    },
    {
      name: t`Support`,
      features: supportFeatures,
    },
  ];

  const plans = [
    { id: "free", name: t`Free`, tierId: "tier-free" },
    { id: "teams", name: t`Teams`, tierId: "tier-teams" },
    { id: "pro", name: t`Pro`, tierId: "tier-pro" },
    { id: "enterprise", name: t`Enterprise`, tierId: "tier-enterprise" },
  ];

  const isHighlightValue = (
    value: string | boolean | { text: string; highlight?: string },
  ): value is { text: string; highlight?: string } => {
    return typeof value === "object" && value !== null && "text" in value;
  };

  const shouldHighlight = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return ["unlimited", "multiple", "per-seat", "custom", "mentions", "full", "sso", "admin"].some(
      (keyword) => lowerText.includes(keyword),
    );
  };

  const CellValue = ({
    value,
    label,
  }: {
    value: string | boolean | { text: string; highlight?: string };
    label: string;
  }) => {
    // Handle object with text and highlight
    if (isHighlightValue(value)) {
      const { text, highlight } = value;
      const isUnlimited = shouldHighlight(text);
      
      let displayText;
      if (highlight) {
        const parts = text.split(new RegExp(`(${highlight})`, "gi"));
        displayText = (
          <>
            {parts.map((part, index) =>
              part.toLowerCase() === highlight.toLowerCase() ? (
                <span key={index} className="text-light-1000 dark:text-dark-1000">
                  {part}
                </span>
              ) : (
                <span key={index} className="text-light-950 dark:text-dark-800">
                  {part}
                </span>
              ),
            )}
          </>
        );
      } else {
        displayText = text;
      }
      
      return (
        <div className="flex items-center gap-2.5">
          <HiCheckCircle
            className={twMerge(
              "mt-0.5 h-4 w-4 shrink-0",
              isUnlimited
                ? "text-light-1000 dark:text-dark-1000"
                : "text-light-400 dark:text-dark-600",
            )}
          />
          <span
            className={twMerge(
              "text-sm font-medium",
              isUnlimited
                ? "text-light-1000 dark:text-dark-950"
                : "text-light-950 dark:text-dark-800",
            )}
          >
            {displayText}
          </span>
        </div>
      );
    }
    
    if (typeof value === "string") {
      const isUnlimited = shouldHighlight(value);
      return (
        <div className="flex items-center gap-2.5">
          <HiCheckCircle
            className={twMerge(
              "mt-0.5 h-4 w-4 shrink-0",
              isUnlimited
                ? "text-light-1000 dark:text-dark-1000"
                : "text-light-400 dark:text-dark-600",
            )}
          />
          <span
            className={twMerge(
              "text-sm font-medium",
              isUnlimited
                ? "text-light-1000 dark:text-dark-950"
                : "text-light-950 dark:text-dark-800",
            )}
          >
            {value}
          </span>
        </div>
      );
    }
    if (value) {
      // Boolean true - show checkmark icon
      return (
        <div className="flex items-center gap-2.5">
          <HiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-light-1000 dark:text-dark-1000" />
          <span className="text-sm font-medium text-light-1000 dark:text-dark-950">
            {label}
          </span>
        </div>
      );
    }
    // Boolean false - show cross icon
    return (
      <div className="flex items-center gap-2.5">
        <HiXCircle className="mt-0.5 h-4 w-4 shrink-0 text-light-400 dark:text-dark-600" />
        <span className="text-sm font-medium text-light-800 dark:text-dark-800">
          {label}
        </span>
      </div>
    );
  };

  const getFeatureValue = (
    feature: PlanFeature,
    planId: string,
  ): string | boolean | { text: string; highlight?: string } => {
    switch (planId) {
      case "free":
        return feature.free;
      case "teams":
        return feature.teams;
      case "pro":
        return feature.pro;
      case "enterprise":
        return feature.enterprise;
      default:
        return false;
    }
  };

  return (
    <section aria-labelledby="comparison-heading" className="w-full">
      <div className="mx-auto max-w-7xl">
        <div
          ref={containerRef}
          className="relative overflow-x-auto rounded-lg border border-light-300 bg-light-50 dark:border-dark-300 dark:bg-dark-50"
        >
          {isHeaderFixed && (
            <div
              className="hidden sm:block fixed z-40 border-b border-light-300 bg-light-50/95 dark:border-dark-400 dark:bg-dark-50/95"
              style={{
                top: 64,
                left: headerRect.left,
                width: headerRect.width,
              }}
            >
              <div className="grid grid-cols-4 border-x border-light-300 dark:border-dark-300">
                {plans.map((plan) => {
                  const isMostPopular = plan.id === "pro";
                  return (
                    <div
                      key={`fixed-${plan.id}`}
                      className={twMerge(
                        "flex items-center px-6 py-3 text-left text-base font-semibold",
                        isMostPopular
                          ? "bg-light-200 text-light-1000 dark:bg-dark-100 dark:text-dark-1000"
                          : "bg-light-50 text-dark-50 dark:bg-dark-50 dark:text-dark-1000",
                      )}
                    >
                      {plan.name}
                      {plan.id === "pro" && <span className="ml-1 text-xl">∞</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                {plans.map((plan) => {
                  const isMostPopular = plan.id === "pro";
                  return (
                    <th
                      key={plan.id}
                      scope="col"
                      className={twMerge(
                        "w-1/4 px-6 py-4 text-left text-base font-semibold",
                        isMostPopular
                          ? "bg-light-200 text-light-1000 dark:bg-dark-100 dark:text-dark-1000"
                          : "bg-light-50 text-dark-50 dark:bg-dark-50 dark:text-dark-1000",
                      )}
                    >
                      <span className="flex items-center">
                        {plan.name}
                        {plan.id === "pro" && <span className="ml-1 text-xl">∞</span>}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sections.map((section, sectionIdx) => (
                <React.Fragment key={section.name || `section-${sectionIdx}`}>
                  {section.name && (
                    <tr>
                      {plans.map((plan) => {
                        const isPro = plan.id === "pro";
                        return (
                          <td
                            key={plan.id}
                            className={twMerge(
                              "border-t px-6 py-3 text-left text-sm font-semibold text-dark-900 dark:text-dark-900",
                              isPro
                                ? "border-light-400 bg-light-200 dark:border-dark-400 dark:bg-dark-100"
                                : "border-light-300 bg-light-50 dark:border-dark-400 dark:bg-dark-50",
                            )}
                          >
                            {plan.id === "free" ? section.name : ""}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                  {section.features.map((feature) => (
                    <tr key={feature.key}>
                      {plans.map((plan) => {
                        const isPro = plan.id === "pro";
                        return (
                          <td
                            key={plan.id}
                            className={twMerge(
                              "w-1/4 border-t px-6 py-3 text-left",
                              isPro
                                ? "border-light-400 bg-light-200 dark:border-dark-400 dark:bg-dark-100"
                                : "border-light-300 dark:border-dark-400",
                            )}
                          >
                            <CellValue
                              value={getFeatureValue(feature, plan.id)}
                              label={feature.label}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default FeatureComparisonTable;
