import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import BillingSettings from "~/views/settings/BillingSettings";
import Popup from "~/components/Popup";

const BillingSettingsPage: NextPageWithLayout = () => {
  return (
    <SettingsLayout currentTab="billing">
      <BillingSettings />
      <Popup />
    </SettingsLayout>
  );
};

BillingSettingsPage.getLayout = (page) => getDashboardLayout(page);

export default BillingSettingsPage;
