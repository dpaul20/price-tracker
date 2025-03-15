import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface ProductCardProps {
  product: {
    id: string
    name: string
    image: string | null
    currentPrice: number
    previousPrice: number | null
    percentageChange: number
    store: {
      id: string
      name: string
    }
    lastUpdated: string
  }
}

export default function ProductCard({ product }: ProductCardProps) {
  const priceIncreased = product.percentageChange > 0
  const priceDecreased = product.percentageChange < 0

  return (
    <Card className="overflow-hidden">
      <Link href={`/products/${product.id}`}>
        <div className="aspect-square relative">
          <Image
            src={product.image || "/placeholder.svg?height=300&width=300"}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold line-clamp-1">{product.name}</h3>
          <p className="text-sm text-muted-foreground">{product.store.name}</p>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold">{formatCurrency(product.currentPrice)}</span>
            {product.previousPrice && (
              <span className="text-sm line-through text-muted-foreground">
                {formatCurrency(product.previousPrice)}
              </span>
            )}
          </div>

          {product.percentageChange !== 0 && (
            <Badge variant={priceDecreased ? "success" : priceIncreased ? "destructive" : "outline"} className="mt-2">
              {priceDecreased ? "↓" : "↑"} {Math.abs(product.percentageChange)}%
            </Badge>
          )}
        </CardContent>
      </Link>
      <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">Last updated: {product.lastUpdated}</CardFooter>
    </Card>
  )
}

