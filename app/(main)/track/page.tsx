import { TrackProductForm } from "@/components/track-product-form"

export default function TrackPage() {
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Track a New Product</h1>
          <p className="text-muted-foreground">Enter the URL of a product you want to track</p>
        </div>
        <TrackProductForm />
      </div>
    </div>
  )
}

