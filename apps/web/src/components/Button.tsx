import Link from "next/link";
import { twMerge } from "tailwind-merge";

import LoadingSpinner from "./LoadingSpinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  href?: string;
  fullWidth?: boolean;
  openInNewTab?: boolean;
  iconOnly?: boolean;
}

const Button = ({
  children,
  size = "md",
  iconLeft,
  iconRight,
  isLoading,
  variant = "primary",
  href,
  fullWidth,
  openInNewTab,
  iconOnly,
  ...props
}: ButtonProps) => {
  const classes = twMerge(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-light-50 shadow-sm focus-visible:outline-none",
    size === "xs" && "text-xs px-2 py-1",
    size === "sm" && "text-xs",
    size === "lg" && "py-[0.65rem]",
    fullWidth && "w-full",
    iconOnly && "p-0",
    iconOnly &&
      (size === "xs"
        ? "h-6 w-6"
        : size === "sm"
          ? "h-8 w-8"
          : size === "lg"
            ? "h-10 w-10"
            : "h-9 w-9"),
    variant === "primary" &&
      "bg-light-1000 dark:bg-dark-1000 dark:text-dark-50",
    variant === "secondary" &&
      "border-[1px] border-light-600 bg-light-50 text-light-1000 dark:border-dark-600 dark:bg-dark-300 dark:text-dark-1000",
    variant === "danger" &&
      "dark:text-red-1000 border-[1px] border-red-600 bg-red-500 dark:border-red-600 dark:bg-red-500",
    variant === "ghost" &&
      "bg-none text-light-1000 shadow-none hover:bg-light-300 dark:text-dark-1000 dark:hover:bg-dark-200",
    props.disabled && "opacity-60",
  );

  const content = (
    <span className="relative flex items-center justify-center">
      {isLoading && (
        <span className="absolute">
          <LoadingSpinner size={size === "xs" ? "sm" : size} />
        </span>
      )}
      {iconOnly ? (
        <div
          className={twMerge(
            "flex items-center",
            isLoading ? "invisible" : "visible",
          )}
        >
          {iconLeft ?? iconRight}
        </div>
      ) : (
        <div
          className={twMerge(
            fullWidth
              ? "grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-2"
              : "flex items-center",
            isLoading ? "invisible" : "visible",
          )}
        >
          {fullWidth && !iconLeft && iconRight && (
            <span className="col-start-1 opacity-0">{iconRight}</span>
          )}
          {iconLeft && (
            <span
              className={twMerge(
                fullWidth ? "col-start-1 justify-self-start" : "mr-2",
              )}
            >
              {iconLeft}
            </span>
          )}
          <span
            className={twMerge(
              fullWidth ? "col-start-2 justify-self-center text-center" : "",
            )}
          >
            {children}
          </span>
          {iconRight && (
            <span
              className={twMerge(
                fullWidth ? "col-start-3 justify-self-end" : "ml-1",
              )}
            >
              {iconRight}
            </span>
          )}
          {fullWidth && !iconRight && iconLeft && (
            <span className="col-start-3 opacity-0">{iconLeft}</span>
          )}
        </div>
      )}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      disabled={isLoading ?? props.disabled}
      {...props}
    >
      {content}
    </button>
  );
};

export default Button;
