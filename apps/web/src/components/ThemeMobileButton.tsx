import { HiOutlineMoon, HiOutlineStar, HiOutlineSun } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { useTheme } from "~/providers/theme";

export default function ThemeMobileButton() {
  const { activeTheme, switchTheme } = useTheme();
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold">Theme</p>
      <div className="grid w-full grid-cols-3 rounded-md border border-light-600 bg-light-200 dark:border-dark-600 dark:bg-dark-200">
        <button
          className={twMerge(
            "col-span-1 flex flex-col items-center justify-center p-2 text-sm font-semibold",
          )}
          onClick={() => switchTheme("system")}
        >
          <HiOutlineStar />
          System
        </button>
        <button
          className={twMerge(
            "col-span-1 flex flex-col items-center justify-center p-2 text-sm font-semibold",
            activeTheme === "light" && "bg-light-500 dark:bg-dark-100",
          )}
          onClick={() => switchTheme("light")}
        >
          <HiOutlineSun />
          Light
        </button>
        <button
          className={twMerge(
            "col-span-1 flex flex-col items-center justify-center p-2 text-sm font-semibold",
            activeTheme === "dark" && "bg-light-500 dark:bg-dark-100",
          )}
          onClick={() => switchTheme("dark")}
        >
          <HiOutlineMoon />
          Dark
        </button>
      </div>
    </div>
  );
}
