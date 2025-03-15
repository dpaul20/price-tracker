import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">404</h1>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">Page not found</h2>
        <p className="mt-4 text-base text-muted-foreground">Sorry, we couldn't find the page you're looking for.</p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/">Go back home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

