import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@prisma/client";
import { ProductRepository } from "@/lib/repositories/product-repository";
import { StoreRepository } from "@/lib/repositories/store-repository";

interface ProductCardProps {
  product: Product;
}

export default async function ProductCard({
  product,
}: Readonly<ProductCardProps>) {
  const productRepository = new ProductRepository();
  const storeRepository = new StoreRepository();
  const priceDecreased = product.previousPrice
    ? product.previousPrice > product.currentPrice
    : false;
  const priceIncreased = product.previousPrice
    ? product.previousPrice < product.currentPrice
    : false;

  const percentageChange = await productRepository.calculatePercentageChange(
    product
  );

  const store = await storeRepository.findById(product.storeId);

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
          <p className="text-sm text-muted-foreground">{store?.name}</p>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold">
              {formatCurrency(product.currentPrice)}
            </span>
            {product.previousPrice && (
              <span className="text-sm line-through text-muted-foreground">
                {formatCurrency(product.previousPrice)}
              </span>
            )}
          </div>

          {percentageChange !== 0 && (
            <Badge
              variant={
                priceDecreased
                  ? "secondary"
                  : priceIncreased
                  ? "destructive"
                  : "outline"
              }
              className="mt-2"
            >
              {priceDecreased ? "↓" : "↑"} {Math.abs(percentageChange)}%
            </Badge>
          )}
        </CardContent>
      </Link>
      <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
        Last updated: {product.lastChecked.toLocaleString()}
      </CardFooter>
    </Card>
  );
}
