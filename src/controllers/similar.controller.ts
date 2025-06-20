import { Request, Response, NextFunction } from "express";
import { searchSimilarProducts } from "../services/similar.service";

export const getSimilarProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const products = await searchSimilarProducts(id);
    res.json(products);
  } catch (error) {
    console.error("❌ Erreur similar.controller :", error);
    next(error);
  }
};
