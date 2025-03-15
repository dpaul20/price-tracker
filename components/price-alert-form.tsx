"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { createPriceAlert } from "@/lib/actions"
import { logger } from "@/lib/logger"

interface PriceAlertFormProps {
  productId: string
  currentPrice: number
}

const formSchema = z.object({
  targetPrice: z.coerce
    .number()
    .positive("Target price must be positive")
    .refine((val) => !isNaN(val), {
      message: "Please enter a valid number",
    }),
})

export function PriceAlertForm({ productId, currentPrice }: PriceAlertFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    error?: string
  } | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetPrice: Math.floor(currentPrice * 0.9), // Default to 10% below current price
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    setResult(null)

    try {
      // Mock user ID for now - in a real app, this would come from authentication
      const userId = "user-1"

      const response = await createPriceAlert(productId, userId, values.targetPrice)
      setResult(response)
    } catch (error) {
      logger.error("Error creating price alert:", error)
      setResult({
        success: false,
        error: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="targetPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormDescription>Current price: {formatCurrency(currentPrice)}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Alert...
              </>
            ) : (
              "Create Price Alert"
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
    </div>
  )
}

