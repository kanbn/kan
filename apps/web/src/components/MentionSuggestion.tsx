import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { Instance as TippyInstance } from "tippy.js";
import { ReactRenderer } from "@tiptap/react";
import { forwardRef, useImperativeHandle, useState } from "react";
import { twMerge } from "tailwind-merge";
import tippy from "tippy.js";

import { getAvatarUrl } from "~/utils/helpers";
import Avatar from "./Avatar";

export interface WorkspaceMember {
  publicId: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  email: string;
}

export interface MentionItem {
  id: string;
  label: string;
  image: string | null;
}

export const MentionList = forwardRef<
  { onKeyDown: (props: SuggestionKeyDownProps) => boolean },
  {
    items: MentionItem[];
    command: (item: MentionItem) => void;
  }
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % items.length);
        return true;
      }

      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item) {
          command(item);
        }
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="w-56 rounded-md border-[1px] border-light-200 bg-light-50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-500 dark:bg-dark-200">
      <div className="max-h-[350px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-light-200 dark:scrollbar-thumb-dark-300">
        {items.length > 0 ? (
          items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => command(item)}
              className={twMerge(
                "group flex w-full items-center rounded-[5px] p-2 hover:bg-light-200 dark:hover:bg-dark-300",
                index === selectedIndex && "bg-light-200 dark:bg-dark-300",
              )}
            >
              <Avatar
                size="xs"
                name={item.label}
                imageUrl={item.image ? getAvatarUrl(item.image) : undefined}
                email={item.label}
              />
              <span className="ml-3 text-[12px] font-medium text-dark-900 dark:text-dark-1000">
                {item.label}
              </span>
            </button>
          ))
        ) : (
          <div className="flex items-center justify-start p-2">
            <span className="text-[12px] text-dark-900 dark:text-dark-1000">
              No results
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

MentionList.displayName = "MentionList";

export const renderMentionSuggestions = () => {
  let reactRenderer: ReactRenderer;
  let popup: TippyInstance[];

  return {
    onStart: (props: any) => {
      reactRenderer = new ReactRenderer(MentionList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) return;

      popup = tippy("body", {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: reactRenderer.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      });
    },
    onUpdate(props: any) {
      reactRenderer.updateProps(props);
      if (!props.clientRect) return;
      popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
    },
    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === "Escape") {
        popup[0]?.hide();
        return true;
      }
      return (
        (
          reactRenderer.ref as {
            onKeyDown?: (props: SuggestionKeyDownProps) => boolean;
          }
        ).onKeyDown?.(props) ?? false
      );
    },
    onExit() {
      popup[0]?.destroy();
      reactRenderer.destroy();
    },
  };
};

export function getMentionSuggestionItems(
  workspaceMembers: WorkspaceMember[],
  query: string,
): MentionItem[] {
  const all: MentionItem[] = workspaceMembers.map(
    (member: WorkspaceMember) => ({
      id: member.publicId,
      label: member?.user?.name ?? member.email,
      image: member?.user?.image ?? null,
    }),
  );
  const q = query.toLowerCase();
  return all.filter(
    (u) =>
      u.label &&
      typeof u.label === "string" &&
      u.label.toLowerCase().includes(q),
  );
}

export function mentionCommand({
  editor,
  range,
  props,
}: {
  editor: any;
  range: any;
  props: any;
}) {
  const id = props.id ?? "";
  const label = props.label ?? "";
  const mentionHTML = `<span data-type="mention" data-id="${id}" data-label="${label}">@${label}</span>&nbsp;`;

  editor.chain().focus().deleteRange(range).insertContent(mentionHTML).focus().run();
}
