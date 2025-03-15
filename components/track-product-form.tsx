"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { trackProduct } from "@/lib/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
})

export function TrackProductForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    error?: string
    productId?: string
  } | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    setResult(null)

    try {
      const response = await trackProduct(values.url)
      console.log(response)
      setResult(response)

      if (response.success && response.productId) {
        // Redirect to product page after a short delay
        setTimeout(() => {
          router.push(`/products/${response.productId}`)
        }, 2000)
      }
    } catch (error) {
      setResult({
        success: false,
        error: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/product" {...field} />
                </FormControl>
                <FormDescription>Enter the full URL of the product you want to track</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Track Product"
            )}
          </Button>
        </form>
      </Form>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{result.success ? result.message : result.error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border p-4">
        <h3 className="font-medium mb-2">Supported Stores</h3>
        <p className="text-sm text-muted-foreground">
          Our price tracker works with most major online retailers, including:
        </p>
        <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
          <li>Amazon</li>
          <li>Walmart</li>
          <li>Best Buy</li>
          <li>Target</li>
          <li>eBay</li>
          <li>And many more...</li>
        </ul>
      </div>
    </div>
  )
}

