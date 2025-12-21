import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import YouTubeCard from "./YouTubeCard";
import { extractVideoId } from "./utils";

export default function YouTubeNodeView({
  node,
  editor,
  getPos,
  deleteNode,
  updateAttributes,
}: NodeViewProps) {
  const { videoId, title, url, showEmbed } = node.attrs as {
    videoId: string;
    title: string;
    url: string;
    showEmbed: boolean;
  };

  const handleConvertToLink = () => {
    const pos = getPos();
    if (typeof pos !== "number") return;

    const linkContent = {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: url,
          marks: [
            {
              type: "link",
              attrs: {
                href: url,
                target: "_blank",
              },
            },
          ],
        },
      ],
    };

    editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .insertContentAt(pos, linkContent)
      .run();
  };

  const handleDelete = () => {
    deleteNode();
  };

  const handleUpdate = (newUrl: string, newTitle: string) => {
    if (newUrl !== url) {
      const newVideoId = extractVideoId(newUrl);
      updateAttributes({
        url: newUrl,
        title: newTitle,
        videoId: newVideoId,
      });
    } else {
      updateAttributes({ title: newTitle });
    }
  };

  return (
    <NodeViewWrapper>
      <YouTubeCard
        videoId={videoId}
        url={url}
        title={title}
        showEmbed={showEmbed}
        onConvertToLink={handleConvertToLink}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </NodeViewWrapper>
  );
}

