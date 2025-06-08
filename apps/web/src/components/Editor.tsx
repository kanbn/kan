import type { Editor as TiptapEditor } from "@tiptap/react";
import { Button } from "@headlessui/react";
import Placeholder from "@tiptap/extension-placeholder";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
      ],
      content,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      onBlur: ({ event }) => {
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

function EditorSlashMenu({ editor }: { editor: TiptapEditor | null }) {
  const slashMenuItems = [
    {
      name: "h1",
      icon: HiH1,
      onClick: () => editor?.chain().focus().setHeading({ level: 1 }).run(),
      disabled: !editor?.can().setHeading({ level: 1 }),
      active: editor?.isActive("heading", { level: 1 }),
    },
    {
      name: "h2",
      icon: HiH2,
      onClick: () => editor?.chain().focus().setHeading({ level: 2 }).run(),
      disabled: !editor?.can().setHeading({ level: 2 }),
      active: editor?.isActive("heading", { level: 2 }),
    },
    {
      name: "h3",
      icon: HiH3,
      onClick: () => editor?.chain().focus().setHeading({ level: 3 }).run(),
      disabled: !editor?.can().setHeading({ level: 3 }),
      active: editor?.isActive("heading", { level: 3 }),
    },
    {
      name: "bulletList",
      icon: HiOutlineListBullet,
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
      disabled: !editor?.can().toggleBulletList(),
      active: editor?.isActive("bulletList"),
    },
    {
      name: "orderedList",
      icon: HiOutlineNumberedList,
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
      disabled: !editor?.can().toggleOrderedList(),
      active: editor?.isActive("orderedList"),
    },
    {
      name: "blockquote",
      icon: HiOutlineChatBubbleLeftEllipsis,
      onClick: () => editor?.chain().focus().toggleBlockquote().run(),
      disabled: !editor?.can().toggleBlockquote(),
      active: editor?.isActive("blockquote"),
    },
    {
      name: "code-block",
      icon: HiOutlineCodeBracketSquare,
      onClick: () => editor?.chain().focus().toggleCodeBlock().run(),
      disabled: !editor?.can().toggleCodeBlock(),
      active: editor?.isActive("codeBlock"),
    },
  ];
  // TODO: Implement Suggestion API & Look/Feel
  return <div></div>;
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
