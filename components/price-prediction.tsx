"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowDown, ArrowRight, ArrowUp, Calendar, Percent } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { PricePrediction } from "@/lib/analytics"
import { Skeleton } from "@/components/ui/skeleton"

interface PricePredictionProps {
  productId: string
}

export function PricePredictionCard({ productId }: PricePredictionProps) {
  const [prediction, setPrediction] = useState<PricePrediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/products/${productId}/prediction`)

        if (!response.ok) {
          throw new Error("No se pudo obtener la predicción")
        }

        const data = await response.json()
        setPrediction(data)
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPrediction()
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
            <Skeleton className="h-8 w-3/4" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Predicción de Precios</CardTitle>
          <CardDescription>No hay suficientes datos para predecir el precio</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Necesitamos más historial de precios para generar una predicción precisa.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!prediction) return null

  const priceDiff = prediction.predictedPrice - prediction.currentPrice
  const percentChange = (priceDiff / prediction.currentPrice) * 100
  const formattedPercentChange = Math.abs(percentChange).toFixed(2)

  const bestTimeTooltip = new Date(prediction.bestTimeToBuy).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Predicción de Precios</CardTitle>
            <CardDescription>Basado en el historial de precios</CardDescription>
          </div>
          <Badge variant={prediction.confidence > 0.7 ? "default" : "outline"} className="ml-2">
            <Percent className="h-3 w-3 mr-1" />
            {Math.round(prediction.confidence * 100)}% confianza
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Precio actual</p>
              <p className="text-2xl font-bold">{formatCurrency(prediction.currentPrice)}</p>
            </div>
            <div className="flex items-center">
              {prediction.trend === "rising" ? (
                <ArrowUp className="h-5 w-5 text-destructive mr-1" />
              ) : prediction.trend === "falling" ? (
                <ArrowDown className="h-5 w-5 text-green-500 mr-1" />
              ) : (
                <ArrowRight className="h-5 w-5 text-muted-foreground mr-1" />
              )}
              <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Precio estimado (30 días)</p>
              <p className="text-2xl font-bold">{formatCurrency(prediction.predictedPrice)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-sm font-medium">
                {priceDiff > 0 ? (
                  <span className="text-destructive">Subirá {formattedPercentChange}%</span>
                ) : priceDiff < 0 ? (
                  <span className="text-green-500">Bajará {formattedPercentChange}%</span>
                ) : (
                  <span className="text-muted-foreground">Se mantendrá estable</span>
                )}
              </p>
            </div>

            {prediction.trend === "falling" && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Mejor momento para comprar: {bestTimeTooltip}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

