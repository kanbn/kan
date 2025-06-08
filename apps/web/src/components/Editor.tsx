import { Button } from "@headlessui/react";
import Placeholder from "@tiptap/extension-placeholder";
import {
  BubbleMenu,
  EditorContent,
  Extension,
  ReactRenderer,
  Editor as TiptapEditor,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Suggestion, {
  SuggestionKeyDownProps,
  SuggestionOptions,
} from "@tiptap/suggestion";
import { useRef } from "react";
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
import tippy, { Instance as TippyInstance } from "tippy.js";

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
  command?: (props: { editor: TiptapEditor; range: Range }) => void;
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

const CommandsList = ({
  items,
  command,
}: {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}) => {
  return (
    <div className="flex flex-col rounded-md bg-light-50 dark:bg-dark-50">
      {items.map((item) => (
        <Button key={item.title} onClick={() => command(item)}>
          <div className="group flex items-center rounded-[5px] p-2 text-dark-900 hover:bg-light-200 dark:text-dark-1000 dark:hover:bg-dark-300">
            {item.icon}
            <label htmlFor={item.title} className="ml-3 text-[12px]">
              {item.title}
            </label>
          </div>
        </Button>
      ))}
    </div>
  );
};

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

      return (reactRenderer.ref as any)?.onKeyDown(props);
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
              return component.onKeyDown?.(props) ?? false;
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
}: {
  content: string | null;
  onChange: (value: string) => void;
  onBlur: () => void;
  readOnly?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: readOnly ? "" : "Type something...",
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
      ],
      content,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      onBlur: ({ event }) => {
        if (
          document
            .querySelector(".tippy-box")
            ?.contains(event.relatedTarget as Node)
        )
          return;
        // Only trigger onBlur if the click was outside both the editor and menu
        if (!containerRef.current?.contains(event.relatedTarget as Node)) {
          onBlur();
        }
      },
      editable: !readOnly,
      editorProps: {
        attributes: {
          class: "prose prose-invert prose-sm max-w-none focus:outline-none",
        },
      },
      injectCSS: false,
    },
    [content],
  );

  return (
    <div ref={containerRef}>
      {!readOnly && editor && <EditorBubbleMenu editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose prose-invert prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none"
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
              "text-light-900 dark:text-dark-900",
              item.active && "bg-light-100 dark:bg-dark-400",
            )}
            title={`${item.title} [${item.keys.join(" + ").replace("meta", isMac ? "⌘" : "ctrl")}]`}
            onClick={item.onClick}
          >
            {item.icon}
          </Button>
        ))}
      </div>
    </BubbleMenu>
  );
}
