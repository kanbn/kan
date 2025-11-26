import type { ReactNode } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { t } from "@lingui/core/macro";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { HiXMark } from "react-icons/hi2";

import { env } from "~/env";
import { useEventListener } from "~/hooks/useEventListener";

const ModifierKey = {
  CONTROL: "CONTROL",
  META: "META",
  ALT: "ALT",
  SHIFT: "SHIFT",
} as const;
type ModifierKey = (typeof ModifierKey)[keyof typeof ModifierKey];

const ModifierKeyInfo: Record<
  ModifierKey,
  {
    macSymbol: string;
    winName: string;
    linuxName: string;
  }
> = {
  CONTROL: { macSymbol: "⌃", winName: "Ctrl", linuxName: "Ctrl" },
  META: { macSymbol: "⌘", winName: "Win", linuxName: "Super" },
  ALT: { macSymbol: "⌥", winName: "Alt", linuxName: "Alt" },
  SHIFT: { macSymbol: "⇧", winName: "Shift", linuxName: "Shift" },
};

const ShortcutGroup = {
  GENERAL: "GENERAL",
  NAVIGATION: "NAVIGATION",
  ACTIONS: "ACTIONS",
} as const;
type ShortcutGroup = (typeof ShortcutGroup)[keyof typeof ShortcutGroup];

const getShortcutGroupInfo = (): Record<ShortcutGroup, { label: string }> => ({
  GENERAL: { label: t`General` },
  NAVIGATION: { label: t`Navigation` },
  ACTIONS: { label: t`Actions` },
});

interface KeyStroke {
  key: string;
  modifiers?: ModifierKey[];
}

interface Press {
  type: "PRESS";
  stroke: KeyStroke;
}

interface Sequence {
  type: "SEQUENCE";
  strokes: KeyStroke[];
}

export type KeyboardShortcut = {
  action: () => void;
  description: string;
  group: ShortcutGroup;
} & (Press | Sequence);

interface ShortcutTreeStepNode {
  type: "STEP";
  children: ShortcutTreeLevel;
}
interface ShortcutTreeActionNode {
  type: "ACTION";
  shortcut: KeyboardShortcut;
}
type ShortcutTreeNode = ShortcutTreeStepNode | ShortcutTreeActionNode;
type ShortcutTreeLevel = Record<string, ShortcutTreeNode>;

const SEQUENCE_TIMEOUT_MS = 1000;

const ShortcutConflictCode = {
  ACTION_ON_SEQUENCE: "ACTION_ON_SEQUENCE",
  DUPLICATE_ACTION: "DUPLICATE_ACTION",
  SEQUENCE_ON_ACTION: "SEQUENCE_ON_ACTION",
} as const;
type ShortcutConflictCode = keyof typeof ShortcutConflictCode;

interface ShortcutConflictErrorOptions {
  code: ShortcutConflictCode;
  shortcut: KeyboardShortcut;
  conflictPath: string;
  existingShortcut?: KeyboardShortcut;
}

class ShortcutConflictError extends Error {
  public readonly code: ShortcutConflictCode;
  public readonly shortcut: KeyboardShortcut;
  public readonly conflictPath: string;
  public readonly existingShortcut?: KeyboardShortcut;

  constructor(options: ShortcutConflictErrorOptions) {
    super(ShortcutConflictError.formatMessage(options));
    this.name = "ShortcutConflictError";
    this.code = options.code;
    this.shortcut = options.shortcut;
    this.conflictPath = options.conflictPath;
    this.existingShortcut = options.existingShortcut;
  }

  private static stringifyShortcut(shortcut: KeyboardShortcut): string {
    if (shortcut.type === "SEQUENCE") {
      return shortcut.strokes.map(serializeKeyStroke).join(" → ");
    }
    return serializeKeyStroke(shortcut.stroke);
  }

  private static formatMessage(options: ShortcutConflictErrorOptions): string {
    const formatted = ShortcutConflictError.stringifyShortcut(options.shortcut);
    switch (options.code) {
      case ShortcutConflictCode.ACTION_ON_SEQUENCE:
        return `Cannot register "${formatted}": desired action conflicts with existing sequence at "${options.conflictPath}"`;
      case ShortcutConflictCode.DUPLICATE_ACTION:
        return `Cannot register "${formatted}": action already registered`;
      case ShortcutConflictCode.SEQUENCE_ON_ACTION:
        return `Cannot register "${formatted}": desired sequence conflicts with existing action at "${options.conflictPath}"`;
    }
  }
}

