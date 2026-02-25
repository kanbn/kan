import { useRouter } from "next/router";
import { getDashboardLayout } from "~/components/Dashboard";
import { ArchivedDeletedLayout } from "~/components/ArchivedDeletedLayout";
import ArchivedCardsView from "~/views/board/ArchivedCardsView";
import type { NextPageWithLayout } from "~/pages/_app";

const ArchivedCardsPage: NextPageWithLayout = () => {
    const router = useRouter();
    const boardPublicId = router.query.boardPublicId as string;

    return (
        <ArchivedDeletedLayout currentTab="archived" boardPublicId={boardPublicId}>
            {boardPublicId && <ArchivedCardsView boardPublicId={boardPublicId} />}
        </ArchivedDeletedLayout>
    );
};

ArchivedCardsPage.getLayout = (page) => getDashboardLayout(page);

export default ArchivedCardsPage;
