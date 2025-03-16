import { logger } from "../logger"
import { prisma } from "../database"
import { PriceHistory } from "@prisma/client"

export interface CreatePriceHistoryInput {
  productId: string
  price: number
  timestamp?: Date
}

export class PriceHistoryRepository {
  async findByProductId(productId: string, limit = 100): Promise<PriceHistory[]> {
    try {
      const history = await prisma.priceHistory.findMany({
        where: { productId },
        orderBy: { timestamp: "desc" },
        take: limit
      });

      return history;
    } catch (error: any) {
      logger.error(`Error fetching price history for product ${productId}:`, error)
      throw error
    }
  }

  async findByProductIdAndDateRange(productId: string, startDate: Date, endDate: Date): Promise<PriceHistory[]> {
    try {
      const history = await prisma.priceHistory.findMany({
        where: { 
          productId,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { timestamp: "asc" }
      });

      return history;
    } catch (error: any) {
      logger.error(`Error fetching price history for product ${productId} in date range:`, error)
      throw error
    }
  }

  async create(input: CreatePriceHistoryInput): Promise<PriceHistory> {
    try {
      const now = new Date();
      const timestamp = input.timestamp || now;

      const history = await prisma.priceHistory.create({
        data: {
          productId: input.productId,
          price: input.price,
          timestamp
        }
      });

      return history;
    } catch (error: any) {
      logger.error(`Error creating price history for product ${input.productId}:`, error)
      throw error
    }
  }

  async getLowestPrice(productId: string): Promise<number | null> {
    try {
      const result = await prisma.priceHistory.aggregate({
        where: { productId },
        _min: { price: true }
      });

      return result._min.price;
    } catch (error: any) {
      logger.error(`Error getting lowest price for product ${productId}:`, error)
      throw error
    }
  }

  async getHighestPrice(productId: string): Promise<number | null> {
    try {
      const result = await prisma.priceHistory.aggregate({
        where: { productId },
        _max: { price: true }
      });

      return result._max.price;
    } catch (error: any) {
      logger.error(`Error getting highest price for product ${productId}:`, error)
      throw error
    }
  }
}

