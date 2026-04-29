import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import AllBoardsView from "~/views/all-boards";

const AllBoards: NextPageWithLayout = () => {
  return <AllBoardsView />;
};

AllBoards.getLayout = (page) => getDashboardLayout(page);

export default AllBoards;
