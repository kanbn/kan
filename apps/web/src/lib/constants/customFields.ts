import { t } from "@lingui/core/macro";

// Field Types Configuration
export const FIELD_TYPE_OPTIONS = [
  { value: "text", label: t`Text`, icon: "📝" },
  { value: "link", label: t`Link`, icon: "🔗" },
  { value: "date", label: t`Date`, icon: "📅" },
  { value: "checkbox", label: t`Checkbox`, icon: "✅" },
  { value: "emoji", label: t`Emoji`, icon: "😀" },
  { value: "user", label: t`User`, icon: "👤" },
] as const;

// Field Type Definitions
export type FieldType = "text" | "link" | "date" | "checkbox" | "emoji" | "user";

// Default Placeholders
export const FIELD_PLACEHOLDERS = {
  text: () => t`Add value...`,
  link: () => t`Add link...`,
  date: () => t`Select date...`,
  checkbox: () => t`No`,
  emoji: () => t`Add emoji...`,
  user: () => t`Select member...`,
  default: () => t`Add value...`,
} as const;

// Input Placeholders for Editing
export const INPUT_PLACEHOLDERS = {
  text: () => t`Enter text`,
  link: () => t`Enter URL`,
  date: "",
  checkbox: "",
  emoji: "😀",
  user: () => t`Select member`,
} as const;

// Field Validation Rules
export const FIELD_VALIDATION = {
  name: {
    minLength: 1,
    maxLength: 255,
  },
  description: {
    maxLength: 500,
  },
  emoji: {
    maxLength: 10,
  },
  publicId: {
    minLength: 12,
  },
} as const;

// UI Constants
export const UI_CONSTANTS = {
  // Common styling classes used across custom field components
  FIELD_CONTAINER: "mb-4 flex w-full flex-row",
  FIELD_LABEL: "my-2 mb-2 w-[100px] text-sm font-medium",
  FIELD_INPUT_BASE: "flex h-full w-full cursor-pointer items-center rounded-[5px] border-[1px] border-light-50 py-1 pl-2 text-left text-sm text-neutral-900 hover:border-light-300 hover:bg-light-200 dark:border-dark-50 dark:text-dark-1000 dark:hover:border-dark-200 dark:hover:bg-dark-100",
  MODAL_CONTAINER: "h-full",
  MODAL_HEADER: "px-5 pt-5",
  MODAL_BODY: "px-5 pb-5",
  MODAL_TITLE: "text-sm font-bold text-neutral-900 dark:text-dark-1000",
  FORM_CARD: "rounded-lg border border-light-300 bg-light-50 p-4 dark:border-dark-300 dark:bg-dark-50",
  EMPTY_STATE: "rounded-lg border border-light-300 bg-light-50 p-6 text-center dark:border-dark-300 dark:bg-dark-50",
  EMPTY_STATE_TEXT: "text-light-600 dark:text-dark-600",
} as const;

// Animation Constants
export const ANIMATIONS = {
  DROPDOWN_ENTER: "transition ease-out duration-100",
  DROPDOWN_ENTER_FROM: "transform opacity-0 scale-95",
  DROPDOWN_ENTER_TO: "transform opacity-100 scale-100",
  DROPDOWN_LEAVE: "transition ease-in duration-75",
  DROPDOWN_LEAVE_FROM: "transform opacity-100 scale-100",
  DROPDOWN_LEAVE_TO: "transform opacity-0 scale-95",
} as const;
