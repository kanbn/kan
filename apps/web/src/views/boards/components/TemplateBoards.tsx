import { t } from "@lingui/core/macro";
import { useEffect, useRef, useState } from "react";
import { HiCheckCircle } from "react-icons/hi2";

export interface Template {
  id: string;
  sourceBoardPublicId?: string;
  name: string;
  lists: string[];
  labels: string[];
}

export const getTemplates = (): Template[] => [
  {
    id: "basic",
    name: t`Basic Kanban`,
    lists: [t`To Do`, t`In Progress`, t`Done`],
    labels: [t`High Priority`, t`Medium Priority`, t`Low Priority`],
  },
  {
    id: "software-dev",
    name: t`Software Development`,
    lists: [t`Backlog`, t`To Do`, t`In Progress`, t`Code Review`, t`Done`],
    labels: [t`Bug`, t`Feature`, t`Enhancement`, t`Critical`, t`Documentation`],
  },
  {
    id: "roadmap-basic",
    name: t`Basic Roadmap`,
    lists: [t`Requested`, t`Planned`, t`In Progress`, t`Done`],
    labels: [t`Feature`, t`Enhancement`, t`Critical`, t`Documentation`],
  },
  {
    id: "roadmap-extended",
    name: t`Extended Roadmap`,
    lists: [t`Requested`, t`Under Review`, t`Planned`, t`In Progress`, t`Done`, t`Rejected`],
    labels: [t`Feature`, t`Enhancement`, t`Critical`, t`Documentation`],
  },
  {
    id: "content-creation",
    name: t`Content Creation`,
    lists: [
      t`Brainstorming`,
      t`Writing`,
      t`Editing`,
      t`Design`,
      t`Approval`,
      t`Publishing`,
      t`Done`,
    ],
    labels: [t`Blog Post`, t`Social Media`, t`Video`, t`Newsletter`, t`Urgent`],
  },
  {
    id: "customer-support",
    name: t`Customer Support`,
    lists: [
      t`New Ticket`,
      t`Triaging`,
      t`In Progress`,
      t`Awaiting Customer`,
      t`Resolution`,
      t`Done`,
    ],
    labels: [
      t`Bug Report`,
      t`Feature Request`,
      t`Question`,
      t`Urgent`,
      t`Billing`,
    ],
  },
  {
    id: "recruitment",
    name: t`Recruitment`,
    lists: [
      t`Applicants`,
      t`Screening`,
      t`Interviewing`,
      t`Offer`,
      t`Onboarding`,
      t`Hired`,
    ],
    labels: [t`Remote`, t`Full-time`, t`Part-time`, t`Senior`, t`Junior`],
  },
  {
    id: "personal-project",
    name: t`Personal Project`,
    lists: [
      t`Ideas`,
      t`Research`,
      t`Planning`,
      t`Execution`,
      t`Review`,
      t`Next Steps`,
      t`Complete`,
    ],
    labels: [t`Important`, t`Quick Win`, t`Long-term`, t`Learning`, t`Fun`],
  },
];

export default function TemplateBoards({
  currentBoard,
  setCurrentBoard,
  showTemplates,
  customTemplates,
}: {
  currentBoard: Template | null;
  setCurrentBoard: (board: Template | null) => void;
  showTemplates: boolean;
  customTemplates: Template[] | null;
}) {
  const [showFade, setShowFade] = useState(false);
  const [showTopFade, setShowTopFade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const templates = [...(customTemplates ?? []), ...getTemplates()];

  const handleScroll = () => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
    const isAtTop = scrollTop <= 5;

    setShowFade(!isAtBottom);
    setShowTopFade(!isAtTop);
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    handleScroll();

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [showTemplates]);

  useEffect(() => {
    if (showTemplates && currentBoard && scrollRef.current) {
      const selectedElement = scrollRef.current.querySelector(
        `[data-template-id="${currentBoard.id}"]`,
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [showTemplates, currentBoard]);

  const handleBoardSelect = (boardId: string) => {
    if (currentBoard?.id === boardId) {
      setCurrentBoard(null);
    } else {
      setCurrentBoard(
        templates.find((template) => template.id === boardId) ?? null,
      );
    }
  };

  if (!showTemplates) {
    return null;
  }

  return (
    <div className="px-5 pt-4">
      <div className="relative">
        <div
          ref={scrollRef}
          className="scroll-container -mr-2 flex max-h-[200px] flex-col gap-3 overflow-y-auto pr-2 pt-0.5"
        >
          {templates.map((template) => (
            <label
              key={template.id}
              data-template-id={template.id}
              onClick={() => handleBoardSelect(template.id)}
              className={`scroll-container relative flex cursor-pointer rounded-lg border p-3 transition-all hover:bg-light-100 dark:hover:bg-dark-200 ${
                currentBoard?.id === template.id
                  ? "border-light-700 bg-light-100 ring-1 ring-inset ring-light-700 dark:border-dark-700 dark:bg-dark-200 dark:ring-dark-700"
                  : "border-light-600 dark:border-dark-600"
              }`}
            >
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {template.name}
                </h4>
                <p className="text-xs text-light-950 dark:text-dark-900">
                  {template.lists.join(", ")}
                </p>
              </div>
              {currentBoard?.id === template.id && (
                <div className="absolute right-3 top-3 text-light-1000 dark:text-dark-1000">
                  <HiCheckCircle className="h-5 w-5" />
                </div>
              )}
            </label>
          ))}
        </div>
        {showTopFade && (
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-6 bg-gradient-to-b from-white/80 to-transparent dark:from-dark-100/80" />
        )}
        {showFade && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/80 to-transparent dark:from-dark-100/80" />
        )}
      </div>
    </div>
  );
}
