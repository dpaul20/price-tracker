import { logger } from "../logger"
import { prisma } from "../database"
import { Store } from "@prisma/client"

export interface CreateStoreInput {
  name: string
  url: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scrapeConfig?: any
}

export interface UpdateStoreInput {
  name?: string
  url?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scrapeConfig?: any
}

export class StoreRepository {
  async findAll(): Promise<Store[]> {
    try {
      const stores = await prisma.store.findMany({
        orderBy: { name: "asc" }
      });
      return stores;
    } catch (error: any) {
      logger.error("Error fetching stores:", error)
      throw error
    }
  }

  async findById(id: string): Promise<Store | null> {
    try {
      const store = await prisma.store.findUnique({
        where: { id }
      });
      return store;
    } catch (error: any) {
      logger.error(`Error fetching store ${id}:`, error)
      throw error
    }
  }

  async findByDomain(domain: string): Promise<Store | null> {
    try {
      const store = await prisma.store.findFirst({
        where: {
          url: {
            contains: domain
          }
        }
      });
      return store;
    } catch (error: any) {
      logger.error(`Error fetching store by domain ${domain}:`, error)
      throw error
    }
  }

  async create(input: CreateStoreInput): Promise<Store> {
    try {
      const store = await prisma.store.create({
        data: {
          name: input.name,
          url: input.url,
          scrapeConfig: input.scrapeConfig || {}
        }
      });
      return store;
    } catch (error: any) {
      logger.error("Error creating store:", error)
      throw error
    }
  }

  async update(id: string, input: UpdateStoreInput): Promise<Store | null> {
    try {
      const store = await this.findById(id);
      if (!store) return null;

      const updatedStore = await prisma.store.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.url !== undefined && { url: input.url }),
          ...(input.scrapeConfig !== undefined && { scrapeConfig: input.scrapeConfig })
        }
      });

      return updatedStore;
    } catch (error: any) {
      logger.error(`Error updating store ${id}:`, error)
      throw error
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.store.delete({
        where: { id }
      });
      return true;
    } catch (error: any) {
      logger.error(`Error deleting store ${id}:`, error)
      throw error
    }
  }
}

