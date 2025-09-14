import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import IntegrationsSettings from "~/views/settings/IntegrationsSettings";

const IntegrationsSettingsPage: NextPageWithLayout = () => {
  return (
    <SettingsLayout currentTab="integrations">
      <IntegrationsSettings />
    </SettingsLayout>
  );
};

IntegrationsSettingsPage.getLayout = (page) => getDashboardLayout(page);

export default IntegrationsSettingsPage;
