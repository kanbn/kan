import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import YouTubeNodeView from "./YouTubeNodeView";
import { extractVideoId, fetchYouTubeMetadata, isYouTubeUrl } from "./utils";

export interface YouTubeOptions {
  inline: boolean;
  HTMLAttributes: Record<string, undefined>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    youTube: {
      setYouTubeEmbed: (options: {
        videoId: string;
        url: string;
        title: string;
        thumbnailUrl?: string;
        showEmbed?: boolean;
      }) => ReturnType;
    };
  }
}

export const YouTubeNode = Node.create<YouTubeOptions>({
  name: "youtube",
  group: "block",
  atom: true,
  addOptions() {
    return {
      inline: false,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      videoId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-video-id"),
        renderHTML: (attributes) => {
          if (!attributes.videoId) return {};
          return { "data-video-id": attributes.videoId as string };
        },
      },
      url: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-url"),
        renderHTML: (attributes) => {
          if (!attributes.url) return {};
          return { "data-url": attributes.url as string };
        },
      },
      title: {
        default: "YouTube Video",
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attributes) => {
          return { "data-title": attributes.title as string };
        },
      },
      thumbnailUrl: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-thumbnail"),
        renderHTML: (attributes) => {
          if (!attributes.thumbnailUrl) return {};
          return { "data-thumbnail": attributes.thumbnailUrl as string };
        },
      },
      showEmbed: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-show-embed"),
        renderHTML: (attributes) => {
          return { "data-show-embed": attributes.showEmbed as string };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-youtube]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        { "data-youtube": "" },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YouTubeNodeView);
  },

  addProseMirrorPlugins() {
    const nodeType = this.type;

    return [
      new Plugin({
        key: new PluginKey("youtubePaste"),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain");
            if (!text) return false;

            // Check if the pasted text is a YouTube URL
            const youtubeRegex =
              /(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/;
            const match = youtubeRegex.exec(text);

            if (!match || !isYouTubeUrl(text)) return false;

            const videoId = extractVideoId(text);
            if (!videoId) return false;

            const { state, dispatch } = view;
            const { tr } = state;

            const node = nodeType.create({
              videoId,
              url: text,
              title: "Loading...",
              showEmbed: true,
            });

            tr.replaceSelectionWith(node);
            dispatch(tr);

            // Fetch metadata asynchronously and update the node
            void fetchYouTubeMetadata(text).then((metadata) => {
              const { state: newState, dispatch: newDispatch } = view;
              const { tr: newTr } = newState;

              newState.doc.descendants((n, pos) => {
                if (
                  n.type.name === "youtube" &&
                  n.attrs.videoId === videoId &&
                  n.attrs.title === "Loading..."
                ) {
                  newTr.setNodeMarkup(pos, undefined, {
                    ...n.attrs,
                    title: metadata?.title ?? "YouTube Video",
                    thumbnailUrl: metadata?.thumbnail_url ?? null,
                  });
                  return false;
                }
                return true;
              });

              if (newTr.docChanged) {
                newDispatch(newTr);
              }
            });

            return true;
          },
        },
      }),
    ];
  },

  // commands for the YouTube embed node
  addCommands() {
    return {
      setYouTubeEmbed:
        (options: {
          videoId: string;
          url: string;
          title?: string;
          thumbnailUrl?: string;
          showEmbed?: boolean;
        }) =>
        ({ editor }) => {
          return editor.commands.insertContent({
            type: this.name,
            attrs: {
              videoId: options.videoId,
              url: options.url,
              title: options.title ?? "YouTube Video",
              thumbnailUrl: options.thumbnailUrl,
              showEmbed: options.showEmbed ?? true,
            },
          });
        },
    };
  },
});
