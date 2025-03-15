"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { trackProduct } from "@/lib/actions"

const formSchema = z.object({
  url: z.string().url({ message: "Por favor ingresa una URL válida" }),
})

export function AddProductForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      const result = await trackProduct(values.url)

      if (result.success) {
        toast({
          title: "Producto agregado",
          description: "El producto ha sido agregado correctamente y comenzaremos a rastrear su precio.",
        })
        router.push(`/products/${result.productId}`)
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo agregar el producto. Intenta nuevamente.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al agregar el producto. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL del producto</FormLabel>
              <FormControl>
                <Input placeholder="https://www.venex.com.ar/productos/ejemplo" {...field} />
              </FormControl>
              <FormDescription>Ingresa la URL completa del producto que deseas rastrear</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Agregando producto...
            </>
          ) : (
            "Agregar producto"
          )}
        </Button>
      </form>
    </Form>
  )
}

