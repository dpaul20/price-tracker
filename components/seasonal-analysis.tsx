"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingDown, TrendingUp } from "lucide-react"
import type { SeasonalAnalysis } from "@/lib/analytics"
import { Skeleton } from "@/components/ui/skeleton"

interface SeasonalAnalysisProps {
  productId: string
}

export function SeasonalAnalysisCard({ productId }: SeasonalAnalysisProps) {
  const [analysis, setAnalysis] = useState<SeasonalAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/products/${productId}/seasonal`)

        if (!response.ok) {
          throw new Error("No se pudo obtener el análisis estacional")
        }

        const data = await response.json()
        setAnalysis(data)
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
  }, [productId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-64" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis Estacional</CardTitle>
          <CardDescription>No hay suficientes datos para el análisis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Necesitamos al menos un año de historial de precios para generar un análisis estacional preciso.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) return null

  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  const bestMonth = months[analysis.bestMonthToBuy]
  const worstMonth = months[analysis.worstMonthToBuy]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis Estacional</CardTitle>
        <CardDescription>Patrones de precios a lo largo del año</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <TrendingDown className="h-5 w-5 text-green-500 mr-2" />
                <h3 className="font-semibold">Mejor momento para comprar</h3>
              </div>
              <div className="pl-7">
                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                  <Calendar className="h-3 w-3 mr-1" />
                  {bestMonth}
                </Badge>
                {analysis.lowSeasons.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Los precios suelen bajar hasta un {analysis.lowSeasons[0].avgPriceDecrease}%
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-destructive mr-2" />
                <h3 className="font-semibold">Peor momento para comprar</h3>
              </div>
              <div className="pl-7">
                <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
                  <Calendar className="h-3 w-3 mr-1" />
                  {worstMonth}
                </Badge>
                {analysis.highSeasons.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Los precios suelen subir hasta un {analysis.highSeasons[0].avgPriceIncrease}%
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Temporadas identificadas</h3>

            {analysis.lowSeasons.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-600">Temporadas de precios bajos:</p>
                <ul className="text-sm text-muted-foreground space-y-1 pl-5 list-disc">
                  {analysis.lowSeasons.map((season, index) => (
                    <li key={index}>
                      {new Date(season.start).toLocaleDateString("es-AR", { month: "long" })} a{" "}
                      {new Date(season.end).toLocaleDateString("es-AR", { month: "long" })} (hasta{" "}
                      {season.avgPriceDecrease}% menos)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.highSeasons.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Temporadas de precios altos:</p>
                <ul className="text-sm text-muted-foreground space-y-1 pl-5 list-disc">
                  {analysis.highSeasons.map((season, index) => (
                    <li key={index}>
                      {new Date(season.start).toLocaleDateString("es-AR", { month: "long" })} a{" "}
                      {new Date(season.end).toLocaleDateString("es-AR", { month: "long" })} (hasta{" "}
                      {season.avgPriceIncrease}% más)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

