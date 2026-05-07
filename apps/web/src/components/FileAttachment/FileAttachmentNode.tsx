import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import FileAttachmentNodeView from "./FileAttachmentNodeView";

export interface FileAttachmentOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const FileAttachmentNode = Node.create<FileAttachmentOptions>({
  name: "fileAttachment",
  group: "block",
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-href"),
        renderHTML: (attributes) => {
          if (!attributes.href) return {};
          return { "data-href": attributes.href as string };
        },
      },
      filename: {
        default: "File",
        parseHTML: (element) => element.getAttribute("data-filename"),
        renderHTML: (attributes) => {
          return { "data-filename": attributes.filename as string };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-file-attachment]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        { "data-file-attachment": "" },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentNodeView);
  },
});
