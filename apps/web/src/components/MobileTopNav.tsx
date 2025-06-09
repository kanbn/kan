import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import {
  HiOutlineArrowRightEndOnRectangle,
  HiOutlineBars3,
  HiOutlineChevronDown,
  HiOutlineEllipsisHorizontal,
  HiOutlinePlus,
  HiOutlineRectangleGroup,
  HiXMark,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { authClient } from "@kan/auth/client";

import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import Avatar from "./Avatar";
import Button from "./Button";
import ThemeMobileButton from "./ThemeMobileButton";

interface MobileNavContextType {
  open: string | null;
  setOpen: (open: string | null) => void;
}

export const MobileNavContext = createContext<MobileNavContextType>({
  open: null,
  setOpen: () => {},
});

export const MobileNavProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <MobileNavContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileNavContext.Provider>
  );
};

export default function MobileTopNav() {
  const { open, setOpen } = useContext(MobileNavContext);
  const { showPopup } = usePopup();
  const { openModal } = useModal();
  const { data: session } = authClient.useSession();
  const { workspace, availableWorkspaces, switchWorkspace } = useWorkspace();
  const router = useRouter();

  return (
    <div className="relative flex">
      <div className="flex h-12 w-full items-center justify-between border-b border-light-600 bg-light-100 px-5 py-2 align-middle dark:border-dark-400 dark:bg-dark-50">
        <div className="flex items-center">
          <Link href="/">
            <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-dark-1000">
              kan.bn
            </h1>
          </Link>
        </div>
        <button
          className="flex items-center gap-2 rounded-2xl border border-light-600 px-2 py-1 dark:border-dark-400"
          onClick={() =>
            setOpen(open === "workspaceNav" ? null : "workspaceNav")
          }
        >
          {session?.user?.image ? (
            <Avatar
              imageUrl={session.user.image}
              email={session.user.email}
              name={session.user.name ?? ""}
              size="sm"
            />
          ) : (
            <HiOutlineEllipsisHorizontal size={20} />
          )}
          <span className="ml-2 text-sm font-bold text-neutral-900 dark:text-dark-1000">
            {workspace.name}
          </span>
          <HiOutlineChevronDown size={15} />
        </button>
        <Button
          variant="ghost"
          onClick={() => setOpen(open === "nav" ? null : "nav")}
        >
          {open === "nav" ? (
            <HiXMark size={20} />
          ) : (
            <HiOutlineBars3 size={20} />
          )}
        </Button>
      </div>
      {open === "nav" && (
        <div className="absolute left-0 right-0 top-[100%] z-50 border-b border-light-600 bg-light-100 px-5 py-2 dark:border-dark-400 dark:bg-dark-50">
          <div className="flex h-full w-full flex-col gap-2 text-neutral-900 dark:text-dark-1000">
            <ThemeMobileButton />
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Account</p>
              <Button
                variant="danger"
                onClick={() =>
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        showPopup({
                          header: "Logged out",
                          message: "You have been logged out successfully.",
                          icon: "success",
                        });
                        router.push("/login");
                      },
                      onError: () => {
                        showPopup({
                          header: "Unable to log out",
                          message:
                            "Please try again later, or contact customer support.",
                          icon: "error",
                        });
                      },
                    },
                  })
                }
                iconLeft={<HiOutlineArrowRightEndOnRectangle size={20} />}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
      {open === "workspaceNav" && (
        <div className="absolute left-0 right-0 top-[100%] z-50 border-b border-light-600 bg-light-100 dark:border-dark-400 dark:bg-dark-50">
          <div className="flex h-full w-full flex-col text-neutral-900 dark:text-dark-1000">
            {availableWorkspaces.map((ws) => (
              <button
                key={ws.publicId}
                onClick={() => {
                  switchWorkspace(ws);
                  setOpen(null);
                }}
                className={twMerge(
                  "flex items-center gap-2 border border-light-600 px-5 py-2 text-sm font-semibold dark:border-dark-400",
                  ws.publicId === workspace.publicId &&
                    "bg-light-500 dark:bg-dark-100",
                )}
              >
                <HiOutlineRectangleGroup size={20} />
                {ws.name}
              </button>
            ))}
            <Button
              variant="ghost"
              onClick={() => {
                openModal("NEW_WORKSPACE");
                setOpen(null);
              }}
              iconLeft={<HiOutlinePlus size={20} />}
            >
              Create workspace
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
