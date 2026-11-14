import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import { SettingsLayout } from "~/components/SettingsLayout";
import ApiSettings from "~/views/settings/ApiSettings";

const ApiSettingsPage: NextPageWithLayout = () => {
  return (
    <SettingsLayout currentTab="api">
      <ApiSettings />
      <Popup />
    </SettingsLayout>
  );
};

ApiSettingsPage.getLayout = (page) => getDashboardLayout(page);

export default ApiSettingsPage;
