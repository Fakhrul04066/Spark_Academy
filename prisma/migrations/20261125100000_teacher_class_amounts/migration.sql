ALTER TABLE "TeacherClassRecord" ADD COLUMN "amountMinor" INTEGER NOT NULL DEFAULT 2500;
ALTER TABLE "TeacherClassRecord" ALTER COLUMN "amountMinor" DROP DEFAULT;
ALTER TABLE "TeacherClassRecord" ADD CONSTRAINT "TeacherClassRecord_amountMinor_check"
  CHECK ("amountMinor" BETWEEN 0 AND 100000000);
