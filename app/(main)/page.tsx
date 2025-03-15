import Link from "next/link";
import { Button } from "@/components/ui/button";

import ProductCard from "@/components/product-card";
import { ProductRepository } from "@/lib/repositories/product-repository";

export default async function HomePage() {
  const productRepository = new ProductRepository();
  const latestProducts = await productRepository.getLatestProducts(6);
  return (
    <div className="container py-8">
      <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="flex max-w-[980px] flex-col items-start gap-2">
          <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl lg:leading-[1.1]">
            Track prices, save money
          </h1>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            Monitor product prices across multiple stores and get notified when
            they drop.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" asChild>
            <Link href="/track">Track a Product</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/products">View All Products</Link>
          </Button>
        </div>
      </section>

      <section className="py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Latest Products</h2>
          <Button variant="outline" asChild>
            <Link href="/products">View All</Link>
          </Button>
        </div>

        {latestProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {latestProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No products tracked yet
            </p>
            <Button asChild>
              <Link href="/track">Track Your First Product</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="py-12">
        <h2 className="text-2xl font-bold tracking-tight mb-6">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="bg-primary/10 p-4 rounded-full">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Add Products</h3>
            <p className="text-muted-foreground">
              Enter the URL of any product you want to track
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="bg-primary/10 p-4 rounded-full">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2v20" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Track Prices</h3>
            <p className="text-muted-foreground">
              We&apos;ll monitor prices and keep a history of changes
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="bg-primary/10 p-4 rounded-full">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Get Alerts</h3>
            <p className="text-muted-foreground">
              Set price alerts and get notified when prices drop
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
