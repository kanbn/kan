import { usePwaInstall } from "~/hooks/usePwaInstall";

export const InstallPwaButton = () => {
  const { canInstall, isInstalled, triggerInstall } = usePwaInstall();

  if (!canInstall || isInstalled) return null;

  return (
    <button
      onClick={triggerInstall}
      className="fixed top-4 right-4 z-[99999] rounded-full border-0 py-2.5 px-[22px] text-sm font-medium cursor-pointer transition-all duration-200 bg-black text-white hover:bg-[#333] shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:bg-white dark:text-black dark:hover:bg-[#f0f0f0] dark:shadow-[0_4px_14px_rgba(255,255,255,0.18)]"
    >
      Install App
    </button>
  );
};
