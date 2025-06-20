// src/services/eco-score.service.ts

import { prisma } from "../lib/prisma";
import type { Product } from "@prisma/client";
import deepSeekClient from "../lib/deepseek";

interface ProductAnalysis {
  title: string;
  description: string;
  brand?: string;
  category?: string;
  tags: string[];
}

interface EcoFields {
  eco_score: number;
  ai_confidence: number;
  confidence_pct: number;
}

/**
 * Recalcule tous les champs IA d'un produit :
 * - DeepSeek en priorité
 * - fallback heuristique si l'API est indisponible
 */
export async function recalculateEcoFields(product: Product): Promise<EcoFields> {
  try {
    const { eco_score, ai_confidence } = await deepSeekClient.calculate(product);
    return {
      eco_score,
      ai_confidence,
      confidence_pct: Math.round(ai_confidence * 100),
    };
  } catch (err) {
    console.warn("⚠️ DeepSeek indisponible – fallback heuristique activé.");

    const eco_score = calculateEcoScore({
      title: product.title,
      description: product.description ?? "",
      brand: (product as any).brand ?? "",
      category: (product as any).category ?? "",
      tags: product.tags ?? [],
    });

    return {
      eco_score,
      ai_confidence: 0.4,
      confidence_pct: 40,
    };
  }
}

/**
 * Recalcule et met à jour les champs IA d'un produit spécifique
 */
export async function updateProductEcoScore(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error(`Produit ${productId} introuvable`);

  const ecoFields = await recalculateEcoFields(product);

  await prisma.product.update({
    where: { id: productId },
    data: {
      ...ecoFields,
      enriched_at: new Date(),
    },
  });

  console.log(`✅ ${product.title} → ${Math.round(ecoFields.eco_score * 100)} %`);
}

/**
 * Recalcule les scores IA de tous les produits
 */
export async function updateAllEcoScores(): Promise<{ updated: number; errors: number }> {
  const products = await prisma.product.findMany({ select: { id: true } });

  let updated = 0;
  let errors = 0;

  for (const { id } of products) {
    try {
      await updateProductEcoScore(id);
      updated++;
    } catch (e) {
      console.error(`❌ Erreur produit ${id}:`, e);
      errors++;
    }
  }

  return { updated, errors };
}

/* ---------- Fallback heuristique ---------- */
export function calculateEcoScore(product: ProductAnalysis): number {
  const text = `${product.title} ${product.description} ${product.brand ?? ""} ${product.tags.join(" ")}`.toLowerCase();

  let score = 0.5;
  score += analyzeMaterials(text);
  score += analyzeCertifications(text);
  score += analyzeOrigin(text);
  score += analyzeDurability(text);
  score -= analyzePenalties(text);

  return Math.max(0, Math.min(1, score));
}

function analyzeMaterials(text: string): number {
  let s = 0;
  const excellent = ["bio", "biologique", "organic", "bambou", "chanvre", "lin", "coton bio", "recyclé", "upcyclé", "compostable", "biodégradable"];
  const good = ["naturel", "végétal", "bois", "liège", "fibres naturelles", "sans plastique", "zéro déchet", "réutilisable"];
  const ok = ["durable", "écologique", "responsable", "éthique", "local", "artisanal", "fait main"];

  excellent.forEach((m) => text.includes(m) && (s += 0.05));
  good.forEach((m) => text.includes(m) && (s += 0.03));
  ok.forEach((m) => text.includes(m) && (s += 0.01));

  return Math.min(0.3, s);
}

function analyzeCertifications(text: string): number {
  let s = 0;
  const certs = ["ecocert", "ab", "cosmebio", "natrue", "bdih", "usda organic", "demeter", "fair trade", "commerce équitable", "cradle to cradle", "fsc", "pefc", "eu ecolabel", "soil association", "cosmos", "icea"];

  certs.forEach((c) => text.includes(c) && (s += 0.04));
  const count = certs.filter((c) => text.includes(c)).length;
  if (count >= 2) s += 0.02;
  if (count >= 3) s += 0.02;

  return Math.min(0.2, s);
}

function analyzeOrigin(text: string): number {
  let s = 0;
  const veryLocal = ["france", "français", "made in france", "fabrication française", "artisan français", "produit français"];
  const local = ["europe", "européen", "local", "région", "artisanal", "circuit court", "proximité"];
  const ecoTransport = ["transport vert", "livraison écologique", "carbone neutre", "compensé carbone"];

  veryLocal.forEach((o) => text.includes(o) && (s += 0.05));
  local.forEach((o) => text.includes(o) && (s += 0.03));
  ecoTransport.forEach((o) => text.includes(o) && (s += 0.02));

  return Math.min(0.15, s);
}

function analyzeDurability(text: string): number {
  let s = 0;
  const kw = ["durable", "longue durée", "résistant", "qualité", "garantie", "réparable", "modulaire", "intemporel", "robuste", "solide", "longue vie"];

  kw.forEach((k) => text.includes(k) && (s += 0.015));

  return Math.min(0.1, s);
}

function analyzePenalties(text: string): number {
  let p = 0;
  const badMat = ["plastique", "polyester", "acrylique", "nylon", "pvc", "polystyrène", "pétrochimique"];
  const badPract = ["jetable", "usage unique", "suremballé", "non recyclable", "toxique", "chimique"];
  const distant = ["chine", "bangladesh", "vietnam", "importé", "transport longue distance"];

  badMat.forEach((m) => text.includes(m) && (p += 0.05));
  badPract.forEach((m) => text.includes(m) && (p += 0.03));
  distant.forEach((m) => text.includes(m) && (p += 0.02));

  return Math.min(0.25, p);
}
