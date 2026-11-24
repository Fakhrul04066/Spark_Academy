CREATE TABLE "TeacherClassRecord" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classNumber" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "adminComment" TEXT NOT NULL DEFAULT '',
    "paid" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TeacherClassRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TeacherClassRecord_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeacherClassRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeacherClassRecord_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TeacherClassRecord_teacherId_batchId_subjectId_classNumber_key"
    ON "TeacherClassRecord"("teacherId", "batchId", "subjectId", "classNumber");
CREATE INDEX "TeacherClassRecord_teacherId_date_idx" ON "TeacherClassRecord"("teacherId", "date");
CREATE INDEX "TeacherClassRecord_date_idx" ON "TeacherClassRecord"("date");
