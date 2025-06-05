import { HiCheckCircle } from "react-icons/hi2";

export type Template = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

const templates: Template[] = [
  {
    id: 'basic',
    name: 'Basic Kanban',
    description: 'To Do, In Progress, Done',
    icon: '📋',
  },
  {
    id: 'software-dev',
    name: 'Software Development',
    description: 'Backlog, To Do, In Progress, Code Review, Done',
    icon: '💻',
  },
  {
    id: 'content-creation',
    name: 'Content Creation',
    description: 'Brainstorming, Writing, Editing, Design, Approval, Publishing, Done',
    icon: '✍️',
  },
  {
    id: 'customer-support',
    name: 'Customer Support',
    description: 'New Ticket, Triaging, In Progress, Awaiting Customer, Resolution, Done',
    icon: '📞',
  },
  {
    id: 'recruitment',
    name: 'Recruitment',
    description: 'Applicants, Screening, Interviewing, Offer, Onboarding, Hired',
    icon: '👥',
  },
  {
    id: 'personal-project',
    name: 'Personal Project',
    description: 'Ideas, Research, Planning, Execution, Review, Next Steps, Complete',
    icon: '💡',
  },
];

export default function TemplateBoards({
  currentBoard,
  setCurrentBoard,
}: {
  currentBoard: Template | null;
  setCurrentBoard: (board: Template | null) => void;
}) {
  const handleBoardSelect = (boardId: string) => {
    if (currentBoard?.id === boardId) {
      setCurrentBoard(null);
    } else {
      setCurrentBoard(
        templates.find((template) => template.id === boardId) ?? null,
      );
    }
  };

  return (
    <div className="px-5 pt-4">
      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">Pick a template</h3>
      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 -mr-2 scroll-container">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleBoardSelect(template.id)}
            className={`relative flex cursor-pointer rounded-lg border p-3 transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 scroll-container ${currentBoard?.id === template.id
              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700'
              }`}
          >
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl dark:bg-blue-900/30">
              {template.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {template.name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {template.description}
              </p>
            </div>
            {currentBoard?.id === template.id && (
              <div className="absolute right-3 top-3 text-blue-500">
                <HiCheckCircle className="h-5 w-5" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}