ALTER TABLE "User" ADD COLUMN "teacherCode" TEXT;
CREATE UNIQUE INDEX "User_teacherCode_key" ON "User"("teacherCode");
