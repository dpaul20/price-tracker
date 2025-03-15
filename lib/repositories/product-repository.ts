import { logger } from "../logger";
import { invalidateProductCache } from "../cache";
import { prisma } from "../database";
import { Product } from "@prisma/client";

export interface CreateProductInput {
  url: string;
  name: string;
  image?: string | null;
  currentPrice: number;
  storeId: string;
}

export interface UpdateProductInput {
  name?: string;
  image?: string | null;
  currentPrice?: number;
  previousPrice?: number | null;
  lastChecked?: Date;
}

export class ProductRepository {
  async findAll(limit = 50, offset = 0): Promise<Product[]> {
    try {
      const products = await prisma.product.findMany({
        include: { store: true },
        orderBy: { lastChecked: "desc" },
        take: limit,
        skip: offset,
      });
      return products;
    } catch (error) {
      logger.error("Error fetching products:", error);
      throw error;
    }
  }

  async findById(id: string): Promise<Product & { store: { name: string } }> {
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: { store: true },
      });

      if (!product) {
        throw new Error(`Product with ID ${id} not found`);
      }

      return product;
    } catch (error) {
      logger.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  }

  async findByUrl(url: string): Promise<Product | null> {
    try {
      const product = await prisma.product.findUnique({
        where: { url },
        include: { store: true },
      });
      return product;
    } catch (error) {
      logger.error(`Error fetching product by URL ${url}:`, error);
      throw error;
    }
  }

  async create(input: CreateProductInput): Promise<Product> {
    try {
      const now = new Date();
      const product = await prisma.product.create({
        data: {
          url: input.url,
          name: input.name,
          image: input.image || null,
          currentPrice: input.currentPrice,
          previousPrice: null,
          storeId: input.storeId,
          lastChecked: now,
        },
        include: {
          store: true,
        },
      });
      return product;
    } catch (error) {
      logger.error("Error creating product:", error);
      throw error;
    }
  }

  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    try {
      const product = await this.findById(id);
      if (!product) return null;

      const updateData: any = {};

      if (input.name !== undefined) {
        updateData.name = input.name;
      }

      if (input.image !== undefined) {
        updateData.image = input.image;
      }

      if (input.currentPrice !== undefined) {
        updateData.currentPrice = input.currentPrice;
        updateData.previousPrice = product.currentPrice;
      }

      if (input.previousPrice !== undefined) {
        updateData.previousPrice = input.previousPrice;
      }

      if (input.lastChecked !== undefined) {
        updateData.lastChecked = input.lastChecked;
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: updateData,
        include: { store: true },
      });

      // Invalidate cache
      await invalidateProductCache(id);

      return updatedProduct;
    } catch (error) {
      logger.error(`Error updating product ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Invalidate cache first
      await invalidateProductCache(id);

      const result = await prisma.product.delete({
        where: { id },
      });

      return !!result;
    } catch (error) {
      logger.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  }

  async getLatestProducts(limit = 6): Promise<Product[]> {
    try {
      const products = await prisma.product.findMany({
        include: { store: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return products;
    } catch (error) {
      logger.error(`Error fetching latest products:`, error);
      throw error;
    }
  }

  async calculatePercentageChange(product: Product): Promise<number> {
    if (!product.previousPrice || product.previousPrice === 0) return 0;

    const change =
      ((product.currentPrice - product.previousPrice) / product.previousPrice) *
      100;
    return Number.parseFloat(change.toFixed(2));
  }
}
