import ProductCard from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { ProductRepository } from "@/lib/repositories/product-repository";
import Link from "next/link";

export default async function ProductsPage() {
  const productRepository = new ProductRepository();
  const products = await productRepository.findAll();

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">All Products</h1>
        <Button asChild>
          <Link href="/track">Track New Product</Link>
        </Button>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No products tracked yet</p>
          <Button asChild>
            <Link href="/track">Track Your First Product</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
