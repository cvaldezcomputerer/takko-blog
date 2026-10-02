import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
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
      heroImageMaxWidth: z.string().optional(),
      cameraUsedName: z.string().optional(),
      cameraUsedImage: z.string().optional(),
      cameraUsedImageAlt: z.string().optional(),
      cameraUsedLink: z.string().optional(),
      cameraUsedLinkLabel: z.string().optional(),
      // Camera to name in the lightbox for photos whose EXIF was stripped.
      // Deliberately separate from `cameraUsedName`, which also renders the
      // "Shot with:" card under the post title.
      cameraFallback: z.string().optional(),
      // File stems that must never show a camera at all: screenshots, diagrams,
      // logos, posters, collages. They have no EXIF, so without this they would
      // silently inherit `cameraFallback` and claim to be photos.
      cameraExclude: z.array(z.string()).optional(),
    }),
});

export const collections = { blog };
