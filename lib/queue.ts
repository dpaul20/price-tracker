import { Queue, Worker } from "bullmq";
import { Redis } from "@upstash/redis";
import { ProductRepository } from "./repositories/product-repository";
import { PriceHistoryRepository } from "./repositories/price-history-repository";
import { PriceAlertRepository } from "./repositories/price-alert-repository";
import { ScrapingLogRepository } from "./repositories/scraping-log-repository";
import { scrapeProductInfo } from "./scraper";
import { logger } from "./logger";

// Repositories
const productRepository = new ProductRepository();
const priceHistoryRepository = new PriceHistoryRepository();
const priceAlertRepository = new PriceAlertRepository();
const scrapingLogRepository = new ScrapingLogRepository();

// Initialize Redis client with Upstash
const redis = Redis.fromEnv();

// Create connection for BullMQ
// const connection = {
//   client: redis,
//   // Add any additional connection options if needed
// };

// Create queues
export const priceUpdateQueue = new Queue("price-updates", {
  connection: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

// Configurar trabajos recurrentes
async function setupRecurringJobs() {
  await priceUpdateQueue.add(
    "daily-update-check",
    { type: "scheduled-update" },
    {
      repeat: {
        pattern: "0 0 * * *", // Diariamente a medianoche
      },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );

  logger.info("Trabajos recurrentes configurados");
}

// Llama a esta función durante la inicialización
setupRecurringJobs().catch((err) =>
  logger.error(`Error al configurar trabajos recurrentes: ${err.message}`)
);

// Inicializar worker para procesamiento de actualizaciones de precios
const priceUpdateWorker = new Worker(
  "price-updates",
  async (job) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { productId, priority } = job.data;

    try {
      logger.info(
        `Procesando actualización de precio para producto ${productId}`
      );

      // Obtener información del producto
      const product = await productRepository.findById(productId);

      if (!product) {
        throw new Error(`Producto no encontrado: ${productId}`);
      }

      // Aplicar retraso basado en el dominio antes de hacer scraping
      const delay = calculateDomainDelay(product.url);
      logger.info(`Aplicando retraso de ${delay}ms para ${product.url}`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Obtener precio actual mediante scraping
      const productInfo = await scrapeProductInfo(product.url);

      // Log scraping attempt
      const domain = new URL(product.url).hostname;
      await scrapingLogRepository.create({
        url: product.url,
        domain,
        success: !!productInfo,
        errorMessage: productInfo ? undefined : "Failed to scrape product info",
      });

      if (!productInfo) {
        throw new Error(
          `No se pudo obtener información del producto: ${productId}`
        );
      }

      const newPrice = productInfo.price;

      // Verificar si el precio ha cambiado
      if (newPrice !== product.currentPrice) {
        logger.info(
          `Precio cambiado para ${productId}: ${product.currentPrice} -> ${newPrice}`
        );

        // Actualizar producto
        await productRepository.update(productId, {
          currentPrice: newPrice,
          previousPrice: product.currentPrice,
          lastChecked: new Date(),
        });

        // Guardar en histórico
        await priceHistoryRepository.create({
          productId,
          price: newPrice,
        });

        // Verificar alertas
        const triggeredAlerts =
          await priceAlertRepository.checkAlertsForProduct(productId, newPrice);

        if (triggeredAlerts.length > 0) {
          logger.info(
            `Se activaron ${triggeredAlerts.length} alertas para el producto ${productId}`
          );
        }

        return { updated: true, oldPrice: product.currentPrice, newPrice };
      } else {
        // Solo actualizar fecha de verificación
        await productRepository.update(productId, {
          lastChecked: new Date(),
        });

        return { updated: false, price: newPrice };
      }
    } catch (error: any) {
      logger.error(
        `Error procesando producto ${productId}: ${(error as Error).message}`
      );
      throw error;
    }
  },
  { connection, concurrency: 5 }
);

// Función para programar actualizaciones en lotes
export async function scheduleProductUpdates(batchSize = 50) {
  try {
    // Obtener todos los productos ordenados por última verificación
    const products = await productRepository.findAll(1000, 0);

    // Sort by lastChecked
    products.sort(
      (a, b) =>
        new Date(a.lastChecked).getTime() - new Date(b.lastChecked).getTime()
    );

    logger.info(
      `Programando actualizaciones para ${products.length} productos en lotes de ${batchSize}`
    );

    // Procesar en lotes
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      // Añadir cada producto a la cola con un retraso incremental
      batch.forEach((product, index) => {
        const delay = index * 1000; // 1 segundo entre cada trabajo dentro del lote

        priceUpdateQueue.add(
          `update-${product.id}`,
          {
            productId: product.id,
            priority: calculatePriority(product),
          },
          {
            delay,
            removeOnComplete: true,
            removeOnFail: 1000, // Mantener trabajos fallidos por un tiempo limitado
          }
        );
      });

      // Esperar entre lotes para no sobrecargar el sistema
      if (i + batchSize < products.length) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    return { scheduled: products.length };
  } catch (error: any) {
    logger.error(
      `Error programando actualizaciones: ${(error as Error).message}`
    );
    throw error;
  }
}

// Función mejorada para calcular prioridad
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculatePriority(product: any): number {
  const now = new Date();
  const hoursSinceLastCheck =
    (now.getTime() - new Date(product.lastChecked).getTime()) /
    (1000 * 60 * 60);

  // Factores de priorización
  let priority = 3; // Prioridad normal por defecto

  // Factor 1: Tiempo desde última verificación
  if (hoursSinceLastCheck > 48) priority -= 2; // Alta prioridad
  else if (hoursSinceLastCheck > 24) priority -= 1; // Media-alta prioridad

  return Math.max(1, priority); // Asegurar que la prioridad mínima sea 1
}

// Función para calcular retraso basado en el dominio
function calculateDomainDelay(url: string): number {
  try {
    const domain = new URL(url).hostname;

    // Dominios conocidos por tener límites más estrictos
    const strictDomains = [
      "amazon.com",
      "amazon.com.ar",
      "mercadolibre.com",
      "mercadolibre.com.ar",
      "ebay.com",
      "walmart.com",
      "bestbuy.com",
    ];

    // Si es un dominio estricto, usar retraso mayor
    if (strictDomains.some((d) => domain.includes(d))) {
      // Retraso entre 5-10 segundos para dominios estrictos
      return 5000 + Math.random() * 5000;
    }

    // Retraso entre 2-5 segundos para otros dominios
    return 2000 + Math.random() * 3000;
  } catch (error: any) {
    logger.error(`Error al parsear URL: ${(error as Error).message}`);
    // Si hay error al parsear la URL, usar retraso predeterminado
    return 3000;
  }
}

// Manejar eventos de la cola
priceUpdateQueue.on("completed", (job) => {
  logger.info(`Trabajo completado: ${job.id}`);
});

priceUpdateQueue.on("failed", (job, error) => {
  logger.error(`Trabajo fallido: ${job?.id}, Error: ${error.message}`);
});

// Limpiar recursos al cerrar la aplicación
process.on("SIGTERM", async () => {
  await priceUpdateWorker.close();
  await priceUpdateQueue.close();
});
