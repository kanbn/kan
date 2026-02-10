import { t } from "@lingui/core/macro";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef } from "react";

import type { WorkspaceMember } from "./MentionSuggestion";
import {
  getMentionSuggestionItems,
  mentionCommand,
  renderMentionSuggestions,
} from "./MentionSuggestion";

export default function CommentEditor({
  content,
  onChange,
  onSubmit,
  placeholder,
  workspaceMembers,
  readOnly = false,
}: {
  content: string;
  onChange: (html: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  workspaceMembers: WorkspaceMember[];
  readOnly?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Placeholder.configure({
          placeholder: placeholder ?? t`Add a comment... (type '@' to mention)`,
        }),
        Link.configure({
          openOnClick: true,
          HTMLAttributes: {
            class:
              "text-blue-600 hover:text-blue-800 underline cursor-pointer",
            target: "_blank",
            rel: "noopener noreferrer",
          },
          validate: (href) => /^https?:\/\//.test(href),
          autolink: true,
        }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: {
            char: "@",
            items: ({ query }: { query: string }) =>
              getMentionSuggestionItems(workspaceMembers, query),
            command: mentionCommand,
            render: renderMentionSuggestions,
          },
          renderText({ options, node }) {
            return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
          },
        }),
      ],
      content,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      editorProps: {
        attributes: {
          class: "outline-none focus:outline-none focus-visible:ring-0",
        },
        handleKeyDown: (_view, event) => {
          if (event.key === "Enter" && event.shiftKey) {
            event.preventDefault();
            onSubmit?.();
            return true;
          }
          return false;
        },
      },
      editable: !readOnly,
      injectCSS: false,
    },
    [],
  );

  return (
    <div ref={containerRef}>
      <EditorContent
        editor={editor}
        className="prose dark:prose-invert prose-sm max-w-none [&_p.is-empty::before]:text-light-900 [&_p.is-empty::before]:dark:text-dark-800 [&_p]:!text-sm [&_p]:text-light-950 [&_p]:dark:text-dark-950"
      />
    </div>
  );
}
