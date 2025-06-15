-- Création de la table Partner
CREATE TABLE "Partner" (
  "id"         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       TEXT         NOT NULL,
  "website"    TEXT,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Création de la table PartnerLink
CREATE TABLE "PartnerLink" (
  "id"         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "url"        TEXT         NOT NULL,
  "clicks"     INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "partnerId"  UUID,
  "productId"  TEXT,
  CONSTRAINT "fk_partner" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL,
  CONSTRAINT "fk_product" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL
);

-- Index pour les relations
CREATE INDEX "idx_partnerLink_partnerId" ON "PartnerLink"("partnerId");
CREATE INDEX "idx_partnerLink_productId" ON "PartnerLink"("productId");
