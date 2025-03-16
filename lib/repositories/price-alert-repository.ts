import { logger } from "../logger"
import { prisma } from "../database"
import { PriceAlert } from "@prisma/client"

export interface CreatePriceAlertInput {
  userId: string
  productId: string
  targetPrice: number
}

export interface UpdatePriceAlertInput {
  targetPrice?: number
  triggered?: boolean
  triggeredAt?: Date | null
}

export class PriceAlertRepository {
  async findByUserId(userId: string): Promise<PriceAlert[]> {
    try {
      const alerts = await prisma.priceAlert.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });

      return alerts;
    } catch (error: any) {
      logger.error(`Error fetching price alerts for user ${userId}:`, error)
      throw error
    }
  }

  async findByProductId(productId: string): Promise<PriceAlert[]> {
    try {
      const alerts = await prisma.priceAlert.findMany({
        where: { productId },
        orderBy: { targetPrice: "desc" }
      });

      return alerts;
    } catch (error: any) {
      logger.error(`Error fetching price alerts for product ${productId}:`, error)
      throw error
    }
  }

  async findActiveAlertsByProductId(productId: string): Promise<PriceAlert[]> {
    try {
      const alerts = await prisma.priceAlert.findMany({
        where: { 
          productId,
          triggered: false
        },
        orderBy: { targetPrice: "desc" }
      });

      return alerts;
    } catch (error: any) {
      logger.error(`Error fetching active price alerts for product ${productId}:`, error)
      throw error
    }
  }

  async findById(id: string): Promise<PriceAlert | null> {
    try {
      const alert = await prisma.priceAlert.findUnique({
        where: { id }
      });

      return alert;
    } catch (error: any) {
      logger.error(`Error fetching price alert ${id}:`, error)
      throw error
    }
  }

  async create(input: CreatePriceAlertInput): Promise<PriceAlert> {
    try {
      const alert = await prisma.priceAlert.create({
        data: {
          userId: input.userId,
          productId: input.productId,
          targetPrice: input.targetPrice,
          triggered: false
        }
      });

      return alert;
    } catch (error: any) {
      logger.error("Error creating price alert:", error)
      throw error
    }
  }

  async update(id: string, input: UpdatePriceAlertInput): Promise<PriceAlert | null> {
    try {
      const alert = await this.findById(id);
      if (!alert) return null;

      const updatedAlert = await prisma.priceAlert.update({
        where: { id },
        data: {
          ...(input.targetPrice !== undefined && { targetPrice: input.targetPrice }),
          ...(input.triggered !== undefined && { triggered: input.triggered }),
          ...(input.triggeredAt !== undefined && { triggeredAt: input.triggeredAt })
        }
      });

      return updatedAlert;
    } catch (error: any) {
      logger.error(`Error updating price alert ${id}:`, error)
      throw error
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.priceAlert.delete({
        where: { id }
      });
      
      return true;
    } catch (error: any) {
      logger.error(`Error deleting price alert ${id}:`, error)
      throw error
    }
  }

  async checkAlertsForProduct(productId: string, currentPrice: number): Promise<PriceAlert[]> {
    try {
      // Find alerts that should be triggered
      const alerts = await prisma.priceAlert.findMany({
        where: {
          productId,
          triggered: false,
          targetPrice: {
            gte: currentPrice
          }
        }
      });

      // Mark these alerts as triggered
      const now = new Date();
      for (const alert of alerts) {
        await this.update(alert.id, {
          triggered: true,
          triggeredAt: now,
        });
      }

      return alerts;
    } catch (error: any) {
      logger.error(`Error checking alerts for product ${productId}:`, error)
      throw error
    }
  }
}

