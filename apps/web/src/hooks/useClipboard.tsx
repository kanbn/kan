import { useState } from "react";

export function useClipboard({ timeout = 500 } = {}) {
  const [error, setError] = useState<string | Error | null | undefined>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyTimeout, setCopyTimeout] = useState<number | undefined>(undefined);

  const handleCopyResult = (hasError: boolean) => {
    clearTimeout(copyTimeout);

    setCopyTimeout(
      setTimeout(() => setCopied(false), timeout) as unknown as number,
    );

    setCopied(hasError);
  };

  const copy = (value: string) => {
    if ("clipboard" in navigator) {
      navigator.clipboard
        .writeText(value)
        .then(() => handleCopyResult(true))
        .catch((err) => setError(err));
    } else {
      setError(new Error("Error: navigator.clipboard is not supported"));
    }
  };

  const reset = () => {
    setError(null);
    setCopied(false);
    clearTimeout(copyTimeout);
  };

  return { copy, reset, error, copied };
}
