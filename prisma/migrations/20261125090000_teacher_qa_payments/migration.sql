ALTER TABLE "QuestionReply" ADD COLUMN "teacherPaid" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "QuestionReply_userId_idx" ON "QuestionReply"("userId");
CREATE INDEX "QuestionReply_questionId_createdAt_id_idx" ON "QuestionReply"("questionId", "createdAt", "id");
