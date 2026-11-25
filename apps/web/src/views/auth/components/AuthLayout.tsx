import Link from "next/link";

export function AuthLayout({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="auth-gradient flex min-h-screen flex-col items-center px-5 pt-20 pb-10 sm:justify-center sm:pt-10">
      <div className="w-full max-w-[320px]">
        <Link
          href="/"
          className="mb-8 block text-center text-sm font-bold tracking-tight text-light-1000 dark:text-dark-1000"
        >
          kan.bn
        </Link>
        <h1 className="mb-8 text-center text-xl font-semibold tracking-tight text-light-1000 dark:text-dark-1000">
          {title}
        </h1>
        {children}
        {footer && (
          <p className="mt-8 text-center text-xs text-light-900 dark:text-dark-900">
            {footer}
          </p>
        )}
      </div>
    </main>
  );
}
