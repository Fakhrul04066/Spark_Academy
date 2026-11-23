CREATE TABLE "SignupVerification" (
    "email" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "SignupVerification_pkey" PRIMARY KEY ("email")
);

CREATE INDEX "SignupVerification_expiresAt_idx" ON "SignupVerification"("expiresAt");
