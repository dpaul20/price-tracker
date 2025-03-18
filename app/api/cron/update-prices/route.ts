import { NextResponse } from "next/server";
import { scheduleProductUpdates } from "@/lib/queue";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    // Verificar clave secreta para proteger el endpoint
    const { searchParams } = new URL(request.url);
    // const secret = searchParams.get("secret");

    // if (secret !== process.env.CRON_SECRET) {
    //   logger.warn(
    //     "Intento de acceso no autorizado al endpoint de actualización de precios"
    //   );
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // Obtener tamaño del lote de los parámetros o usar valor predeterminado
    const batchSize = Number.parseInt(
      searchParams.get("batchSize") || "50",
      10
    );

    // Programar actualizaciones en lotes
    const result = await scheduleProductUpdates(batchSize);

    return NextResponse.json({
      success: true,
      message: `Programadas ${result.scheduled} actualizaciones de productos`,
      timestamp: new Date().toISOString(),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("Error programando actualizaciones de precios:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
