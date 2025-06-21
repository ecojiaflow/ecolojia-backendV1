"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
exports.createProductSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    slug: zod_1.z.string().min(1, "slug requis"),
    brand: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    images: zod_1.z.array(zod_1.z.string().url()).optional(),
    zones_dispo: zod_1.z.array(zod_1.z.string()).optional(),
    prices: zod_1.z.any().optional(),
    affiliate_url: zod_1.z.string().url().optional(),
    eco_score: zod_1.z.number().min(0).max(1).optional(),
    ai_confidence: zod_1.z.number().optional(),
    confidence_pct: zod_1.z.number().int().optional(),
    confidence_color: zod_1.z.enum(["green", "yellow", "red"]).optional(),
    verified_status: zod_1.z.string().optional(),
    resume_fr: zod_1.z.string().optional(),
    resume_en: zod_1.z.string().optional(),
    enriched_at: zod_1.z.string().datetime().optional(),
});
exports.updateProductSchema = exports.createProductSchema.partial();
