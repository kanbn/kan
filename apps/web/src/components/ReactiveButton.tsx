import Link from "next/link";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import LottieIcon from "~/components/LottieIcon";
import { useIsMobile } from "~/hooks/useMediaQuery";

const Button: React.FC<{
  href: string;
  current: boolean;
  name: string;
  json: object;
  isCollapsed?: boolean;
  onCloseSideNav?: () => void;
}> = ({ href, current, name, json, isCollapsed = false, onCloseSideNav }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [index, setIndex] = useState(0);
  const isMobile = useIsMobile();

  const handleMouseEnter = () => {
    setIsHovered(true);
    setIndex((index) => index + 1);
  };

  const handleClick = () => {
    if (onCloseSideNav && isMobile) {
      onCloseSideNav();
    }
  };

  return (
    <Link
      href={href}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      className={twMerge(
        "group flex h-[34px] items-center rounded-md p-1.5 text-sm font-normal leading-6 hover:bg-light-200 hover:text-light-1000 dark:hover:bg-dark-200 dark:hover:text-dark-1000",
        current
          ? "bg-light-200 text-light-1000 dark:bg-dark-200 dark:text-dark-1000"
          : "text-neutral-600 dark:bg-dark-100 dark:text-dark-900",
        isCollapsed
          ? "justify-start gap-x-3 md:justify-center md:gap-x-0"
          : "gap-x-3",
      )}
      title={isCollapsed ? name : undefined}
    >
      <LottieIcon index={index} json={json} isPlaying={isHovered} />
      <span className={twMerge(isCollapsed && "md:hidden")}>{name}</span>
    </Link>
  );
};

export default Button;
