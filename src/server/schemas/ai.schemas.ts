import { z } from "zod";

export const analyzeDraftSchema = z.object({
  title: z.string().optional(),
  description: z.string().min(1, "Issue description is required"),
  image: z.string().optional(),
  location: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional()
    })
    .optional()
});
