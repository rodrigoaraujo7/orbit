import type { ToolCategory } from "./tool-catalog"

/**
 * Same shape as `CatalogTool` (tool-catalog.ts), but lives in the registry
 * store instead of the static catalog — it's user data, not app data.
 */
export type CustomTool = {
  id: string
  name: string
  category: ToolCategory
}
