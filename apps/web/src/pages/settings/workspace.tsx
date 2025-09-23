import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import { SettingsLayout } from "~/components/SettingsLayout";
import WorkspaceSettings from "~/views/settings/WorkspaceSettings";

const WorkspaceSettingsPage: NextPageWithLayout = () => {
  return (
    <SettingsLayout currentTab="workspace">
      <WorkspaceSettings />
    </SettingsLayout>
  );
};

WorkspaceSettingsPage.getLayout = (page) => getDashboardLayout(page);

export default WorkspaceSettingsPage;
