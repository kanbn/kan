import { t } from "@lingui/core/macro";
import { HiCheckCircle, HiXCircle } from "react-icons/hi2";

interface Feature {
  key: string;
  label: string;
  kan: boolean | string;
  trello: boolean | string;
}

interface Section {
  name: string;
  features: Feature[];
}

type FrequencyValue = "monthly" | "annually";

const CellValue = ({ value }: { value: boolean | string }) => {
  if (typeof value === "string") {
    return (
      <span className="text-sm text-dark-900 dark:text-dark-900">{value}</span>
    );
  }
  return value ? (
    <HiCheckCircle className="h-5 w-5 text-dark-900 dark:text-dark-1000" />
  ) : (
    <HiXCircle className="h-5 w-5 text-light-600 dark:text-dark-600" />
  );
};

const FeatureComparisonTable = ({
  frequencyValue,
}: {
  frequencyValue: FrequencyValue;
}) => {
  const sections: Section[] = [
    {
      name: t`Core features`,
      features: [
        {
          key: "ulimited-workspaces",
          label: t`Unlimited workspaces`,
          kan: true,
          trello: false,
        },
        {
          key: "unlimited-boards",
          label: t`Unlimited boards`,
          kan: true,
          trello: false,
        },
        {
          key: "unlimited-lists",
          label: t`Unlimited lists`,
          kan: true,
          trello: true,
        },
        {
          key: "unlimited-cards",
          label: t`Unlimited cards`,
          kan: true,
          trello: true,
        },
        {
          key: "activity-log",
          label: t`Activity log`,
          kan: true,
          trello: true,
        },
        {
          key: "templates",
          label: t`Custom templates`,
          kan: true,
          trello: false,
        },
        { key: "labels", label: t`Labels & filters`, kan: true, trello: false },
        { key: "checklists", label: t`Checklists`, kan: true, trello: true },
        {
          key: "import",
          label: t`Import from Trello`,
          kan: true,
          trello: true,
        },
        {
          key: "visibility",
          label: t`Board visibility`,
          kan: true,
          trello: true,
        },
        {
          key: "search",
          label: t`Intelligent search`,
          kan: true,
          trello: true,
        },
        {
          key: "workspace-url",
          label: t`Custom workspace link`,
          kan: true,
          trello: false,
        },
        {
          key: "this-is-a-joke",
          label: t`Owned by Atlassian`,
          kan: false,
          trello: true,
        },
      ],
    },
    {
      name: t`Teams`,
      features: [
        {
          key: "pricing",
          label: t`Price per user/month`,
          kan: frequencyValue === "monthly" ? `$10.00` : `$8.00`,
          trello: frequencyValue === "monthly" ? `$12.00` : `$10.00`,
        },
        {
          key: "comments",
          label: t`Comments & mentions`,
          kan: true,
          trello: true,
        },
        {
          key: "assignments",
          label: t`Assignees`,
          kan: true,
          trello: true,
        },
        {
          key: "sharing",
          label: t`Board sharing & invites`,
          kan: true,
          trello: true,
        },
        {
          key: "invite-links",
          label: t`Invite links`,
          kan: true,
          trello: true,
        },
      ],
    },
    {
      name: t`Platform`,
      features: [
        {
          key: "api",
          label: t`REST API`,
          kan: true,
          trello: true,
        },
        {
          key: "open-source",
          label: t`Open source`,
          kan: true,
          trello: false,
        },
        {
          key: "self-hostable",
          label: t`Self-hostable`,
          kan: true,
          trello: false,
        },
        {
          key: "white-label",
          label: t`White label`,
          kan: true,
          trello: false,
        },
        {
          key: "performance",
          label: t`Fast & lightweight`,
          kan: true,
          trello: false,
        },
      ],
    },
  ];

  const products = [
    {
      id: "kan",
      name: t`Kan`,
      featured: true,
    },
    {
      id: "trello",
      name: t`Trello`,
      featured: false,
    },
  ];

  return (
    <section aria-labelledby="comparison-heading" className="w-full px-4">
      <div className="mx-auto max-w-6xl py-8 lg:py-10">
        <div className="grid grid-cols-3 gap-x-8 border-t border-light-300 before:block dark:border-dark-300">
          {products.map((product) => (
            <div key={product.id} aria-hidden="true" className="-mt-px">
              <div
                className={`${product.featured ? "border-dark-200 dark:border-dark-800" : "border-transparent"} border-t-2 pt-8`}
              >
                <p
                  className={`${product.featured ? "text-dark-50 dark:text-dark-1000" : "text-light-1000 dark:text-dark-1000"} text-center text-sm font-semibold`}
                >
                  {product.name}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="-mt-6 space-y-12">
          {sections.map((section) => (
            <div key={section.name}>
              <h4 className="text-sm font-semibold text-light-1000 dark:text-dark-1000">
                {section.name}
              </h4>
              <div className="relative -mx-8 mt-8">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-8 inset-y-0 grid grid-cols-3 gap-x-8 before:block"
                >
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={`size-full rounded-lg ${product.featured ? "bg-white shadow-sm dark:bg-dark-50 dark:shadow-none" : ""}`}
                    />
                  ))}
                </div>

                <table className="relative w-full border-separate border-spacing-x-8">
                  <thead>
                    <tr className="text-left">
                      <th scope="col">
                        <span className="sr-only">{t`Feature`}</span>
                      </th>
                      {products.map((p) => (
                        <th key={p.id} scope="col">
                          <span className="sr-only">{p.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.features.map((feature, featureIdx) => (
                      <tr key={feature.key}>
                        <th
                          scope="row"
                          className="w-1/3 py-3 pr-4 text-left text-sm font-normal text-light-1000 dark:text-dark-1000"
                        >
                          {feature.label}
                          {featureIdx !== section.features.length - 1 ? (
                            <div className="absolute inset-x-8 mt-3 h-px bg-light-300 dark:bg-dark-300" />
                          ) : null}
                        </th>
                        {products.map((p) => (
                          <td
                            key={p.id}
                            className="relative w-1/3 px-4 py-0 text-center"
                          >
                            <span className="relative inline-flex w-full items-center justify-center py-3">
                              <CellValue
                                value={
                                  p.id === "kan" ? feature.kan : feature.trello
                                }
                              />
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-8 inset-y-0 grid grid-cols-3 gap-x-8 before:block"
                >
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={`${product.featured ? "ring-1 ring-dark-200 dark:ring-dark-800" : "ring-0"} rounded-lg`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureComparisonTable;
