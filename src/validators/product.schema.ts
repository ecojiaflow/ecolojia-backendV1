import { z } from "zod";

export const createProductSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  slug: z.string().min(1, "slug requis"),
  brand: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string().url()).optional(),
  zones_dispo: z.array(z.string()).optional(),
  prices: z.any().optional(),
  affiliate_url: z.string().url().optional(),
  eco_score: z.number().min(0).max(1).optional(),
  ai_confidence: z.number().optional(),
  confidence_pct: z.number().int().optional(),
  confidence_color: z.enum(["green", "yellow", "red"]).optional(),
  verified_status: z.string().optional(),
  resume_fr: z.string().optional(),
  resume_en: z.string().optional(),
  enriched_at: z.string().datetime().optional(),
});

export const updateProductSchema = createProductSchema.partial();
