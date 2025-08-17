import { CgDarkMode } from "react-icons/cg";
import { useTheme } from "next-themes";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleTheme}
      className="rounded p-1.5 transition-all hover:bg-light-200 dark:hover:bg-dark-100"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    >
      <CgDarkMode
        className={`h-4 w-4 text-light-900 transition-transform duration-200 dark:text-dark-900 ${
          theme === "dark" ? "rotate-180" : "rotate-0"
        }`}
      />
    </button>
  );
};

export default ThemeToggle;
