import Dashboard from "~/components/Dashboard";
import Popup from "~/components/Popup";
import { WorkspaceProvider } from "~/providers/workspace";
import CardView, { CardRightPanel } from "~/views/card";

export default function CardPage() {
  return (
    <WorkspaceProvider>
      <Dashboard hasRightPanel rightPanel={<CardRightPanel />}>
        <CardView />
      </Dashboard>
      <Popup />
    </WorkspaceProvider>
  );
}
