// ✏️ PUT /api/products/:id
const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
      include: { partnerLinks: { include: { partner: true } } },
    });
    res.json(product);
  } catch (error: any) {
    if (error.code === "P2025") return res.status(404).json({ error: "Produit non trouvé" });
    console.error("❌ updateProduct :", error);
    res.status(500).json({ error: "Erreur mise à jour" });
  }
};

// 🗑 DELETE /api/products/:id
const deleteProduct = async (req: Request, res: Response) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: "Produit supprimé" });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(404).json({ error: "Produit non trouvé" });
    console.error("❌ deleteProduct :", error);
    res.status(500).json({ error: "Erreur suppression" });
  }
};

// 🔎 GET /api/products/search
const searchProducts = async (req: Request, res: Response) => {
  try {
    const { q, category, verified, eco_min, page = 1, limit = 20 } = req.query;
    const skip = (+page - 1) * +limit;

    const where: any = {};
    if (q) where.OR = [
      { title: { contains: q as string, mode: "insensitive" } },
      { description: { contains: q as string, mode: "insensitive" } },
      { brand: { contains: q as string, mode: "insensitive" } },
    ];
    if (category) where.category = category;
    if (verified === "true") where.verified_status = "verified";
    if (eco_min) where.eco_score = { gte: parseFloat(eco_min as string) };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: +limit,
        orderBy: [
          { verified_status: "desc" },
          { eco_score: "desc" },
          { created_at: "desc" },
        ],
        include: { partnerLinks: { include: { partner: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ products, pagination: { page: +page, limit: +limit, total } });
  } catch (error) {
    console.error("❌ searchProducts :", error);
    res.status(500).json({ error: "Erreur recherche" });
  }
};

// 📊 GET /api/products/stats
const getProductStats = async (req: Request, res: Response) => {
  try {
    const [total, verified, avg, groups] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { verified_status: "verified" } }),
      prisma.product.aggregate({ _avg: { eco_score: true } }),
      prisma.product.groupBy({
        by: ["category"],
        _count: { category: true },
        take: 5,
        orderBy: { _count: { category: "desc" } },
      }),
    ]);

    res.json({
      total,
      verified,
      verification_rate: total ? Math.round((verified / total) * 100) : 0,
      average_eco_score: avg._avg.eco_score ?? 0,
      top_categories: groups.map((g) => ({ category: g.category, count: g._count.category })),
    });
  } catch (error) {
    console.error("❌ getProductStats :", error);
    res.status(500).json({ error: "Erreur statistiques" });
  }
};

// ✅ Export final
export {
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductStats
};
