BEGIN;

ALTER TABLE "Comment" RENAME TO "comment";
ALTER TABLE "Operator" RENAME TO "operator";

ALTER TABLE "comment" RENAME CONSTRAINT "Comment_pkey" TO "comment_pkey";
ALTER TABLE "comment" RENAME CONSTRAINT "Comment_authorId_fkey" TO "comment_authorId_fkey";
ALTER TABLE "comment" RENAME CONSTRAINT "Comment_ticketId_fkey" TO "comment_ticketId_fkey";
ALTER TABLE "operator" RENAME CONSTRAINT "Operator_pkey" TO "operator_pkey";
ALTER TABLE "operator" RENAME CONSTRAINT "Operator_userId_fkey" TO "operator_userId_fkey";
ALTER INDEX "Operator_userId_key" RENAME TO "operator_userId_key";

COMMIT;
