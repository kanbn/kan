import YouTubeDropdown from "./YouTubeDropdown";

interface YouTubeCardProps {
  videoId: string;
  url: string;
  title: string;
  showEmbed?: boolean;
  onConvertToLink: () => void;
  onDelete: () => void;
  onUpdate: (url: string, title: string) => void;
}

const YouTubeCard = ({
  videoId,
  url,
  title,
  showEmbed = true,
  onConvertToLink,
  onDelete,
  onUpdate,
}: YouTubeCardProps) => {
  return (
    <div className="w-full max-w-md rounded-lg border border-light-300 bg-light-50 dark:border-dark-300 dark:bg-dark-50">
      <div className="flex items-center justify-between gap-6 p-0 px-6">
        <h3 className="truncate text-sm font-medium">{title}</h3>
        <div className="mt-3">
          <YouTubeDropdown
            url={url}
            title={title}
            onConvertToLink={onConvertToLink}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        </div>
      </div>

      {showEmbed && videoId && (
        <div className="p-6 pt-1">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
            title={title}
            className="aspect-video w-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
};

export default YouTubeCard;
