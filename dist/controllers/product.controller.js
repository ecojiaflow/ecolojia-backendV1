"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductStats = exports.searchProducts = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductBySlug = exports.getAllProducts = void 0;
const prisma_1 = require("../lib/prisma");
/**
 * Convertit les décimaux Prisma en `number`
 */
function sanitizeProduct(product) {
    return {
        ...product,
        eco_score: product.eco_score ? Number(product.eco_score) : null,
        ai_confidence: product.ai_confidence ? Number(product.ai_confidence) : null
    };
}
const getAllProducts = async (req, res) => {
    const products = await prisma_1.prisma.product.findMany({
        orderBy: { updated_at: "desc" },
        take: 50
    });
    const sanitized = products.map(sanitizeProduct);
    res.json(sanitized);
};
exports.getAllProducts = getAllProducts;
const getProductBySlug = async (req, res) => {
    const { slug } = req.params;
    const product = await prisma_1.prisma.product.findUnique({
        where: { slug }
    });
    if (!product) {
        return res.status(404).json({ error: "Produit non trouvé" });
    }
    res.json(sanitizeProduct(product));
};
exports.getProductBySlug = getProductBySlug;
const createProduct = async (req, res) => {
    const data = req.body;
    const product = await prisma_1.prisma.product.create({
        data
    });
    res.status(201).json(sanitizeProduct(product));
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const product = await prisma_1.prisma.product.update({
        where: { id },
        data
    });
    res.json(sanitizeProduct(product));
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    await prisma_1.prisma.product.delete({
        where: { id }
    });
    res.status(204).send();
};
exports.deleteProduct = deleteProduct;
const searchProducts = async (req, res) => {
    const { q = "", category = "", min_score = "0", max_score = "1" } = req.query;
    const products = await prisma_1.prisma.product.findMany({
        where: {
            title: { contains: q, mode: "insensitive" },
            category: category || undefined,
            eco_score: {
                gte: parseFloat(min_score),
                lte: parseFloat(max_score)
            }
        },
        orderBy: { updated_at: "desc" },
        take: 50
    });
    const sanitized = products.map(sanitizeProduct);
    res.json({
        products: sanitized,
        count: sanitized.length,
        filters: {
            q,
            category,
            min_score: parseFloat(min_score),
            max_score: parseFloat(max_score)
        }
    });
};
exports.searchProducts = searchProducts;
const getProductStats = async (req, res) => {
    const total = await prisma_1.prisma.product.count();
    const average = await prisma_1.prisma.product.aggregate({
        _avg: {
            eco_score: true
        }
    });
    const categories = await prisma_1.prisma.product.groupBy({
        by: ["category"],
        _count: { category: true },
        orderBy: { _count: { category: "desc" } }
    });
    const top = await prisma_1.prisma.product.findMany({
        orderBy: { eco_score: "desc" },
        take: 5
    });
    res.json({
        total_products: total,
        average_eco_score: average._avg.eco_score ? Number(average._avg.eco_score) : null,
        categories,
        top_products: top.map(sanitizeProduct)
    });
};
exports.getProductStats = getProductStats;
