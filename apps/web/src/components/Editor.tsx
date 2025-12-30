import type { Range as TiptapRange } from "@tiptap/core";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
} from "@tiptap/suggestion";
import type { Instance as TippyInstance } from "tippy.js";
import { Button } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import {
  BubbleMenu,
  EditorContent,
  Extension,
  ReactRenderer,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Suggestion from "@tiptap/suggestion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  HiH1,
  HiH2,
  HiH3,
  HiOutlineBold,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineCodeBracket,
  HiOutlineCodeBracketSquare,
  HiOutlineItalic,
  HiOutlineListBullet,
  HiOutlineNumberedList,
  HiOutlineStrikethrough,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";
import tippy from "tippy.js";
import { Markdown } from "tiptap-markdown";

import { getAvatarUrl } from "~/utils/helpers";
import Avatar from "./Avatar";
import { YouTubeNode } from "./YouTubeEmbed/YouTubeNode";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    slashSuggestion: {
      setSlashSuggestion: () => ReturnType;
    };
  }
}

export interface SlashCommandItem {
  title: string;
  icon?: React.ReactNode;
  command?: (props: { editor: TiptapEditor; range: TiptapRange }) => void;
  disabled?: boolean;
}

export interface SlashCommandsOptions {
  suggestion?: Partial<SuggestionOptions>;
  commandItems?: SlashCommandItem[];
  options?: any;
}

function filterSlashCommandItems(items: SlashCommandItem[], query: string) {
  return items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()),
  );
}

export interface RenderSuggestionsProps {
  editor: TiptapEditor;
  clientRect: () => DOMRect;
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface WorkspaceMember {
  publicId: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  email: string;
}

const CommandsList = forwardRef<
  { onKeyDown: (props: SuggestionKeyDownProps) => boolean },
  {
    items: SlashCommandItem[];
    command: (item: SlashCommandItem) => void;
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
      <div className="max-h-[350px] overflow-y-auto p-1">
        {items.map((item, index) => (
          <button
            key={item.title}
            onClick={() => command(item)}
            className={twMerge(
              "group flex w-full items-center rounded-[5px] p-2 hover:bg-light-200 dark:hover:bg-dark-300",
              index === selectedIndex && "bg-light-200 dark:bg-dark-300",
            )}
          >
            <span className="text-dark-700 dark:text-dark-800">
              {item.icon}
            </span>
            <span className="ml-3 text-[12px] font-medium text-dark-900 dark:text-dark-1000">
              {item.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

CommandsList.displayName = "CommandsList";

const RenderSuggestions = () => {
  let reactRenderer: ReactRenderer;
  let popup: TippyInstance[];

  return {
    onStart: (props: RenderSuggestionsProps) => {
      reactRenderer = new ReactRenderer(CommandsList, {
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
    onUpdate(props: RenderSuggestionsProps) {
      reactRenderer.updateProps(props);

      if (!props.clientRect) return;

      popup[0]?.setProps({
        getReferenceClientRect: props.clientRect,
      });
    },
    onKeyDown(props: SuggestionKeyDownProps): boolean {
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

interface MentionItem {
  id: string;
  label: string;
  image: string | null;
}

const MentionList = forwardRef<
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

const renderMentionSuggestions = () => {
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

const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: "slash-commands",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) => {
          return filterSlashCommandItems(
            this.parent().commandItems ?? [],
            query,
          );
        },
        render: () => {
          let component: ReturnType<typeof RenderSuggestions>;
          return {
            onStart: (props: any) => {
              component = RenderSuggestions();
              component.onStart(props);
            },
            onUpdate(props: any) {
              component.onUpdate(props);
            },
            onKeyDown(props: any) {
              if (props.event.key === "Escape") {
                return true;
              }
              return component.onKeyDown(props) ?? false;
            },
            onExit: () => {
              component.onExit();
            },
          };
        },
      },
      commandItems: [] as SlashCommandItem[],
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        render: RenderSuggestions,
      } as SuggestionOptions),
    ];
  },
});

export interface SlashNodeAttrs {
  id: string | null;
  label?: string | null;
}

const CommandItems: SlashCommandItem[] = [
  {
    title: "Heading 1",
    icon: <HiH1 />,
    command: ({ editor }) =>
      editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    icon: <HiH2 />,
    command: ({ editor }) =>
      editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    icon: <HiH3 />,
    command: ({ editor }) =>
      editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    icon: <HiOutlineListBullet />,
    command: ({ editor }) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Ordered List",
    icon: <HiOutlineNumberedList />,
    command: ({ editor }) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Blockquote",
    icon: <HiOutlineChatBubbleLeftEllipsis />,
    command: ({ editor }) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    icon: <HiOutlineCodeBracketSquare />,
    command: ({ editor }) => editor.chain().focus().toggleCodeBlock().run(),
  },
];

export default function Editor({
  content,
  onChange,
  onBlur,
  readOnly = false,
  workspaceMembers,
  enableYouTubeEmbed = true,
}: {
  content: string | null;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  readOnly?: boolean;
  workspaceMembers: WorkspaceMember[];
  enableYouTubeEmbed?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Markdown,
        Placeholder.configure({
          placeholder: readOnly
            ? ""
            : t`Add description... (type '/' to open commands or '@' to mention)`,
        }),
        Link.configure({
          openOnClick: true,
          HTMLAttributes: {
            class: "text-blue-600 hover:text-blue-800 underline cursor-pointer",
            target: "_blank",
            rel: "noopener noreferrer",
          },
          validate: (href) => /^https?:\/\//.test(href),
          autolink: true,
        }),
        SlashCommands.configure({
          commandItems: CommandItems,
          suggestion: {
            items: ({ query }: { query: string }) =>
              filterSlashCommandItems(CommandItems, query),
            startOfLine: true,
            char: "/",
          },
        }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: {
            char: "@",
            items: ({ query }: { query: string }) => {
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
            },
            command: ({ editor, range, props }) => {
              const id = props.id ?? "";
              const label = props.label ?? "";
              const mentionHTML = `<span data-type="mention" data-id="${id}" data-label="${label}">@${label}</span>&nbsp;`;

              editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent(mentionHTML)
                .focus()
                .run();
            },
            render: renderMentionSuggestions,
          },
          renderText({ options, node }) {
            return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
          },
        }),
        ...(enableYouTubeEmbed ? [YouTubeNode] : []),
      ],
      content,
      onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
      onBlur: ({ event }) => {
        if (
          document
            .querySelector(".tippy-box")
            ?.contains(event.relatedTarget as Node)
        )
          return;
        // Only trigger onBlur if the click was outside both the editor and menu
        if (!containerRef.current?.contains(event.relatedTarget as Node)) {
          onBlur?.();
        }
      },
      editorProps: {
        attributes: {
          class: "outline-none focus:outline-none focus-visible:ring-0",
        },
      },
      editable: !readOnly,
      injectCSS: false,
    },
    [], // creating the editor only once
  );

  // this will sync external content changes without re-creating the editor instance
  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.getHTML();
    const safeContent = content ?? "";
    if (safeContent !== currentHTML) {
      editor.commands.setContent(safeContent, false);
    }
  }, [content, editor]);

