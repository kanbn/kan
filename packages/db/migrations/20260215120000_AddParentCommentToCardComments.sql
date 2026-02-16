ALTER TABLE "card_comments"
ADD COLUMN "parentCommentPublicId" varchar(12);

ALTER TABLE "card_comments"
ADD CONSTRAINT "card_comments_parentCommentPublicId_fkey"
FOREIGN KEY ("parentCommentPublicId")
REFERENCES "card_comments" ("publicId")
ON DELETE SET NULL;
