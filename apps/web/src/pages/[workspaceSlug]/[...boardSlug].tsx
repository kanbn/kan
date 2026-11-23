import { notFoundForUnknownWorkspace } from "~/utils/workspace-not-found";
import PublicBoardView from "~/views/public/board";

export const getServerSideProps = notFoundForUnknownWorkspace;

export default function PublicBoardsPage() {
  return <PublicBoardView />;
}
