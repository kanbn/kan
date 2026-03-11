import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { createContext, useContext, useEffect, useState } from "react";

import { api } from "~/utils/api";

interface WorkspaceContextProps {
  workspace: Workspace;
  isLoading: boolean;
  hasLoaded: boolean;
  switchWorkspace: (_workspace: Workspace) => void;
  availableWorkspaces: Workspace[];
}

interface Workspace {
  name: string;
  description: string | null | undefined;
  publicId: string;
  slug: string | undefined;
  plan: "free" | "pro" | "enterprise" | undefined;
  role: "admin" | "member" | "guest";
  weekStartDay: 0 | 1 | 6;
}

const initialWorkspace: Workspace = {
  name: "",
  description: null,
  publicId: "",
  slug: "",
  plan: "free",
  role: "member",
  weekStartDay: 1,
};

const initialAvailableWorkspaces: Workspace[] = [];

export const WorkspaceContext = createContext<
  WorkspaceContextProps | undefined
>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>(
    initialAvailableWorkspaces,
  );
  const [hasLoaded, setHasLoaded] = useState(false);

  const workspacePublicId = useSearchParams().get("workspacePublicId");

  const { data, isLoading } = api.workspace.all.useQuery();
  const utils = api.useUtils();

  const switchWorkspace = (_workspace: Workspace) => {
    localStorage.setItem("workspacePublicId", _workspace.publicId);

    setWorkspace(_workspace);

    // Refetch workspace data to ensure availableWorkspaces is up to date
    void utils.workspace.all.refetch();

    router.push(`/boards`);
  };

  useEffect(() => {
    if (!data?.length) {
      if (!isLoading) setHasLoaded(true);
      return;
    }

    const storedWorkspaceId: string | null =
      workspacePublicId ?? localStorage.getItem("workspacePublicId");

    if (data.length) {
      const workspaces = data.map(({ workspace, role }) => ({
        role,
        publicId: workspace.publicId,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        plan: workspace.plan,
        weekStartDay: workspace.weekStartDay,
        hasLoaded: true,
      })) as Workspace[];

      if (workspaces.length) setAvailableWorkspaces(workspaces);
    }

    if (storedWorkspaceId !== null) {
      const newData = data;
      const selectedWorkspace = newData.find(
        ({ workspace }) => workspace.publicId === storedWorkspaceId,
      );

      if (!selectedWorkspace?.workspace) return;

      setWorkspace({
        publicId: selectedWorkspace.workspace.publicId,
        name: selectedWorkspace.workspace.name,
        slug: selectedWorkspace.workspace.slug,
        plan: selectedWorkspace.workspace.plan,
        description: selectedWorkspace.workspace.description,
        role: selectedWorkspace.role,
        weekStartDay: selectedWorkspace.workspace.weekStartDay as 0 | 1 | 6,
      });

      if (workspacePublicId) {
        router.push(`/boards`);
        localStorage.setItem("workspacePublicId", workspacePublicId);
      }
    } else {
      const primaryWorkspace = data[0]?.workspace;
      const primaryWorkspaceRole = data[0]?.role;

      if (!primaryWorkspace || !primaryWorkspaceRole) return;
      localStorage.setItem("workspacePublicId", primaryWorkspace.publicId);
      setWorkspace({
        publicId: primaryWorkspace.publicId,
        name: primaryWorkspace.name,
        slug: primaryWorkspace.slug,
        plan: primaryWorkspace.plan,
        description: primaryWorkspace.description,
        role: primaryWorkspaceRole,
        weekStartDay: primaryWorkspace.weekStartDay as 0 | 1 | 6,
      });
    }
  }, [data, isLoading, workspacePublicId, router]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        isLoading,
        hasLoaded,
        availableWorkspaces,
        switchWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextProps => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
