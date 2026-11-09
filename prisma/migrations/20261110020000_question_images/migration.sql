ALTER TABLE "AnonymousQuestion" ADD COLUMN "imageId" TEXT;
CREATE UNIQUE INDEX "AnonymousQuestion_imageId_key" ON "AnonymousQuestion"("imageId");
ALTER TABLE "AnonymousQuestion" ADD CONSTRAINT "AnonymousQuestion_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "AudioAttachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
