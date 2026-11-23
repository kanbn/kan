import { notFoundForUnknownWorkspace } from "~/utils/workspace-not-found";
import PublicBoardsView from "~/views/public/boards";

export const getServerSideProps = notFoundForUnknownWorkspace;

export default function PublicBoardsPage() {
  return <PublicBoardsView />;
}
