CREATE TABLE "QaDiscussionComment" (
  "id" TEXT PRIMARY KEY,
  "questionId" TEXT NOT NULL REFERENCES "AnonymousQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "QaDiscussionComment_questionId_createdAt_idx" ON "QaDiscussionComment"("questionId", "createdAt");

CREATE TABLE "QaThreadFollowUp" (
  "id" TEXT PRIMARY KEY,
  "questionId" TEXT NOT NULL REFERENCES "AnonymousQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "text" TEXT NOT NULL,
  "answer" TEXT,
  "answeredAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "QaThreadFollowUp_questionId_answeredAt_idx" ON "QaThreadFollowUp"("questionId", "answeredAt");
CREATE INDEX "QaThreadFollowUp_userId_createdAt_idx" ON "QaThreadFollowUp"("userId", "createdAt");
