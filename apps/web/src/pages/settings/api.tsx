import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import ApiSettings from "~/views/settings/ApiSettings";
import Popup from "~/components/Popup";

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
