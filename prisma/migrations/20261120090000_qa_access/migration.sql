CREATE TYPE "QaAccessKind" AS ENUM ('PAID_STUDENT', 'QNA_ONLY');

CREATE TABLE "QaAccess" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "batchId" TEXT NOT NULL REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind" "QaAccessKind" NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  PRIMARY KEY ("userId", "batchId", "kind")
);

ALTER TABLE "AnonymousQuestion" ADD COLUMN "shareWithClass" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "AnonymousQuestion_userId_createdAt_idx" ON "AnonymousQuestion"("userId", "createdAt");

CREATE TABLE "QaBookmark" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "questionId" TEXT NOT NULL REFERENCES "AnonymousQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY ("userId", "questionId")
);
