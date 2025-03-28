import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { PriceAlertForm } from "@/components/price-alert-form";
import { ProductRepository } from "@/lib/repositories/product-repository";
import { PriceHistoryRepository } from "@/lib/repositories/price-history-repository";

export default async function ProductPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  try {
    const { id } = await params;
    const productRepository = new ProductRepository();
    const priceHistoryRepository = new PriceHistoryRepository();

    const product = await productRepository.findById(id);
    if (!product) {
      notFound();
    }

    const priceDecreased = product.previousPrice
      ? product.previousPrice > product.currentPrice
      : false;
    const priceIncreased = product.previousPrice
      ? product.previousPrice < product.currentPrice
      : false;

    const percentageChange = await productRepository.calculatePercentageChange(
      product
    );

    const lowestPrice = await priceHistoryRepository.getLowestPrice(id);

    const highestPrice = await priceHistoryRepository.getHighestPrice(id);

    const priceHistory = await priceHistoryRepository.findByProductId(id);

    return (
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="aspect-square relative rounded-lg overflow-hidden border">
              <Image
                src={product.image || "/placeholder.svg?height=600&width=600"}
                alt={product.name}
                fill
                className="object-contain"
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{product.name}</h2>
              <p className="text-muted-foreground">From {product.store.name}</p>

              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-3xl font-bold">
                  {formatCurrency(product.currentPrice)}
                </span>
                {product.previousPrice && (
                  <span className="text-lg line-through text-muted-foreground">
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

              <p className="text-sm text-muted-foreground">
                Last updated: {product.lastChecked.toLocaleString()}
              </p>

              <div className="pt-4">
                <Button asChild className="w-full">
                  <Link
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on {product.store.name}
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Tabs defaultValue="price-history">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="price-history">Price History</TabsTrigger>
                <TabsTrigger value="price-alerts">Price Alerts</TabsTrigger>
              </TabsList>
              <TabsContent value="price-history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Price History</CardTitle>
                    <CardDescription>
                      Track how the price has changed over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PriceHistoryChart data={priceHistory} />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Lowest Price
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(lowestPrice)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Highest Price
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(highestPrice)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="price-alerts">
                <Card>
                  <CardHeader>
                    <CardTitle>Set Price Alert</CardTitle>
                    <CardDescription>
                      Get notified when the price drops below your target
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PriceAlertForm
                      productId={product.id}
                      currentPrice={product.currentPrice}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(error);
    notFound();
  }
}
