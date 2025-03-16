// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import * as cheerio from "cheerio";
import { ProxyManager } from "./proxy-manager";
import { logger } from "./logger";
import puppeteer from "puppeteer";

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
  "compragamer.com": {
    priceSelector:
      ".product-details__info__special-price__price__value span, .mat-mdc-tooltip-trigger.product-details__info__special-price__price span",
    nameSelector:
      "h1.product-details__info__title, h1.product-title, .title h1",
    imageSelector:
      ".product-details__image img, .product-gallery img, .product-image-container img",
    currencySymbol: "$",
    priceTransform: (text: string) => {
      // Remove currency symbol, dots in thousands, non-breaking spaces, and handle comma decimal
      const cleanText = text
        .replace(/[^\d.,]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      return Number.parseFloat(cleanText);
    },
    delayMs: 3000, // Retraso específico para este sitio
  },
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

    // Use browser-based scraping specifically for CompraGamer
    if (hostname === "compragamer.com") {
      const config = SCRAPE_CONFIGS[hostname];
      return await scrapeWithBrowser(url, config);
    }

    // Verificar si el dominio está bloqueado
    const blockedUntil = blockedDomains.get(hostname);
    if (blockedUntil && blockedUntil > Date.now()) {
      logger.warn(
        `Dominio ${hostname} bloqueado temporalmente, saltando scraping`
      );
      return null;
    }

    // Determinar qué configuración de scraping usar
    const config =
      SCRAPE_CONFIGS[hostname as keyof typeof SCRAPE_CONFIGS] ||
      SCRAPE_CONFIGS.default;

    // Aplicar retraso específico para el sitio
    await sleep(config.delayMs + Math.random() * 2000);

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
    let priceElement = $(config.priceSelector).first();

    // Fallback to generic price selectors if no price was found
    if (!priceElement.length) {
      logger.info(
        `No price found with specific selectors for ${hostname}, trying fallback selectors`
      );
      priceElement = $(
        '[class*="price"], [class*="precio"], [data-price], [itemprop="price"], .offer-price'
      ).first();
    }

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
  } catch (error: any) {
    logger.error(`Error al hacer scraping de ${url}: ${error.message}`);
    return null;
  }
}

// Add a new method for browser-based scraping
async function scrapeWithBrowser(url: string, config: any) {
  const browser = await puppeteer.launch({
    headless: "shell",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(getRandomUserAgent());

    // Set viewport to simulate a desktop browser
    await page.setViewport({ width: 1366, height: 768 });

    logger.info(`Navegando a ${url} con Puppeteer`);

    // Navigate to the URL and wait for content to load
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for a common element on product pages to be available
    await page.waitForSelector("h1", { timeout: 10000 });

    // Use a cross-version compatible way to wait
    await page.evaluate(
      () => new Promise((resolve) => setTimeout(resolve, 2000))
    );

    logger.info(`Extrayendo datos de ${url}`);

    // Extract the required data
    const data = await page.evaluate(() => {
      // First try to get the "Precio especial" specifically
      const specialPriceElement = document.querySelector(
        ".product-details__info__special-price__price__value span"
      );

      if (
        specialPriceElement &&
        specialPriceElement?.textContent?.includes("$")
      ) {
        console.log("Special price detected");
        return {
          priceText: specialPriceElement?.textContent?.trim(),
          name: document.querySelector("h1")?.textContent?.trim() ?? "",
          image:
            document.querySelector<HTMLImageElement>(
              ".product-details__image img"
            )?.src ?? "",
          allText: "",
        };
      }

      // Fallback to general price detection with improved filtering
      const priceElements = Array.from(document.querySelectorAll("*")).filter(
        (el) =>
          el.textContent &&
          el.textContent.trim().includes("$") &&
          !el.textContent.toLowerCase().includes("cuota") &&
          !el.parentElement?.textContent?.toLowerCase().includes("cuota")
      );

      // Sort by text length but prioritize elements with "especial" or "precio"
      priceElements.sort((a, b) => {
        const aHasPriceKeyword =
          a.textContent?.toLowerCase().includes("precio") ||
          a.textContent?.toLowerCase().includes("especial");
        const bHasPriceKeyword =
          b.textContent?.toLowerCase().includes("precio") ||
          b.textContent?.toLowerCase().includes("especial");

        if (aHasPriceKeyword && !bHasPriceKeyword) return -1;
        if (!aHasPriceKeyword && bHasPriceKeyword) return 1;
        return a.textContent.length - b.textContent.length;
      });

      const priceText =
        priceElements.length > 0 ? priceElements?.[0]?.textContent?.trim() : "";
      const name = document.querySelector("h1")?.textContent?.trim() || "";

      // Try multiple strategies to find the product image
      const imgSelectors = [
        "img.product-image",
        ".product-details__image img",
        'img[src*="producto"]',
        ".image-gallery img",
        'img[alt*="producto"]',
      ];

      let image = "";
      for (const selector of imgSelectors) {
        const img = document.querySelector(selector);
        if (img && img.src) {
          image = img.src;
          break;
        }
      }

      // Also collect all text content for debugging
      const allText = document.body.innerText;

      return { priceText, name, image, allText };
    });

    logger.info(
      `Datos extraídos - Precio: "${data.priceText}", Nombre: "${data.name}"`
    );

    // Process the price text
    if (data.priceText) {
      const price = config.priceTransform(data.priceText);

      if (isNaN(price) || price <= 0) {
        logger.warn(
          `Precio inválido en ${url}: "${data.priceText}" -> ${price}`
        );
        return null;
      }

      return {
        name: data.name,
        price,
        image: data.image,
        selectors: {
          price: "dynamic",
          name: "h1",
          image: "dynamic",
        },
      };
    } else {
      logger.warn(`No se pudo encontrar el precio en ${url}`);
      return null;
    }
  } catch (error: any) {
    logger.error(`Error con Puppeteer en ${url}: ${error.message}`);
    return null;
  } finally {
    await browser.close();
  }
}

// Custom sleep function to replace timers/promises
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
