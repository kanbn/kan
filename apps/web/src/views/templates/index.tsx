import Link from "next/link";
import { t } from "@lingui/core/macro";

import { PageHead } from "~/components/PageHead";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export default function TemplatesView() {
  const { workspace } = useWorkspace();
  const { data: templates, isLoading } = api.board.templates.useQuery(
    { workspacePublicId: workspace.publicId ?? "" },
    { enabled: !!workspace.publicId },
  );

  return (
    <div className="m-auto h-full max-w-[1100px] p-6 px-5 md:px-28 md:py-12">
      <PageHead title={t`Templates | ${workspace.name ?? "Workspace"}`} />
      <div className="relative z-10 mb-8 flex w-full items-center justify-between">
        <h1 className="font-bold tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
          {t`Templates`}
        </h1>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {isLoading && <div>{t`Loading templates...`}</div>}
        {!isLoading && (templates?.length ?? 0) === 0 && (
          <div className="text-sm text-light-900 dark:text-dark-900">{t`No templates yet`}</div>
        )}
        {templates?.map((tpl) => (
          <Link
            key={tpl.publicId}
            href={`/boards/${workspace.slug}/${tpl.publicId}`}
            className="rounded border border-light-300 p-3 text-sm hover:bg-light-100 dark:border-dark-300 dark:hover:bg-dark-100"
          >
            <div className="font-medium">{tpl.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