interface KeyboardShortcutContextType {
  registerShortcut: (shortcut: KeyboardShortcut) => () => void;
  openLegend: () => void;
  openLegendKeys: ReactNode;
}

const KeyboardShortcutContext = createContext<
  KeyboardShortcutContextType | undefined
>(undefined);

export function KeyboardShortcutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const treeRootRef = useRef<ShortcutTreeLevel>({});
  const currentNodeRef = useRef<ShortcutTreeLevel>(treeRootRef.current);
  const shortcutsRef = useRef<Map<string, KeyboardShortcut>>(new Map());
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isLegendOpen, setIsLegendOpen] = useState(false);

  const openLegendShortcut: KeyboardShortcut = useMemo(
    () => ({
      type: "PRESS",
      stroke: {
        key: "/",
        modifiers: ["META"],
      },
      action: () => setIsLegendOpen(true),
      description: t`Open keyboard shortcuts`,
      group: ShortcutGroup.GENERAL,
    }),
    [setIsLegendOpen],
  );

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isTypingInInput(event)) {
      return;
    }

    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current);
      sequenceTimeoutRef.current = null;
    }

    const serializedKey = serializeEvent(event);
    const node = currentNodeRef.current[serializedKey];

    if (!node) {
      currentNodeRef.current = treeRootRef.current;
      return;
    }

    switch (node.type) {
      case "STEP":
        event.preventDefault();
        currentNodeRef.current = node.children;
        sequenceTimeoutRef.current = setTimeout(() => {
          currentNodeRef.current = treeRootRef.current;
        }, SEQUENCE_TIMEOUT_MS);
        return;
      case "ACTION":
        event.preventDefault();
        node.shortcut.action();
        currentNodeRef.current = treeRootRef.current;
        return;
      default:
        return;
    }
  }, []);

  const registerShortcut = useCallback(
    (shortcut: KeyboardShortcut): (() => void) => {
      const strokes =
        shortcut.type === "SEQUENCE" ? shortcut.strokes : [shortcut.stroke];

      const path = strokes.map(serializeKeyStroke);
      const pathKey = path.join(" → ");

      path.reduce((currentLevel, key, i) => {
        const isLast = i === path.length - 1;
        const existingNode = currentLevel[key];

        if (env.NODE_ENV === "development" && existingNode) {
          const conflictPath = path.slice(0, i + 1).join(" → ");
          validateNoConflict(existingNode, isLast, shortcut, conflictPath);
        }

        if (isLast) {
          currentLevel[key] = {
            type: "ACTION",
            shortcut,
          };
          return currentLevel;
        }

        if (existingNode?.type === "STEP") {
          return existingNode.children;
        }

        const newNode: ShortcutTreeStepNode = {
          type: "STEP",
          children: {},
        };
        currentLevel[key] = newNode;
        return newNode.children;
      }, treeRootRef.current);

      shortcutsRef.current.set(pathKey, shortcut);

      return () => {
        removePathAndPrune(treeRootRef.current, path);
        shortcutsRef.current.delete(pathKey);
      };
    },
    [],
  );

  useEventListener("keydown", handleKeyDown);

  // Register built-in shortcut to open legend
  useEffect(() => {
    const cleanup = registerShortcut(openLegendShortcut);
    return cleanup;
  }, [registerShortcut, openLegendShortcut]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, []);

  const shortcutsArray = Array.from(shortcutsRef.current.values());
  const groupedShortcuts = shortcutsArray.reduce<
    Partial<Record<ShortcutGroup, KeyboardShortcut[]>>
  >((acc, shortcut) => {
    const group = shortcut.group;
    acc[group] ??= [];
    acc[group].push(shortcut);
    return acc;
  }, {});

  const openLegend = useCallback(() => {
    setIsLegendOpen(true);
  }, []);

  const openLegendKeys = useMemo(
    () => <FormattedShortcut shortcut={openLegendShortcut} />,
    [openLegendShortcut],
  );

  return (
    <KeyboardShortcutContext.Provider
      value={{ registerShortcut, openLegend, openLegendKeys }}
    >
      {children}

      {/* Shortcut Legend */}
      <Dialog
        className="relative z-50"
        open={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      >
        <DialogBackdrop
          transition
          className="data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in fixed inset-0 bg-light-50 bg-opacity-40 transition-opacity dark:bg-dark-50 dark:bg-opacity-40"
        />

        <div className="fixed inset-0 flex min-h-full w-screen items-center justify-center overflow-y-auto p-4">
          <DialogPanel
            transition
            className="relative w-full max-w-sm transform overflow-hidden rounded-lg border border-light-600 bg-white shadow-3xl-light dark:border-dark-600 dark:bg-dark-100 dark:shadow-3xl-dark"
          >
            <div className="flex items-center justify-between border-b border-light-300 px-6 py-4 dark:border-dark-300">
              <DialogTitle className="text-[14px] font-semibold text-neutral-900 dark:text-dark-1000">
                {t`Keyboard Shortcuts`}
              </DialogTitle>
              <button
                onClick={() => setIsLegendOpen(false)}
                className="rounded p-1 hover:bg-light-200 dark:hover:bg-dark-200"
              >
                <HiXMark className="h-5 w-5 text-neutral-700 dark:text-dark-700" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-6">
              {shortcutsArray.length === 0 ? (
                <p className="text-center text-sm text-neutral-600 dark:text-dark-600">
                  {t`No keyboard shortcuts registered.`}
                </p>
              ) : (
                <div className="space-y-6">
                  {Object.values(ShortcutGroup).map((group, idx) => {
                    const shortcuts = groupedShortcuts[group];
                    if (!shortcuts?.length) return null;
                    const groupInfo = getShortcutGroupInfo();
                    return (
                      <div key={`${group}-${idx}`}>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-light-1000 dark:text-dark-1000">
                          {groupInfo[group].label}
                        </h3>
                        <div className="flex flex-col gap-y-2">
                          {shortcuts.map((shortcut) => (
                            <ShortcutListItem
                              key={shortcut.description}
                              shortcut={shortcut}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </KeyboardShortcutContext.Provider>
  );
}

/**
 * Hook to register a keyboard shortcut. Cleanup is handled automatically.
 * Returns both formatted keys and pre-built tooltip content.
 *
 * IMPORTANT: The shortcut object reference must be stable. If it changes
 * on every render, the shortcut will be continuously registered and unregistered.
 *
 * @example
 * ```tsx
 * const { keys, tooltipContent } = useKeyboardShortcut({
 *   type: "PRESS",
 *   stroke: { key: "k", modifiers: ["META"] },
 *   action: () => openCommandPalette(),
 *   description: "Open command palette",
 *   group: "GENERAL"
 * });
 *
 * // Use tooltip for Tooltip component
 * <Tooltip content={tooltipContent}>
 *   <button>Search</button>
 * </Tooltip>
 *
 * // Or use keys directly for custom formatting
 * <span>Press {keys} to search</span>
 * ```
 */
export function useKeyboardShortcuts(): KeyboardShortcutContextType {
  const context = useContext(KeyboardShortcutContext);

  if (!context) {
    throw new Error(
      "useKeyboardShortcuts must be used within KeyboardShortcutProvider",
    );
  }

  return context;
}

export function useKeyboardShortcut(shortcut: KeyboardShortcut): {
  keys: ReactNode;
  tooltipContent: ReactNode;
} {
  const context = useContext(KeyboardShortcutContext);

  if (!context) {
    throw new Error(
      "useKeyboardShortcut must be used within KeyboardShortcutProvider",
    );
  }

  const { registerShortcut } = context;

  useEffect(() => {
    const cleanup = registerShortcut(shortcut);
    return cleanup;
  }, [shortcut, registerShortcut]);

  const keys = <FormattedShortcut shortcut={shortcut} />;
  const tooltipContent = (
    <div className="flex flex-row items-center gap-2 text-[11px]">
      {shortcut.description} {keys}
    </div>
  );

  return { keys, tooltipContent };
}

function ShortcutListItem({ shortcut }: { shortcut: KeyboardShortcut }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-dark-50 dark:text-dark-900">
        {shortcut.description}
      </span>
      <FormattedShortcut shortcut={shortcut} />
    </div>
  );
}

function FormattedShortcut({ shortcut }: { shortcut: KeyboardShortcut }) {
  const kbdClassName =
    "inline-flex h-5 w-5 items-center justify-center rounded border border-light-400 bg-light-200 px-1.5 py-0.5 font-mono text-[8px] font-semibold text-center text-neutral-900 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-950";

  const stringifyModifier = (modifier: ModifierKey): string => {
    const isMac =
      typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
    const isLinux =
      typeof navigator !== "undefined" && navigator.userAgent.includes("Linux");

    const info = ModifierKeyInfo[modifier];
    if (isMac) return info.macSymbol;
    if (isLinux) return info.linuxName;
    return info.winName;
  };

  const formatStroke = (stroke: KeyStroke): ReactNode[] => {
    const parts: ReactNode[] = [];
    const modifierStrings = stroke.modifiers
      ? stroke.modifiers.map(stringifyModifier)
      : [];

    modifierStrings.forEach((mod) => {
      parts.push(<kbd className={kbdClassName}>{mod}</kbd>);
    });

    parts.push(<kbd className={kbdClassName}>{stroke.key.toUpperCase()}</kbd>);

    return parts;
  };

  if (shortcut.type === "SEQUENCE") {
    const parts: ReactNode[] = [];
    shortcut.strokes.forEach((stroke) => {
      parts.push(...formatStroke(stroke));
    });
    return <span className="flex items-center gap-1 text-[11px]">{parts}</span>;
  }

  return (
    <span className="inline-flex flex-shrink-0 items-center gap-1 text-[11px]">
      {formatStroke(shortcut.stroke)}
    </span>
  );
}

/** Checks for conflicts given existing nodes and current path
 * Throws an error if conflict is found
 *
 */
function validateNoConflict(
  existingNode: ShortcutTreeNode,
  isLastKey: boolean,
  shortcut: KeyboardShortcut,
  conflictPath: string,
): void {
  if (isLastKey) {
    if (existingNode.type === "STEP") {
      throw new ShortcutConflictError({
        code: ShortcutConflictCode.ACTION_ON_SEQUENCE,
        shortcut,
        conflictPath,
      });
    } else {
      throw new ShortcutConflictError({
        code: ShortcutConflictCode.DUPLICATE_ACTION,
        shortcut,
        conflictPath,
        existingShortcut: existingNode.shortcut,
      });
    }
  } else if (existingNode.type === "ACTION") {
    throw new ShortcutConflictError({
      code: ShortcutConflictCode.SEQUENCE_ON_ACTION,
      shortcut,
      conflictPath,
      existingShortcut: existingNode.shortcut,
    });
  }
}

/**
 * Checks if the user is currently typing in an input field
 */
function isTypingInInput(event: KeyboardEvent): boolean {
  if (!event.target) return false;

  const target = event.target as HTMLElement;
  const tagName = target.tagName.toLowerCase();
  const isInput = tagName === "input" || tagName === "textarea";
  const isContentEditable = target.isContentEditable;

  return isInput || isContentEditable;
}

/**
 * Serializes a KeyStroke to a consistent string format
 * Returns lowercase string like "ctrl+shift+k" with alphabetically sorted modifiers
 */
function serializeKeyStroke(stroke: KeyStroke): string {
  const key = stroke.key.toLowerCase();
  if (!stroke.modifiers || stroke.modifiers.length === 0) return key;
  const sorted = [...stroke.modifiers].sort();
  return `${sorted.join("+")}+${key}`;
}

/**
 * Converts a keyboard event to a KeyStroke
 */
function eventToKeyStroke(event: KeyboardEvent): KeyStroke {
  const modifiers: ModifierKey[] = [];
  if (event.altKey) modifiers.push(ModifierKey.ALT);
  if (event.ctrlKey) modifiers.push(ModifierKey.CONTROL);
  if (event.metaKey) modifiers.push(ModifierKey.META);
  // Only include shift if the key is a letter (shift wasn't consumed to produce the character)
  if (event.shiftKey && /^[a-zA-Z]$/.test(event.key))
    modifiers.push(ModifierKey.SHIFT);
  return { key: event.key, modifiers };
}

/**
 * Serializes a keyboard event to a consistent string format
 */
function serializeEvent(event: KeyboardEvent): string {
  return serializeKeyStroke(eventToKeyStroke(event));
}

/**
 * Removes a path from the tree and prunes empty branches
 */
function removePathAndPrune(tree: ShortcutTreeLevel, path: string[]): void {
  const [first, ...rest] = path;
  if (!first) return;

  if (rest.length === 0) {
    delete tree[first];
    return;
  }

  const node = tree[first];
  if (!node || node.type !== "STEP") return;

  removePathAndPrune(node.children, rest);

  if (Object.keys(node.children).length === 0) {
    delete tree[first];
  }
}
