import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

interface PlainTextEditorProps {
  content: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  onEnter?: (value: string) => void;
  onEscape?: () => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export default function PlainTextEditor({
  content,
  onChange,
  onBlur,
  onEnter,
  onEscape,
  readOnly = false,
  placeholder,
  className,
}: PlainTextEditorProps) {
  const onEnterRef = useRef(onEnter);
  const onEscapeRef = useRef(onEscape);
  const onBlurRef = useRef(onBlur);
  const onChangeRef = useRef(onChange);
  const contentRef = useRef(content);

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);
  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          bold: false,
          italic: false,
          strike: false,
          code: false,
          codeBlock: false,
          blockquote: false,
          heading: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          horizontalRule: false,
          hardBreak: false,
        }),
        Placeholder.configure({ placeholder }),
      ],
      content,
      editable: !readOnly,
      onUpdate: ({ editor }) => onChangeRef.current?.(editor.getText()),
      onBlur: ({ editor }) => onBlurRef.current?.(editor.getText()),
      editorProps: {
        handleKeyDown: (view, event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onEnterRef.current?.(view.state.doc.textContent.trim());
            return true;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            // Reset to original content before calling the callback
            editor?.commands.setContent(contentRef.current, false);
            editor?.commands.blur();
            onEscapeRef.current?.();
            return true;
          }
          return false;
        },
        attributes: {
          class: "outline-none focus:outline-none focus-visible:ring-0",
        },
      },
    },
    [],
  );

  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getText()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [readOnly, editor]);

  return (
    <>
      <style jsx global>{`
        .plain-text-editor p.is-empty::before {
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          color: var(--placeholder-color, #9ca3af);
        }
        .plain-text-editor .tiptap p {
          margin: 0 !important;
        }
      `}</style>
      <EditorContent
        editor={editor}
        className={twMerge("plain-text-editor", className)}
      />
    </>
  );
}
