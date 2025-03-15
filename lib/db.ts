import { neon } from "@neondatabase/serverless"
import { logger } from "./logger"

// Create a SQL client with the Neon serverless driver
export const sql = neon(process.env.DATABASE_URL!)

// Helper function to execute SQL with error handling
export async function executeQuery<T>(query: string, params: any[] = []): Promise<T> {
  try {
    return (await sql(query, params)) as T
  } catch (error) {
    logger.error("Database query error:", error)
    throw new Error(`Database query failed: ${(error as Error).message}`)
  }
}

// Generate a unique ID (similar to cuid)
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

