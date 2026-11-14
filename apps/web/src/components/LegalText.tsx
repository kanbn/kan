export const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-4 text-2xl font-bold text-light-1000 dark:text-dark-950">
    {children}
  </h3>
);

export const Text = ({ children }: { children: React.ReactNode }) => (
  <p className="line-height text-md mb-4 text-light-1000 dark:text-dark-900">
    {children}
  </p>
);

export const UnorderedList = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc pl-6">{children}</ul>
);

export const ListItem = ({ children }: { children: React.ReactNode }) => (
  <li className="line-height text-md mb-4 text-light-1000 dark:text-dark-900">
    {children}
  </li>
);
