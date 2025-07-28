import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import SettingsView from "~/views/settings";

const SettingsPage: NextPageWithLayout = () => {
  return (
    <>
      <SettingsView />
      <Popup />
    </>
  );
};

SettingsPage.getLayout = (page) => getDashboardLayout(page);

export default SettingsPage;
