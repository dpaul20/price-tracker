import { logger } from "../logger";
import { prisma } from "../database";
import { ScrapingLog } from "@prisma/client";

export interface CreateScrapingLogInput {
  url: string;
  domain: string;
  success: boolean;
  errorMessage?: string;
}

export class ScrapingLogRepository {
  async create(input: CreateScrapingLogInput): Promise<ScrapingLog> {
    try {
      const log = await prisma.scrapingLog.create({
        data: {
          url: input.url,
          domain: input.domain,
          success: input.success,
          errorMessage: input.errorMessage || null,
        },
      });

      return log;
    } catch (error: any) {
      logger.error("Error creating scraping log:", error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getStatsByDomain(days = 7): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // For complex aggregations, we can use Prisma's groupBy with count/sum
      const stats = await prisma.$queryRaw`
        SELECT 
          domain,
          COUNT(*) as total,
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failure_count,
          (SUM(CASE WHEN success = true THEN 1 ELSE 0 END)::float / COUNT(*)::float) * 100 as success_rate
        FROM "ScrapingLog"
        WHERE timestamp >= ${startDate}
        GROUP BY domain
        ORDER BY success_rate ASC
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (stats as any[]).map((stat) => ({
        domain: stat.domain,
        total: Number.parseInt(stat.total),
        successCount: Number.parseInt(stat.success_count),
        failureCount: Number.parseInt(stat.failure_count),
        successRate: Number.parseFloat(
          Number.parseFloat(stat.success_rate).toFixed(2)
        ),
      }));
    } catch (error: any) {
      logger.error(`Error getting scraping stats by domain:`, error);
      throw error;
    }
  }

  async getProblematicDomains(
    successRateThreshold = 50,
    days = 7
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    try {
      const stats = await this.getStatsByDomain(days);

      return stats
        .filter(
          (stat) => stat.total >= 5 && stat.successRate < successRateThreshold
        )
        .sort((a, b) => a.successRate - b.successRate);
    } catch (error: any) {
      logger.error(`Error identifying problematic domains:`, error);
      throw error;
    }
  }
}
