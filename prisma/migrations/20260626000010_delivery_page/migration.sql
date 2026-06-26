-- Add delivery celebration page config to SiteSettings
ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "deliveryHeadline"    TEXT    NOT NULL DEFAULT 'Your order has been delivered! 🎉',
  ADD COLUMN IF NOT EXISTS "deliveryMessage"     TEXT    NOT NULL DEFAULT 'We hope you love your Binge Bite snacks. Come back for more goodness!',
  ADD COLUMN IF NOT EXISTS "deliveryAnimation"   TEXT    NOT NULL DEFAULT 'CONFETTI',
  ADD COLUMN IF NOT EXISTS "deliveryShowRating"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "deliveryShowReorder" BOOLEAN NOT NULL DEFAULT true;
