import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      title_ja: z.string().optional(),
      title_en_simple: z.string().optional(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      draft: z.boolean().optional(),
      heroImage: image().optional(),
      heroImageFit: z.string().optional(),
      cameraUsedName: z.string().optional(),
      cameraUsedImage: z.string().optional(),
      cameraUsedImageAlt: z.string().optional(),
      cameraUsedLink: z.string().optional(),
      cameraUsedLinkLabel: z.string().optional(),
    }),
});

export const collections = { blog };
