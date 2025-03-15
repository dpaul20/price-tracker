import { logger } from "./logger"

// Interfaz para proveedores de proxy
interface ProxyProvider {
  getProxy(): Promise<string | null>
  releaseProxy(proxy: string, success: boolean): Promise<void>
}

// Implementación simple con lista estática de proxies
class SimpleProxyProvider implements ProxyProvider {
  private proxies: string[]
  private currentIndex = 0
  private failCounts: Map<string, number> = new Map()
  private lastUsed: Map<string, number> = new Map()

  constructor(proxies: string[]) {
    this.proxies = proxies
    logger.info(`Inicializado proveedor simple con ${proxies.length} proxies`)
  }

  async getProxy(): Promise<string | null> {
    if (this.proxies.length === 0) {
      return null // Sin proxies disponibles
    }

    // Encontrar el mejor proxy disponible
    const now = Date.now()
    let bestProxy = null
    let bestScore = -1

    for (const proxy of this.proxies) {
      const failCount = this.failCounts.get(proxy) || 0
      const lastUsedTime = this.lastUsed.get(proxy) || 0
      const timeSinceLastUse = now - lastUsedTime

      // Calcular puntuación: preferir proxies con menos fallos y que no se han usado recientemente
      const score = timeSinceLastUse / 1000 - failCount * 10

      if (score > bestScore) {
        bestScore = score
        bestProxy = proxy
      }
    }

    if (bestProxy) {
      this.lastUsed.set(bestProxy, now)
      return bestProxy
    }

    // Fallback a rotación simple si no se puede determinar el mejor
    const proxy = this.proxies[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length
    this.lastUsed.set(proxy, now)
    return proxy
  }

  async releaseProxy(proxy: string, success: boolean): Promise<void> {
    if (!success) {
      // Incrementar contador de fallos
      const failCount = (this.failCounts.get(proxy) || 0) + 1
      this.failCounts.set(proxy, failCount)

      // Si un proxy falla demasiadas veces, podríamos quitarlo temporalmente
      if (failCount > 5) {
        logger.warn(`Proxy ${proxy} ha fallado ${failCount} veces, quitándolo temporalmente`)
        this.proxies = this.proxies.filter((p) => p !== proxy)

        // Programar para volver a añadirlo después de un tiempo
        setTimeout(
          () => {
            this.proxies.push(proxy)
            this.failCounts.set(proxy, 0)
            logger.info(`Proxy ${proxy} reincorporado después de periodo de enfriamiento`)
          },
          30 * 60 * 1000,
        ) // 30 minutos de enfriamiento
      }
    } else {
      // Reducir contador de fallos si el proxy funciona correctamente
      const currentFails = this.failCounts.get(proxy) || 0
      if (currentFails > 0) {
        this.failCounts.set(proxy, currentFails - 1)
      }
    }
  }
}

// Clase principal para gestionar proxies
export class ProxyManager {
  private provider: ProxyProvider
  private static instance: ProxyManager
  private noProxyMode = false

  private constructor() {
    if (process.env.PROXY_LIST) {
      // Usar lista de proxies de las variables de entorno
      const proxyList = process.env.PROXY_LIST.split(",").map((p) => p.trim())
      this.provider = new SimpleProxyProvider(proxyList)
      logger.info(`Usando lista de ${proxyList.length} proxies configurados`)
    } else {
      // Sin proxies, modo directo
      this.provider = new SimpleProxyProvider([])
      this.noProxyMode = true
      logger.warn("No se configuraron proxies, las solicitudes usarán la IP directa")
    }
  }

  public static getInstance(): ProxyManager {
    if (!ProxyManager.instance) {
      ProxyManager.instance = new ProxyManager()
    }
    return ProxyManager.instance
  }

  async getProxy(): Promise<string | null> {
    if (this.noProxyMode) {
      return null // Modo sin proxy
    }

    try {
      return await this.provider.getProxy()
    } catch (error) {
      logger.error(`Error obteniendo proxy: ${error.message}`)
      return null
    }
  }

  async releaseProxy(proxy: string, success: boolean): Promise<void> {
    if (this.noProxyMode || !proxy) {
      return
    }

    try {
      await this.provider.releaseProxy(proxy, success)
    } catch (error) {
      logger.error(`Error liberando proxy: ${error.message}`)
    }
  }

  isNoProxyMode(): boolean {
    return this.noProxyMode
  }
}

