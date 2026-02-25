import { useRouter } from "next/router";
import { getDashboardLayout } from "~/components/Dashboard";
import { ArchivedDeletedLayout } from "~/components/ArchivedDeletedLayout";
import DeletedCardsView from "~/views/board/DeletedCardsView";
import type { NextPageWithLayout } from "~/pages/_app";

const DeletedCardsPage: NextPageWithLayout = () => {
    const router = useRouter();
    const boardPublicId = router.query.boardPublicId as string;

    return (
        <ArchivedDeletedLayout currentTab="deleted" boardPublicId={boardPublicId}>
            {boardPublicId && <DeletedCardsView boardPublicId={boardPublicId} />}
        </ArchivedDeletedLayout>
    );
};

DeletedCardsPage.getLayout = (page) => getDashboardLayout(page);

export default DeletedCardsPage;
