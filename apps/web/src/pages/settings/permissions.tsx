import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import Popup from "~/components/Popup";
import PermissionsSettings from "~/views/settings/PermissionsSettings";

const PermissionsSettingsPage: NextPageWithLayout = () => {
  return (
    <>
      <SettingsLayout currentTab="permissions">
        <PermissionsSettings />
        <Popup />
      </SettingsLayout>
      
    </>
  );
};

PermissionsSettingsPage.getLayout = (page) => getDashboardLayout(page);

export default PermissionsSettingsPage;


