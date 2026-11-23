ALTER TABLE "User" ADD COLUMN "bloodGroup" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_bloodGroup_check"
  CHECK ("bloodGroup" IS NULL OR "bloodGroup" IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));

CREATE TABLE "StudentFee" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL CHECK ("amountMinor" > 0),
  "dueDate" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentFee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentFee_requestId_key" ON "StudentFee"("requestId");
CREATE INDEX "StudentFee_userId_dueDate_idx" ON "StudentFee"("userId", "dueDate");
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FeePayment" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "feeId" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL CHECK ("amountMinor" > 0),
  "paidAt" TIMESTAMPTZ(3) NOT NULL,
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeePayment_requestId_key" ON "FeePayment"("requestId");
CREATE INDEX "FeePayment_feeId_paidAt_idx" ON "FeePayment"("feeId", "paidAt");
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeId_fkey"
  FOREIGN KEY ("feeId") REFERENCES "StudentFee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
