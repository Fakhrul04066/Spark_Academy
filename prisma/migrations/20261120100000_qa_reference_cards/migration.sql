ALTER TABLE "AnonymousQuestion" ADD COLUMN "qaChapterId" TEXT REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "QaQuestionImage" (
  "attachmentId" TEXT PRIMARY KEY REFERENCES "AudioAttachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "questionId" TEXT NOT NULL REFERENCES "AnonymousQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "position" INTEGER NOT NULL
);
CREATE INDEX "QaQuestionImage_questionId_position_idx" ON "QaQuestionImage"("questionId", "position");

CREATE TABLE "QaQuestionSignal" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "questionId" TEXT NOT NULL REFERENCES "AnonymousQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sameDoubt" BOOLEAN NOT NULL DEFAULT false,
  "understood" BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY ("userId", "questionId")
);
CREATE INDEX "QaQuestionSignal_questionId_idx" ON "QaQuestionSignal"("questionId");
