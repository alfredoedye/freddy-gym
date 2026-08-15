-- CreateEnum
CREATE TYPE "FontSize" AS ENUM ('NORMAL', 'LARGE', 'EXTRA_LARGE');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "fontSize" "FontSize" NOT NULL DEFAULT 'NORMAL';