  return (
    <div ref={containerRef}>
      <style jsx global>{`
        .tiptap p.is-empty::before {
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap p {
          margin: 0 0 1rem 0 !important;
        }
        .tiptap .mention {
          background-color: rgba(59, 130, 246, 0.1);
          border-radius: 0.25rem;
          padding: 0.125rem 0.25rem;
          color: rgb(59, 130, 246);
          text-decoration: none;
          font-weight: 500;
        }
        .tiptap [data-youtube] {
          margin: 1rem 0;
        }
      `}</style>
      {!readOnly && editor && <EditorBubbleMenu editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose dark:prose-invert prose-sm max-w-none overflow-y-auto [&_blockquote]:!text-xs [&_h1]:!text-lg [&_h2]:!text-base [&_h3]:!text-sm [&_ol]:!text-xs [&_p.is-empty::before]:text-light-900 [&_p.is-empty::before]:dark:text-dark-800 [&_p]:!text-sm [&_p]:text-light-950 [&_p]:dark:text-dark-950 [&_ul]:!text-xs"
      />
    </div>
  );
}

function EditorBubbleMenu({ editor }: { editor: TiptapEditor | null }) {
  const isMac = navigator.platform.includes("Mac");

  const bubbleMenuItems = [
    {
      title: "Bold",
      icon: <HiOutlineBold />,
      keys: ["meta", "b"],
      onClick: () => editor?.chain().focus().toggleBold().run(),
      active: editor?.isActive("bold"),
    },
    {
      title: "Italic",
      icon: <HiOutlineItalic />,
      keys: ["meta", "i"],
      onClick: () => editor?.chain().focus().toggleItalic().run(),
      active: editor?.isActive("italic"),
    },
    {
      title: "Strikethrough",
      icon: <HiOutlineStrikethrough />,
      keys: ["meta", "shift", "s"],
      onClick: () => editor?.chain().focus().toggleStrike().run(),
      active: editor?.isActive("strike"),
    },
    {
      title: "Code",
      icon: <HiOutlineCodeBracket />,
      keys: ["meta", "e"],
      onClick: () => editor?.chain().focus().toggleCode().run(),
      active: editor?.isActive("code"),
    },
  ];
  return (
    <BubbleMenu editor={editor}>
      <div className="flex items-center gap-2 rounded-md border border-light-600 bg-light-50 p-1 dark:border-dark-600 dark:bg-dark-50">
        {bubbleMenuItems.map((item) => (
          <Button
            key={item.title}
            className={twMerge(
              "rounded p-1 text-light-900 focus:ring-2 focus:ring-light-600 dark:text-dark-900 dark:focus:ring-dark-600",
              item.active && "bg-light-100 dark:bg-dark-400",
            )}
            title={`${item.title} [${item.keys.join(" + ").replace("meta", isMac ? "⌘" : "ctrl")}]`}
            onClick={item.onClick}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                item.onClick();
              }
            }}
          >
            {item.icon}
          </Button>
        ))}
      </div>
    </BubbleMenu>
  );
}
