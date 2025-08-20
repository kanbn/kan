import { useEffect, useRef, useState } from "react";
import { HiChevronDown } from "react-icons/hi2";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
}

export function EmojiPicker({
  value,
  onChange,
  placeholder,
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Common emojis organized by category
  const emojiCategories = {
    Smileys: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😅",
      "😂",
      "🤣",
      "😊",
      "😇",
      "🙂",
      "🙃",
      "😉",
      "😌",
      "😍",
      "🥰",
      "😘",
    ],
    Objects: [
      "⭐",
      "🎯",
      "🎨",
      "🎭",
      "🎪",
      "🎬",
      "🎵",
      "🎶",
      "🎤",
      "🎧",
      "📱",
      "💻",
      "⌚",
      "📷",
      "🔧",
      "⚡",
    ],
    Nature: [
      "🌟",
      "🌙",
      "☀️",
      "⛅",
      "🌈",
      "🔥",
      "💧",
      "🌱",
      "🌸",
      "🌺",
      "🍀",
      "🌵",
      "🐝",
      "🦋",
      "🐢",
      "🐧",
    ],
    Food: [
      "🍎",
      "🍊",
      "🍋",
      "🍌",
      "🍇",
      "🍓",
      "🍒",
      "🍑",
      "🥝",
      "🍕",
      "🍔",
      "🌮",
      "🍿",
      "🍭",
      "🍩",
      "☕",
    ],
    Activities: [
      "⚽",
      "🏀",
      "🏈",
      "⚾",
      "🎾",
      "🏐",
      "🏓",
      "🏸",
      "🏹",
      "🎣",
      "🏊",
      "🏃",
      "🚴",
      "🏆",
      "🎖️",
      "🏅",
    ],
    Symbols: [
      "❤️",
      "💙",
      "💚",
      "💛",
      "🧡",
      "💜",
      "🖤",
      "🤍",
      "💯",
      "✨",
      "💫",
      "⚡",
      "🔥",
      "💎",
      "🎉",
      "🎊",
    ],
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-[5px] border-[1px] border-light-50 bg-white px-3 py-2 text-left focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-dark-50 dark:bg-dark-100"
      >
        <span className="flex items-center">
          {value ? (
            <span className="text-lg">{value}</span>
          ) : (
            <span className="text-neutral-400 dark:text-dark-400">
              {placeholder ?? "Select emoji"}
            </span>
          )}
        </span>
        <HiChevronDown className="h-4 w-4 text-neutral-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 rounded-md border border-light-200 bg-white shadow-lg dark:border-dark-200 dark:bg-dark-100">
          <div className="max-h-64 overflow-y-auto p-2">
            {Object.entries(emojiCategories).map(([category, emojis]) => (
              <div key={category} className="mb-3">
                <h4 className="mb-1 text-xs font-medium text-neutral-500 dark:text-dark-500">
                  {category}
                </h4>
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onChange(emoji);
                        setIsOpen(false);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-light-100 dark:hover:bg-dark-200"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {value && (
              <div className="border-t border-light-200 pt-2 dark:border-dark-200">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                  className="w-full rounded px-2 py-1 text-xs text-neutral-500 hover:bg-light-100 dark:text-dark-500 dark:hover:bg-dark-200"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
