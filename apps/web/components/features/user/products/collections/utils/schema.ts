// ...existing code...
import { z } from "zod";

export const collectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.any().optional(),
  visible: z.boolean(), // <-- Make required with default
  featured: z.boolean(), // <-- Make required with default
  items: z.array(z.string()).min(1, "At least one item"),
});
// ...existing code...
