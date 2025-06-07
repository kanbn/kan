'use client'

import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Button, ButtonProps } from '@headlessui/react'
import { HiOutlineBold, HiOutlineItalic, HiOutlineStrikethrough, HiOutlineCodeBracket, HiOutlineCodeBracketSquare, HiH1, HiH2, HiH3, HiOutlineNumberedList, HiOutlineListBullet, HiOutlineArrowUturnLeft, HiOutlineArrowUturnRight, HiOutlineChatBubbleLeftEllipsis } from 'react-icons/hi2'
import { twMerge } from 'tailwind-merge'

export default function Editor({
  content,
  onChange,
  onBlur,
  readOnly = false,
}: {
  content: string | null
  onChange: (value: string) => void
  onBlur: () => void,
  readOnly?: boolean
} ) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur(),
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none',
      },
    },
    injectCSS: false,
  }, [content]);

  return (
    <>
      {!readOnly && (
        <EditorMenu editor={editor} />
      )}
      <EditorContent editor={editor} className="prose prose-invert prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none" />
    </>
  );
}

function EditorMenu({ editor }: { editor: TiptapEditor | null }) {
  const MenuItems = [
    {
      name: "undo",
      icon: HiOutlineArrowUturnLeft,
      onClick: () => editor?.chain().focus().undo().run(),
      disabled: !editor?.can().undo(),
    },
    {
      name: "redo",
      icon: HiOutlineArrowUturnRight,
      onClick: () => editor?.chain().focus().redo().run(),
      disabled: !editor?.can().redo(),
    },
    {
      name: "bold",
      icon: HiOutlineBold,
      onClick: () => editor?.chain().focus().toggleBold().run(),
      disabled: !editor?.can().toggleBold(),
      active: editor?.isActive("bold"),
    },
    {
      name: "italic",
      icon: HiOutlineItalic,
      onClick: () => editor?.chain().focus().toggleItalic().run(),
      disabled: !editor?.can().toggleItalic(),
      active: editor?.isActive("italic"),
    },
    {
      name: "strikethrough",
      icon: HiOutlineStrikethrough,
      onClick: () => editor?.chain().focus().toggleStrike().run(),
      disabled: !editor?.can().toggleStrike(),
      active: editor?.isActive("strike"),
    },
    {
      name: "code",
      icon: HiOutlineCodeBracket,
      onClick: () => editor?.chain().focus().toggleCode().run(),
      disabled: !editor?.can().toggleCode(),
      active: editor?.isActive("code"),
    },
    {
      name: "code-block",
      icon: HiOutlineCodeBracketSquare,
      onClick: () => editor?.chain().focus().toggleCodeBlock().run(),
      disabled: !editor?.can().toggleCodeBlock(),
      active: editor?.isActive("codeBlock"),
    },
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
    }
  ];

  return (
    <div className="flex items-center gap-2 border-b-[1px] border-light-600 dark:border-dark-600">
      {MenuItems.map((item) => (
        <EditorMenuButton
          key={item.name}
          onClick={item.onClick}
          disabled={item.disabled}
          active={item.active}
        >
          <item.icon />
        </EditorMenuButton>
      ))}
    </div>
  );
}

function EditorMenuButton(props: ButtonProps & { active?: boolean }) {
  const { active, ...rest } = props;
  return (
    <Button className={twMerge("p-1 rounded-md bg-light-50 dark:bg-dark-50 hover:bg-light-100 dark:hover:bg-dark-400 text-light-900 dark:text-dark-900 flex items-center", active && "bg-light-100 dark:bg-dark-400")} {...rest} />
  );
}

