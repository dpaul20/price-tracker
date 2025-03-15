"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Store } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { StoreComparison } from "@/lib/analytics"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface StoreComparisonProps {
  productName: string
}

export function StoreComparisonCard({ productName }: StoreComparisonProps) {
  const [comparison, setComparison] = useState<StoreComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/products/compare?name=${encodeURIComponent(productName)}`)

        if (!response.ok) {
          throw new Error("No se pudo obtener la comparación")
        }

        const data = await response.json()
        setComparison(data)
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchComparison()
  }, [productName])

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
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !comparison || comparison.stores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparación de Tiendas</CardTitle>
          <CardDescription>No se encontraron productos similares</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No pudimos encontrar este producto en otras tiendas.</p>
        </CardContent>
      </Card>
    )
  }

  // Ordenar tiendas por precio actual (de menor a mayor)
  const sortedStores = [...comparison.stores].sort((a, b) => a.currentPrice - b.currentPrice)
  const lowestPrice = sortedStores[0].currentPrice

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparación de Tiendas</CardTitle>
        <CardDescription>Precios en diferentes tiendas para productos similares</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tienda</TableHead>
              <TableHead>Precio Actual</TableHead>
              <TableHead>Precio Más Bajo</TableHead>
              <TableHead>Diferencia</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStores.map((store) => {
              const isCheapest = store.currentPrice === lowestPrice
              const priceDiff = ((store.currentPrice - lowestPrice) / lowestPrice) * 100

              return (
                <TableRow key={store.storeId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <Store className="h-4 w-4 mr-2 text-muted-foreground" />
                      {store.storeName}
                      {isCheapest && (
                        <Badge variant="success" className="ml-2">
                          Más barato
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(store.currentPrice)}</TableCell>
                  <TableCell>{formatCurrency(store.lowestPriceEver)}</TableCell>
                  <TableCell>
                    {isCheapest ? (
                      <span className="text-green-500">-</span>
                    ) : (
                      <span className="text-destructive">+{priceDiff.toFixed(1)}%</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/stores/${store.storeId}`}
                      className="inline-flex items-center text-sm text-primary hover:underline"
                    >
                      Ver
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

