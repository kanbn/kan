import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
  TbLayoutSidebarRightCollapse,
  TbLayoutSidebarRightExpand,
} from "react-icons/tb";

import { authClient } from "@kan/auth/client";

import { useClickOutside } from "~/hooks/useClickOutside";
import { useModal } from "~/providers/modal";
import { useWorkspace, WorkspaceProvider } from "~/providers/workspace";
import SideNavigation from "./SideNavigation";

interface DashboardProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  hasRightPanel?: boolean;
}

export function getDashboardLayout(
  page: React.ReactElement,
  rightPanel?: React.ReactNode,
  hasRightPanel = false,
) {
  return (
    <WorkspaceProvider>
      <Dashboard rightPanel={rightPanel} hasRightPanel={hasRightPanel}>
        {page}
      </Dashboard>
    </WorkspaceProvider>
  );
}

export default function Dashboard({
  children,
  rightPanel,
  hasRightPanel = false,
}: DashboardProps) {
  const { theme } = useTheme();
  const { openModal } = useModal();
  const { availableWorkspaces, hasLoaded } = useWorkspace();

  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  const sideNavRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const sideNavButtonRef = useRef<HTMLButtonElement>(null);
  const rightPanelButtonRef = useRef<HTMLButtonElement>(null);

  const toggleSideNav = () => {
    setIsSideNavOpen(!isSideNavOpen);
    if (!isSideNavOpen) {
      setIsRightPanelOpen(false);
    }
  };

  const closeSideNav = () => {
    setIsSideNavOpen(false);
  };

  const toggleRightPanel = () => {
    setIsRightPanelOpen(!isRightPanelOpen);
    if (!isRightPanelOpen) {
      setIsSideNavOpen(false);
    }
  };

  useClickOutside(sideNavRef, (event) => {
    if (sideNavButtonRef.current?.contains(event.target as Node)) {
      return;
    }
    if (isSideNavOpen) {
      setIsSideNavOpen(false);
    }
  });

  useClickOutside(rightPanelRef, (event) => {
    if (rightPanelButtonRef.current?.contains(event.target as Node)) {
      return;
    }
    if (isRightPanelOpen) {
      setIsRightPanelOpen(false);
    }
  });

  useEffect(() => {
    if (hasLoaded && availableWorkspaces.length === 0) {
      openModal("NEW_WORKSPACE", undefined, undefined, false);
    }
  }, [hasLoaded, availableWorkspaces.length, openModal]);

  const isDarkMode = theme === "dark";

  return (
    <>
      <style jsx global>{`
        html {
          height: 100vh;
          overflow: hidden;
          min-width: 320px;
          background-color: ${!isDarkMode ? "hsl(0deg 0% 97.3%)" : "#1c1c1c"};
        }
      `}</style>
      <div className="relative flex h-screen flex-col bg-light-50 dark:bg-dark-50 md:bg-light-100 md:p-3 md:dark:bg-dark-100">
        {/* Mobile Header */}
        <div className="flex h-12 items-center justify-between border-b border-light-300 bg-light-50 px-3 dark:border-dark-300 dark:bg-dark-50 md:hidden">
          <button
            ref={sideNavButtonRef}
            onClick={toggleSideNav}
            className="rounded p-1.5 transition-all hover:bg-light-200 dark:hover:bg-dark-100"
          >
            {isSideNavOpen ? (
              <TbLayoutSidebarLeftCollapse
                size={20}
                className="text-light-900 dark:text-dark-900"
              />
            ) : (
              <TbLayoutSidebarLeftExpand
                size={20}
                className="text-light-900 dark:text-dark-900"
              />
            )}
          </button>

          {hasRightPanel && (
            <button
              ref={rightPanelButtonRef}
              onClick={toggleRightPanel}
              className="rounded p-1.5 transition-all hover:bg-light-200 dark:hover:bg-dark-100"
            >
              {isRightPanelOpen ? (
                <TbLayoutSidebarRightCollapse
                  size={20}
                  className="text-light-900 dark:text-dark-900"
                />
              ) : (
                <TbLayoutSidebarRightExpand
                  size={20}
                  className="text-light-900 dark:text-dark-900"
                />
              )}
            </button>
          )}
        </div>

        <div className="flex h-[calc(100dvh-4.5rem)] min-h-0 w-full md:h-[calc(100dvh-1.5rem)]">
          <div
            ref={sideNavRef}
            className={`fixed top-12 z-40 h-[calc(100dvh-3rem)] w-[calc(100vw-1.5rem)] transform transition-transform duration-300 ease-in-out md:relative md:top-0 md:h-full md:w-auto md:translate-x-0 ${isSideNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} `}
          >
            <SideNavigation
              user={{ email: session?.user.email, image: session?.user.image }}
              isLoading={sessionLoading}
              onCloseSideNav={closeSideNav}
            />
          </div>

          <div className="relative h-full min-h-0 w-full overflow-hidden md:rounded-lg md:border md:border-light-300 md:bg-light-50 md:dark:border-dark-300 md:dark:bg-dark-50">
            <div className="relative flex h-full min-h-0 w-full overflow-hidden">
              <div className="h-full w-full overflow-y-auto">{children}</div>

              {/* Mobile Right Panel */}
              {hasRightPanel && rightPanel && (
                <div
                  ref={rightPanelRef}
                  className={`fixed right-0 top-12 z-40 h-[calc(100dvh-3rem)] w-80 transform border-l border-light-300 bg-light-200 transition-transform duration-300 ease-in-out dark:border-dark-300 dark:bg-dark-100 md:hidden ${
                    isRightPanelOpen ? "translate-x-0" : "translate-x-full"
                  }`}
                >
                  <div className="h-full">{rightPanel}</div>
                </div>
              )}

              {/* Desktop Right Panel */}
              {hasRightPanel && rightPanel && (
                <div className="hidden md:block">{rightPanel}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
