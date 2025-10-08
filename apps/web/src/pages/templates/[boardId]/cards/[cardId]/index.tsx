import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import CardView, { CardRightPanel } from "~/views/card";

const CardPage: NextPageWithLayout = () => {
  return (
    <>
      <CardView isTemplate />
      <Popup />
    </>
  );
};

CardPage.getLayout = (page) =>
  getDashboardLayout(page, <CardRightPanel isTemplate />, true);

export default CardPage;
