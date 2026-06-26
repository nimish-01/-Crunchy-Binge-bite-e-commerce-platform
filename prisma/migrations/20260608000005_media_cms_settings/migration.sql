-- MediaAsset — central media library (Cloudinary assets)
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "resourceType" TEXT NOT NULL DEFAULT 'image',
    "format" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "folder" TEXT NOT NULL DEFAULT 'binge-bite',
    "altText" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaAsset_publicId_key" ON "MediaAsset"("publicId");

-- HeroSlide — homepage hero carousel entries (linked to MediaAsset)
CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "heading" TEXT NOT NULL DEFAULT '',
    "subheading" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "ctaText" TEXT NOT NULL DEFAULT '',
    "ctaLink" TEXT NOT NULL DEFAULT '',
    "mediaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "HeroSlide" ADD CONSTRAINT "HeroSlide_mediaId_fkey"
    FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- HomepageCMS — singleton row for homepage copy/visibility toggles
CREATE TABLE "HomepageCMS" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "heroBadge" TEXT NOT NULL DEFAULT '🌾 Premium Makhana — Roasted Fresh',
    "heroHeading" TEXT NOT NULL DEFAULT 'Snack Bold.',
    "heroSubheading" TEXT NOT NULL DEFAULT 'Stay Fit.',
    "heroDescription" TEXT NOT NULL DEFAULT 'Premium flavored makhana for the modern snacker. Zero guilt, maximum crunch, delivered to your door across India.',
    "ctaText" TEXT NOT NULL DEFAULT 'Shop Now',
    "ctaLink" TEXT NOT NULL DEFAULT '/products',
    "featuredTitle" TEXT NOT NULL DEFAULT 'Customer Favorites',
    "featuredBadge" TEXT NOT NULL DEFAULT 'Bestsellers',
    "trendingTitle" TEXT NOT NULL DEFAULT 'New Arrivals',
    "trendingBadge" TEXT NOT NULL DEFAULT 'Just In',
    "reviewsTitle" TEXT NOT NULL DEFAULT 'What Customers Say',
    "reviewsBadge" TEXT NOT NULL DEFAULT 'Reviews',
    "whyChooseTitle" TEXT NOT NULL DEFAULT 'Why Choose Us',
    "subscriptionTitle" TEXT NOT NULL DEFAULT 'Never Run Out Again',
    "subscriptionSubtext" TEXT NOT NULL DEFAULT 'Subscribe & save up to 15%. Pause, skip, or cancel anytime. No strings attached.',
    "subscriptionCtaText" TEXT NOT NULL DEFAULT 'Start Your Subscription',
    "subscriptionCtaLink" TEXT NOT NULL DEFAULT '/products',
    "showHero" BOOLEAN NOT NULL DEFAULT true,
    "showWhyChooseUs" BOOLEAN NOT NULL DEFAULT true,
    "showFeatured" BOOLEAN NOT NULL DEFAULT true,
    "showSubscription" BOOLEAN NOT NULL DEFAULT true,
    "showTrending" BOOLEAN NOT NULL DEFAULT true,
    "showReviews" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageCMS_pkey" PRIMARY KEY ("id")
);

-- HomepageQuote — customer testimonials displayed on homepage
CREATE TABLE "HomepageQuote" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageQuote_pkey" PRIMARY KEY ("id")
);

-- SiteSettings — singleton row for brand/contact/social/footer config
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "companyName" TEXT NOT NULL DEFAULT 'Binge Bite',
    "tagline" TEXT NOT NULL DEFAULT 'Premium flavored makhana, roasted to perfection.',
    "aboutText" TEXT NOT NULL DEFAULT '',
    "supportEmail" TEXT NOT NULL DEFAULT '',
    "supportPhone" TEXT NOT NULL DEFAULT '',
    "whatsappNumber" TEXT NOT NULL DEFAULT '',
    "facebook" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "linkedin" TEXT NOT NULL DEFAULT '',
    "twitter" TEXT NOT NULL DEFAULT '',
    "youtube" TEXT NOT NULL DEFAULT '',
    "footerText" TEXT NOT NULL DEFAULT 'Premium flavored makhana. Roasted to perfection, seasoned with love. Guilt-free snacking for modern India.',
    "copyrightText" TEXT NOT NULL DEFAULT '',
    "gstNumber" TEXT NOT NULL DEFAULT '',
    "businessAddress" TEXT NOT NULL DEFAULT '',
    "googleMapsLink" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
