import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import WebhookSettings from "~/views/settings/WebhookSettings";

const WebhookSettingsPage: NextPageWithLayout = () => {
  return (
    <SettingsLayout currentTab="webhooks">
      <WebhookSettings />
    </SettingsLayout>
  );
};

WebhookSettingsPage.getLayout = (page) => getDashboardLayout(page);

export default WebhookSettingsPage;
