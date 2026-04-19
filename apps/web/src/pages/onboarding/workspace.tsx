import { useRouter } from "next/navigation";
import { env } from "next-runtime-env";
import { useEffect } from "react";

import { authClient } from "@kan/auth/client";

import { PageHead } from "~/components/PageHead";
import WorkspaceDetailsView from "~/views/onboarding/workspace-details";

export default function WorkspaceDetailsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) router.push("/login");
    if (!isPending && env("NEXT_PUBLIC_KAN_ENV") !== "cloud")
      router.push("/boards");
  }, [session, isPending, router]);

  if (isPending || !session?.user) return null;

  return (
    <>
      <PageHead title="Create workspace | kan.bn" />
      <WorkspaceDetailsView />
    </>
  );
}
