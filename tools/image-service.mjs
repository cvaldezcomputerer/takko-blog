// Build-time image service: Astro's sharp service, re-exported under our own
// path so that `image.service.config` survives.
//
// The Cloudflare adapter's `compile` mode replaces `image.service` with its
// workerd stub unless `hasUserImageService()` is true, and that helper returns
// false for the literal entrypoint "astro/assets/services/sharp" (see
// @astrojs/cloudflare/dist/utils/image-config.js). Pointing `entrypoint` here
// instead makes the adapter keep our service object, so the encoder options in
// astro.config.mjs actually reach sharp during `collectStaticImages()`.
//
// Only used at build time — in `compile` mode every image is pre-optimized and
// the runtime uses the passthrough endpoint, so `transform` is never called in
// workerd.
export { default } from "astro/assets/services/sharp";
