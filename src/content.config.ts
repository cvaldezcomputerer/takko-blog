import { defineCollection, z, type SchemaContext } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: ({ image }: SchemaContext) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(),
    }),
});

export const collections = { blog };
