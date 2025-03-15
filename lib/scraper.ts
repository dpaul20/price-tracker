import * as cheerio from "cheerio";
import { ProxyManager } from "./proxy-manager";
import { logger } from "./logger";
import { setTimeout } from "timers/promises";

// Lista de User-Agents comunes para rotar
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59",
];

// Función para obtener un User-Agent aleatorio
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Configuraciones de scraping para sitios web comunes
const SCRAPE_CONFIGS = {
  "www.venex.com.ar": {
    priceSelector: ".textPrecio",
    nameSelector: ".title-product h1",
    imageSelector: ".img-container img",
    currencySymbol: "$",
    priceTransform: (text: string) =>
      Number.parseFloat(text.replace(/[^\d,]/g, "").replace(",", ".")),
    delayMs: 2000, // Retraso específico para este sitio
  },
  // Puedes agregar más sitios aquí
  default: {
    priceSelector: "span.price, .price, .product-price",
    nameSelector: "h1, .product-title, .product-name",
    imageSelector: ".product-image img, .product-photo img",
    currencySymbol: "$",
    priceTransform: (text: string) =>
      Number.parseFloat(text.replace(/[^\d,.]/g, "").replace(",", ".")),
    delayMs: 3000, // Retraso predeterminado
  },
};

// Caché de dominios bloqueados para evitar intentos repetidos
const blockedDomains = new Map<string, number>();

export async function scrapeProductInfo(url: string) {
  try {
    const hostname = new URL(url).hostname;

    // Verificar si el dominio está bloqueado
    const blockedUntil = blockedDomains.get(hostname);
    if (blockedUntil && blockedUntil > Date.now()) {
      logger.warn(
        `Dominio ${hostname} bloqueado temporalmente, saltando scraping`
      );
      return null;
    }

    // Determinar qué configuración de scraping usar
    const config = SCRAPE_CONFIGS[hostname] || SCRAPE_CONFIGS.default;

    // Aplicar retraso específico para el sitio
    await setTimeout(config.delayMs + Math.random() * 2000);

    // Obtener proxy si está disponible
    const proxyManager = ProxyManager.getInstance();
    const proxy = await proxyManager.getProxy();

    // Preparar opciones de fetch
    const fetchOptions: RequestInit = {
      headers: {
        "User-Agent": getRandomUserAgent(),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Upgrade-Insecure-Requests": "1",
      },
      cache: "no-store" as RequestCache,
    };

    // Añadir proxy si está disponible
    if (proxy) {
      logger.info(`Usando proxy ${proxy} para ${url}`);
      // En un entorno real, aquí configurarías el proxy
      // Esto depende de cómo implementes la conexión a través de proxy
    }

    // Obtener el HTML de la página
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      // Si recibimos un código de error, podría ser un bloqueo
      if (response.status === 403 || response.status === 429) {
        logger.warn(`Posible bloqueo en ${hostname}: ${response.status}`);

        // Marcar el dominio como bloqueado temporalmente (30 minutos)
        blockedDomains.set(hostname, Date.now() + 30 * 60 * 1000);

        // Liberar el proxy como fallido
        if (proxy) {
          await proxyManager.releaseProxy(proxy, false);
        }

        return null;
      }

      throw new Error(`Error al obtener la página: ${response.status}`);
    }

    // Liberar el proxy como exitoso
    if (proxy) {
      await proxyManager.releaseProxy(proxy, true);
    }

    const html = await response.text();

    // Verificar si la respuesta contiene indicadores de bloqueo
    if (
      html.includes("captcha") ||
      html.includes("robot") ||
      html.includes("blocked") ||
      html.length < 1000
    ) {
      logger.warn(`Posible bloqueo en ${hostname}: contenido sospechoso`);

      // Marcar el dominio como bloqueado temporalmente (15 minutos)
      blockedDomains.set(hostname, Date.now() + 15 * 60 * 1000);

      if (proxy) {
        await proxyManager.releaseProxy(proxy, false);
      }

      return null;
    }

    const $ = cheerio.load(html);

    // Extraer información del producto
    const priceElement = $(config.priceSelector).first();
    const priceText = priceElement.text().trim();

    if (!priceText) {
      logger.warn(
        `No se encontró precio en ${url} usando selector ${config.priceSelector}`
      );
      return null;
    }

    const price = config.priceTransform(priceText);

    if (isNaN(price) || price <= 0) {
      logger.warn(`Precio inválido en ${url}: "${priceText}" -> ${price}`);
      return null;
    }

    const name = $(config.nameSelector).first().text().trim();

    if (!name) {
      logger.warn(
        `No se encontró nombre en ${url} usando selector ${config.nameSelector}`
      );
      return null;
    }

    let image = $(config.imageSelector).first().attr("src");
    // Asegurarse de que la URL de la imagen sea absoluta
    if (image && !image.startsWith("http")) {
      const baseUrl = `${new URL(url).protocol}//${new URL(url).host}`;
      image = new URL(image, baseUrl).toString();
    }

    return {
      name,
      price,
      image,
      selectors: {
        price: config.priceSelector,
        name: config.nameSelector,
        image: config.imageSelector,
      },
    };
  } catch (error) {
    logger.error(`Error al hacer scraping de ${url}: ${error.message}`);
    return null;
  }
}
