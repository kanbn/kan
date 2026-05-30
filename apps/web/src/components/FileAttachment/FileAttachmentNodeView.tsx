import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { HiOutlineDocumentText, HiOutlineArrowDownTray } from "react-icons/hi2";

export default function FileAttachmentNodeView({ node }: NodeViewProps) {
  const { href, filename } = node.attrs as {
    href: string;
    filename: string;
  };

  return (
    <NodeViewWrapper>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        contentEditable={false}
        className="my-1 flex items-center gap-2.5 rounded-lg border border-light-300 bg-light-50 px-3 py-2 no-underline transition-colors hover:bg-light-100 dark:border-dark-400 dark:bg-dark-100 dark:hover:bg-dark-200"
        style={{ textDecoration: "none" }}
      >
        <HiOutlineDocumentText className="h-5 w-5 flex-shrink-0 text-blue-500" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-light-950 dark:text-dark-1000">
          {filename}
        </span>
        <HiOutlineArrowDownTray className="h-4 w-4 flex-shrink-0 text-light-700 dark:text-dark-700" />
      </a>
    </NodeViewWrapper>
  );
}
