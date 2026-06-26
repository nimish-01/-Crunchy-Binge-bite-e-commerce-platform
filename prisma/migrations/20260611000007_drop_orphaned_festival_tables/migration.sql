-- Drop orphaned tables from a scrapped Festival Theme phase.
-- These were created via db push and never had migration files.
-- No code references them; removing to restore zero schema drift.

-- DropForeignKey
ALTER TABLE "FestivalOffer" DROP CONSTRAINT "FestivalOffer_bannerId_fkey";
ALTER TABLE "FestivalOffer" DROP CONSTRAINT "FestivalOffer_themeId_fkey";
ALTER TABLE "ThemeBanner" DROP CONSTRAINT "ThemeBanner_mediaId_fkey";
ALTER TABLE "ThemeBanner" DROP CONSTRAINT "ThemeBanner_themeId_fkey";
ALTER TABLE "ThemeHeroSlide" DROP CONSTRAINT "ThemeHeroSlide_mediaId_fkey";
ALTER TABLE "ThemeHeroSlide" DROP CONSTRAINT "ThemeHeroSlide_themeId_fkey";

-- DropTable
DROP TABLE "FestivalOffer";
DROP TABLE "FestivalTheme";
DROP TABLE "ThemeBanner";
DROP TABLE "ThemeHeroSlide";
