import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import CircularProgress from "~/components/CircularProgress";
import LabelIcon from "~/components/LabelIcon";
import { getAvatarUrl } from "~/utils/helpers";

const Card = ({
  title,
  labels,
  members,
  checklists,
}: {
  title: string;
  labels: { name: string; colourCode: string | null }[];
  members: {
    publicId: string;
    email: string;
    user: { name: string | null; email: string; image: string | null } | null;
  }[];
  checklists: {
    publicId: string;
    name: string;
    items: {
      publicId: string;
      title: string;
      completed: boolean;
      index: number;
    }[];
  }[];
}) => {
  const completedItems = checklists.reduce((acc, checklist) => {
    return acc + checklist.items.filter((item) => item.completed).length;
  }, 0);

  const totalItems = checklists.reduce((acc, checklist) => {
    return acc + checklist.items.length;
  }, 0);

  const progress =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="flex flex-col rounded-md border border-light-200 bg-light-50 px-3 py-2 text-sm text-neutral-900 dark:border-dark-200 dark:bg-dark-200 dark:text-dark-1000 dark:hover:bg-dark-300">
      <span>{title}</span>
      {labels.length || members.length || checklists.length > 0 ? (
        <div className="mt-2 flex flex-col justify-end">
          <div className="space-x-0.5">
            {labels.map((label) => (
              <Badge
                value={label.name}
                iconLeft={<LabelIcon colourCode={label.colourCode} />}
              />
            ))}
          </div>
          <div className="flex items-center justify-end gap-1">
            {checklists.length > 0 && (
              <div className="flex items-center gap-1 rounded-full border-[1px] border-light-300 px-2 py-1 dark:border-dark-600">
                <CircularProgress
                  progress={progress || 2}
                  size="sm"
                  className="flex-shrink-0"
                />
                <span className="text-[10px] text-light-900 dark:text-dark-950">
                  {completedItems}/{totalItems}
                </span>
              </div>
            )}
            {members.length > 0 && (
              <div className="isolate flex justify-end -space-x-1 overflow-hidden">
                {members.map(({ user, email }) => {
                  const avatarUrl = user?.image
                    ? getAvatarUrl(user.image)
                    : undefined;

                  return (
                    <Avatar
                      name={user?.name ?? ""}
                      email={user?.email ?? email}
                      imageUrl={avatarUrl}
                      size="sm"
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Card;
