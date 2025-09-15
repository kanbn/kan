import Link from "next/link";
import { useRouter } from "next/router";

import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";
import { api } from "~/utils/api";

export default function PublicBoardsView() {
  const router = useRouter();

  const workspaceSlug = Array.isArray(router.query.workspaceSlug)
    ? router.query.workspaceSlug[0]
    : router.query.workspaceSlug;

  const { data, isLoading } = api.workspace.bySlug.useQuery(
    {
      workspaceSlug: workspaceSlug ?? "",
    },
    { enabled: !!workspaceSlug },
  );

  const BoardsList = ({
    isLoading,
    boards,
    workspaceSlug,
  }: {
    isLoading: boolean;
    boards: { publicId: string; name: string; slug: string }[];
    workspaceSlug: string;
  }) => {
    if (isLoading)
      return (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-4">
          <div className="flex h-full w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-200" />
          <div className="flex h-full w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-200" />
          <div className="flex h-full w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-200" />
          <div className="flex h-full w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-200" />
        </div>
      );

    if (boards.length === 0) return <></>;

    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-4">
        {boards.map((board) => (
          <Link
            key={board.publicId}
            href={`/${workspaceSlug}/${board.slug}`}
            className="h-full"
          >
            <div className="relative flex h-full w-full items-center justify-center rounded-md border border-dashed border-light-400 bg-light-50 shadow-sm hover:bg-light-200 dark:border-dark-600 dark:bg-dark-50 dark:hover:bg-dark-100">
              <PatternedBackground />
              <p className="text-md px-4 font-medium text-neutral-900 dark:text-dark-1000">
                {board.name}
              </p>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <>
      <PageHead title={`${"Board"} | ${"Workspace"}`} />
      <style jsx global>{`
        html {
          height: 100vh;
          overflow: hidden;
        }
      `}</style>
      <div className="flex h-screen flex-col items-center justify-center bg-light-100 dark:bg-dark-50">
        <h1 className="mb-2 text-2xl font-bold text-light-1000 dark:text-dark-1000">
          {data?.name}
        </h1>
        <p className="mb-6 text-light-1000 dark:text-dark-900">
          {data?.description}
        </p>
        <div className="mb-4 h-[400px] w-[600px] rounded-xl border border-light-400 bg-light-200 p-4 dark:border-dark-200 dark:bg-dark-100">
          {data?.boards && workspaceSlug && (
            <BoardsList
              isLoading={isLoading}
              boards={data.boards}
              workspaceSlug={workspaceSlug}
            />
          )}
        </div>
        <Link
          className="text-lg font-bold tracking-tight text-neutral-900 dark:text-dark-1000"
          href="/"
        >
          Costao Lavanderia
        </Link>
      </div>
    </>
  );
}
