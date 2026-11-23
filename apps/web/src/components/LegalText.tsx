export const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-3 text-base font-semibold tracking-[-0.01em] text-light-1000 dark:text-dark-1000">
    {children}
  </h3>
);

export const Text = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-4 text-sm leading-relaxed text-light-950 dark:text-dark-900 [&_a]:underline [&_a]:underline-offset-4">
    {children}
  </p>
);

export const UnorderedList = ({ children }: { children: React.ReactNode }) => (
  <ul className="mb-4 list-disc pl-5">{children}</ul>
);

export const ListItem = ({ children }: { children: React.ReactNode }) => (
  <li className="mb-2 text-sm leading-relaxed text-light-950 dark:text-dark-900">
    {children}
  </li>
);
