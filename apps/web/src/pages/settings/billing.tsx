import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import BillingSettings from "~/views/settings/BillingSettings";

const BillingSettingsPage: NextPageWithLayout = () => {
  return (
    <SettingsLayout currentTab="billing">
      <BillingSettings />
    </SettingsLayout>
  );
};

BillingSettingsPage.getLayout = (page) => getDashboardLayout(page);

export default BillingSettingsPage;
