import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import BoardMembersView from "~/views/board/members";

const BoardMembersPage: NextPageWithLayout = () => {
  return (
    <>
      <BoardMembersView />
      <Popup />
    </>
  );
};

BoardMembersPage.getLayout = (page) => getDashboardLayout(page);

export default BoardMembersPage;
