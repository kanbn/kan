import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import IntegrationsSettings from "~/views/settings/IntegrationsSettings";
import Popup from "~/components/Popup";

const IntegrationsSettingsPage: NextPageWithLayout = () => {
  return (
    <SettingsLayout currentTab="integrations">
      <IntegrationsSettings />
      <Popup />
    </SettingsLayout>
  );
};

IntegrationsSettingsPage.getLayout = (page) => getDashboardLayout(page);

export default IntegrationsSettingsPage;
