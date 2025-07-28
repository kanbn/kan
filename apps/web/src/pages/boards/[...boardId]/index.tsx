import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import BoardView from "~/views/board";

const BoardPage: NextPageWithLayout = () => {
  return (
    <>
      <BoardView />
      <Popup />
    </>
  );
};

BoardPage.getLayout = (page) => getDashboardLayout(page);

export default BoardPage;
