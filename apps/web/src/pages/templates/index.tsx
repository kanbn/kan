import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import TemplatesView from "~/views/templates";

const TemplatesPage: NextPageWithLayout = () => {
  return (
    <>
      <TemplatesView />
      <Popup />
    </>
  );
};

TemplatesPage.getLayout = (page) => getDashboardLayout(page);

export default TemplatesPage;
