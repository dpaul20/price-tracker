import { logger } from "./logger"

export async function checkProxy(proxy: string): Promise<boolean> {
  try {
    // Intentar acceder a un sitio de prueba a través del proxy
    // En un entorno real, implementarías la lógica para usar el proxy
    logger.info(`Verificando proxy: ${proxy}`)

    // Simular verificación (aquí implementarías la lógica real)
    const isWorking = Math.random() > 0.3 // 70% de éxito para simulación

    if (isWorking) {
      logger.info(`Proxy ${proxy} funciona correctamente`)
    } else {
      logger.warn(`Proxy ${proxy} no funciona`)
    }

    return isWorking
  } catch (error) {
    logger.error(`Error verificando proxy ${proxy}: ${error.message}`)
    return false
  }
}

export async function checkAllProxies(proxyList: string[]): Promise<string[]> {
  logger.info(`Verificando ${proxyList.length} proxies...`)

  const results = await Promise.all(
    proxyList.map(async (proxy) => {
      const isWorking = await checkProxy(proxy)
      return { proxy, isWorking }
    }),
  )

  const workingProxies = results.filter((result) => result.isWorking).map((result) => result.proxy)

  logger.info(`Verificación completada: ${workingProxies.length} de ${proxyList.length} proxies funcionan`)

  return workingProxies
}

