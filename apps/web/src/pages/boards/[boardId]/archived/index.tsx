import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import ArchivedCardsView from "~/views/board/archived";

const ArchivedCardsPage: NextPageWithLayout = () => {
  return (
    <>
      <ArchivedCardsView />
      <Popup />
    </>
  );
};

ArchivedCardsPage.getLayout = (page) => getDashboardLayout(page);

export default ArchivedCardsPage;
