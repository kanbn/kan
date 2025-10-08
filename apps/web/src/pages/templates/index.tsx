import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import BoardsView from "~/views/boards";

const TemplatesPage: NextPageWithLayout = () => {
  return (
    <>
      <BoardsView isTemplate />
      <Popup />
    </>
  );
};

TemplatesPage.getLayout = (page) => getDashboardLayout(page);

export default TemplatesPage;
