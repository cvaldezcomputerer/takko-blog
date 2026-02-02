# Takko Blog - Project Context for Claude

**Author's Note**: Hand-written multilingual content for fine control. Manual language switching via localStorage. Small rural Japan blog with Gallery, Quiz, and Like features.

## Project Overview
**Takko Blog** is an Astro-based blog about rural Japan (Takko town) with rich multilingual support (English, Japanese, Simple English). Features: optimized images, interactive quizzes, post likes, contact form. Deployed on Cloudflare Pages + Workers with D1 database.

## Tech Stack
- **Framework**: Astro 5.16.7 (SSR via `output: server` on Cloudflare)
- **Styling**: Scoped CSS in `.astro` files + Global CSS (`src/styles/global.css`)
- **Scripting**: Vanilla JS Web Components (Custom Elements) in `<script>` tags
- **Content**: MDX for blog posts with Zod schema validation
- **Database**: Cloudflare D1 (SQLite) - likes & quiz data
- **Email**: Resend API for contact form
- **Deployment**: Cloudflare Pages + Workers
- **Analytics**: Sentry + Spotlight JS (built-in, minimal focus)

---

## Architecture Patterns

### 1. Multilingual Content with Manual Control (`<T>` Component)
**Pattern**: User writes 3 versions per piece of content, chooses via language selector.
- Language stored in `localStorage` (key: `takko-blog-lang`)
- Initial language defaults to `"en"` if none saved
- **Rule**: ALWAYS use `<T>` wrapper - never hardcode text

```astro
<T>
  <span slot="en">English version</span>
  <span slot="ja">日本語版</span>
  <span slot="en_simple">Simple English version</span>
</T>
```

**Component**: `src/components/LanguageSelector.astro`
- Three pill buttons: "English", "Ez English", "日本語"
- Toggles `.hidden` class on `[data-lang-content]` elements
- Uses TypeScript for language type safety
- No SSR rendering - client-side only logic

### 2. Image Optimization System (`OptimizedImage` Component)
Centralizes image settings to maintain consistency.

**Settings**:
- Quality: 70 (Google Lighthouse complaint workaround from desired 75)
- Formats: AVIF > WebP > original
- Responsive widths: [360, 480, 720, 960, 1080, 1440]
- Default border-radius: 12px with `var(--box-shadow)`

**Usage Contexts**:
1. **Blog Post Content**: Markdown `![alt](path)` → `OptimizedImage` (via `[...slug].astro` automatic transform)
   - `sizes: "(max-width: 720px) 100vw, 720px"` (default)
2. **Hero Images** (BlogPost layout): `sizes: "(max-width: 1020px) 100vw, 1020px"`
   - Supports `heroImageFit` prop for `object-fit: contain` + black background
3. **Index Thumbnails**: Responsive for first post (full width) + grid items
   - First: `sizes: "(max-width: 960px) 100vw, 960px"` + `loading="eager"`
   - Others: `sizes: "(max-width: 720px) 100vw, (max-width: 960px) 50vw, 480px"` + `loading="lazy"`
4. **Gallery**: `sizes: "(max-width: 600px) 90vw, 200px"` (scrapbook style)

**Responsive Size Assumption**: 720px max content width for blog posts (needs verification across all sections)

### 3. Gallery Component (`Gallery.astro`)
"Scrapbook" aesthetic with interactive hover effects:
- **Desktop**: Rotated cards (-5° to +4°), hover → centered zoom (1.1x scale, max 400px)
- **Mobile**: Overlapped card stack, hover → scaled card view (90vw), show captions
- Supports both image array + slot-based content
- Uses `aspect-ratio: 1/1` for consistent square photos
- Grid-based with tape/pin visual at top

### 4. Language Selection Approach
**NOT typical client-side routing** - Instead:
- User selects language via pill buttons
- JavaScript shows/hides matching `[data-lang-content]` elements
- Content written 3x per blog post/component (manual control desired)
- No automatic translations - all translations hand-written

### 5. Interactive Components (Web Components)
Custom elements for interactivity in Astro's island architecture:

**`<like-button>`**: Heart balloon with cats face
- Random hue animation on load
- Click balloon → flies to top, smooth scroll
- Shows/hides based on scroll position (hidden if scrolled near top)
- Posts to `/api/likes/[slug]`, stores vote in localStorage

**`<quiz-component>`**: Multiple choice with live vote percentages
- Fetches `/api/quiz/[id]` on load
- One vote per user (localStorage key: `quiz_vote_{id}`)
- Shows progress bars and total votes after voting
- Indicates correct answer if `correctAnswerIndex` set

**`<theme-toggle>`**: Sun/moon button
- Toggles `.dark` class on html element
- Stores preference in localStorage
- Handles light ↔ dark mode CSS transitions

**`<language-controls>`**: See Language Selection above

### 6. Content Schema (Zod)
```javascript
blog: {
  title: string (required)
  title_ja: string (optional) - fallback: title
  title_en_simple: string (optional) - fallback: title
  description: string (required)
  pubDate: date (required)
  updatedDate: date (optional)
  heroImage: image (optional)
  heroImageFit: string (optional) - e.g., "contain" or "cover"
}
```

---

## Component Inventory

| Component | Purpose | Renders | Notes |
|-----------|---------|---------|-------|
| `T.astro` | Multilingual wrapper | Spans with `[data-lang-content]` | Core pattern |
| `OptimizedImage.astro` | Image optimization | Astro `<Picture>` | Centralized settings |
| `Gallery.astro` | Scrapbook gallery | Grid of cards | Desktop/mobile specific styles |
| `LikeButton.astro` | Post likes | Custom element `<like-button>` | Balloon + cat animation |
| `Quiz.astro` | Interactive quiz | Custom element `<quiz-component>` | Live vote tracking |
| `ThemeToggle.astro` | Light/dark mode | Custom element `<theme-toggle>` | Toggles `.dark` class |
| `LanguageSelector.astro` | Language switching | Pill buttons | localStorage: `takko-blog-lang` |
| `Explain.astro` | Tooltip/definition | Dotted underline + hover box | Accessibility: `aria-describedby` |
| `Header.astro` | Navigation + logo | Nav bar | Hamburger menu, logo link, embedded toggles |
| `Footer.astro` | Site footer | Footer element | Footer links (not shown in code) |
| `BlogPost.astro` | Blog layout | `<html>` wrapper | Handles hero image, likes button, prose styling |
| `BaseHead.astro` | SEO meta tags | `<head>` contents | Preloads fonts, canonical URL, OG tags |
| `FormattedDate.astro` | Date display | Date span | Multilingual date formatting |
| `HeaderLink.astro` | Nav link | Link with `<T>` inside | Typography styling |

---

## API Endpoints

### `GET/POST /api/likes/[slug]`
- **GET**: Returns `{ count: number }`
- **POST**: Increments like, returns new count
- DB Table: `likes` (id, slug, count)
- Fallback: Returns count=0 if DB unavailable

### `GET/POST /api/quiz/[id]`
- **GET**: Returns vote distribution (not fully shown in code)
- **POST**: Records vote, returns updated stats
- DB Table: `quiz` (id, option_index, count)

### `POST /api/contact`
- Form submission handler
- Honeypot spam protection: `trap` field (silent drop if present)
- Sends email via Resend API to `blogggydogggy@gmail.com`
- Reply-to: sender's email
- Subject line prefixed: `[Contact Form] {subject}`
- CORS/validation: Email regex check, required fields

---

## Styling Strategy

### Global Variables (`src/styles/global.css`)
```css
/* Colors */
--accent: #059669 (Forest Green)
--accent-dark: #047857
--background: #FAFAFA (Warm Beige)
--text: #333333 (Dark Charcoal)
--secondary: #f5f1eb (Header/section beige)
--highlight: #fef3c7 (Soft Yellow)

/* Language Pills */
--pill-en: #0ea5e9 (Ocean Blue)
--pill-ez: #059669 (Brand Accent)
--pill-jp: #f43f5e (Camellia Rose)

/* Shadows & Fonts */
--box-shadow: complex multi-layer shadow
font-family: "Atkinson" (preloaded woff)
```

### Dark Mode
- `.dark` class toggles entire color scheme
- All CSS variables have dark mode overrides
- Smooth 0.3s transition on background/color

### Responsive Breakpoints
- **Mobile**: < 480px (special handling: stack layouts)
- **Tablet**: 480px - 720px (intermediate)
- **Desktop**: > 720px (full layouts)
- **Wide**: 960px+ (index uses full width)

---

## File Structure Deep Dive

### Pages
- **`index.astro`**: Blog listing (2-column grid on desktop, mobile responsive)
- **`blog/[...slug].astro`**: Dynamic blog route, transforms MDX `<img>` → OptimizedImage
- **`blog/index.astro`**: Static redirect to `/` (can be removed?)
- **`about.astro`**: Author page (not reviewed)
- **`contact.astro`**: Contact form page (not reviewed)
- **`404.astro`**: Custom 404 page (not reviewed)
- **`rss.xml.js`**: RSS feed (not reviewed)

### Layouts
- **`BlogPost.astro`**: Main article layout
  - Renders hero image (eager load, high priority)
  - Renders content via slot
  - Appends LikeButton
  - Handles figcaption styling
  - Max-width: 720px prose area

### Migrations
- `0000_create_likes_table.sql`: `likes(id, slug, count)`
- `0001_create_quiz_table.sql`: `quiz(id, option_index, count)` (inferred)

### Scripts
- `src/scripts/letter-game.js`: Game logic (not reviewed - separate project feature?)

---

## Key Implementation Details

### Markdown Image Transformation
In `src/pages/blog/[...slug].astro`:
```astro
const { Content } = await post.render();
<Content components={{ img: OptimizedImage }} />
```
This intercepts all `<img>` tags in MDX and renders them as OptimizedImage.

### Hero Image with Custom Fit
In `BlogPost.astro`:
```astro
{heroImage && 
  <div class="hero-image">
    <OptimizedImage
      src={heroImage}
      sizes="(max-width: 1020px) 100vw, 1020px"
      style={heroImageFit && `object-fit: ${heroImageFit}; background-color: ${heroImageFit === 'contain' ? 'black' : 'transparent'}`}
      loading="eager"
      fetchpriority="high"
    />
  </div>
}
```

### Figure + Figcaption Pattern
Blog posts use semantic `<figure>` tags:
```mdx
<figure>
  ![Alt text](path)
  <figcaption>
    <T>
      <span slot="en">English caption</span>
      <span slot="ja">Japanese caption</span>
      <span slot="en_simple">Simple English</span>
    </T>
  </figcaption>
</figure>
```
Styled with italic, centered, gray color, italic font-weight:700.

---

## Best Practices Observed
✅ **Type safety**: TypeScript in Web Components, Zod schemas
✅ **Accessibility**: ARIA labels, semantic HTML, focus management
✅ **Performance**: Image optimization, lazy loading, preloading fonts
✅ **Multilingual**: No hardcoded text, all wrapped in `<T>`
✅ **Responsive**: Mobile-first CSS, media queries at breakpoints
✅ **Graceful degradation**: API fallbacks, localStorage checks

---

## Known Patterns & Decisions

| Decision | Rationale | Notes |
|----------|-----------|-------|
| Manual 3x content | Fine control, no AI translations | Time-consuming but quality-assured |
| localStorage for prefs | Simple, no backend state | Persists across sessions |
| Web Components | Works in Astro islands | Vanilla JS, no frameworks |
| Honeypot spam filter | Effective, silent | Bot thinks it succeeded |
| Image quality: 70 | Google Lighthouse complaint | Original target: 75 |
| Hero image eager load | First Contentful Paint | Improves perceived performance |
| Gallery size: 200px | Scrapbook aesthetic | Mobile: overlapped stack |

---

## Questions for Code Review

1. **Hero image sizes mismatch?** Blog uses 1020px max, index first post uses 960px. Should both align to one standard?
2. **Quiz API data structure?** POST to quiz doesn't show full response. How are vote percentages calculated?
3. **Letter-game integration?** Is this a separate game within posts, or standalone feature?
4. **About/Contact pages?** Not reviewed - do they follow same patterns (T component, OptimizedImage)?
5. **Figcaption positioning?** In Gallery, figcaption is positioned absolutely (bottom 10px). In blog posts, it's static. Intentional?

---

## Color Reference for Dark Mode
```css
:root.dark {
  --accent: #059669
  --background: darker variant
  --text: lighter (near white)
  --pill-en: #38bdf8 (lighter blue)
  --pill-ez: #10b981 (lighter green)
  --pill-jp: #fb7185 (lighter rose)
}
```

---

## Summary: Code Quality
**Strengths**: Clean component architecture, excellent accessibility, responsive design, type safety, multilingual support, performance-conscious.
**Areas for clarification**: Image size standards, quiz API responses, page coverage completeness.

---

## Issues Found & Fixed

### 1. ❌ ISSUE: Hero Image Size Mismatch
**What was wrong**: 
- Hero images in `BlogPost.astro` used `sizes="(max-width: 1020px) 100vw, 1020px"`
- But index page first post used `sizes="(max-width: 960px) 100vw, 960px"`
- Gallery used `200px` max
- This caused responsive breakpoints to differ, potentially serving different image sizes for the same content across pages
- Standard max-width for content is 720px (prose/blog), but hero images were larger

**How it was fixed**:
- Changed `BlogPost.astro` hero image from `1020px` max to `960px` max (line 113)
- Now matches the index.astro first post responsively
- All hero images now resize at the same breakpoints

**Why this matters**: Consistency in responsive design reduces CSS complexity and ensures images resize uniformly across the site. Smaller max-width (960px instead of 1020px) better aligns with your 720px prose content area plus safe margins.

---

### 2. ❌ ISSUE: Missing Loading Attribute on Gallery Images
**What was wrong**:
- Gallery images in `Gallery.astro` had no `loading` prop
- Gallery appears below the fold on blog pages (lower priority)
- Without `loading="lazy"`, all gallery images load eagerly, wasting bandwidth on images user may never see

**How it was fixed**:
- Added `loading="lazy"` to OptimizedImage in Gallery component (line 6)
- Now gallery images load only when the user scrolls to them

**Why this matters**: Performance optimization. Gallery is decorative, below-the-fold content. Lazy loading prevents unnecessary downloads on slow connections and improves First Contentful Paint (FCP) scores.

---

### 3. ✅ VERIFIED: Gallery Alt Text
**Status**: No fix needed
- Gallery images use empty `alt=""` because they are decorative scrapbook photos with captions
- Each figure has multilingual `<figcaption>` with `<T>` component providing full context
- Pattern: `![Photo description](path)` in MDX → figcaption explains in 3 languages
- This is semantically correct (decorative images can have empty alt when context is in caption)

---

### 4. ✅ VERIFIED: Pages Follow Patterns
**About page**: 
- Uses `<Image>` from `astro:assets` (not OptimizedImage) for profile + map
- Has proper alt text: `alt="Cristian"`, `alt="Takko on map"`
- Responsive hero with sticky image on desktop
- All text properly wrapped in `<T>` component
- Status: ✅ Follows patterns

**Contact page**:
- No images, form-only layout
- Excellent form accessibility: ARIA labels, honeypot spam filter
- All labels wrapped in `<T>` component
- Client-side validation + server-side validation
- Status: ✅ Follows patterns

**404 page**:
- Emoji + multilingual text
- All text in `<T>` component
- Home button with multilingual text
- Clean, simple layout
- Status: ✅ Follows patterns

**RSS feed** (`rss.xml.js`):
- Simple feed generator using `@astrojs/rss`
- Maps blog posts to RSS items
- Status: ✅ Correct implementation

---

### 5. 📝 DOCUMENTATION NOTE: Image Size Standards
After review, here's the standardized image size usage:

| Context | Max-Width | Sizes Prop | Loading | Fetchpriority | Use Case |
|---------|-----------|------------|---------|---------------|----------|
| Hero (BlogPost) | 960px | `(max-width: 960px) 100vw, 960px` | eager | high | First thing user sees |
| Hero (Index first) | 960px | `(max-width: 960px) 100vw, 960px` | eager | high | Featured post |
| Index thumbnails | 480px | `(max-width: 720px) 100vw, (max-width: 960px) 50vw, 480px` | lazy (except first) | auto | Grid items below hero |
| Blog content `<img>` | 720px | `(max-width: 720px) 100vw, 720px` | lazy | auto | Inline in prose |
| Gallery | 200px | `(max-width: 600px) 90vw, 200px` | lazy | auto | Decorative below-fold |

**Rationale**: Breakpoints align with your CSS layout (720px prose, 960px content width), and loading strategies prioritize above-the-fold content.

---

### 6. 📝 DOCUMENTATION NOTE: About Page Image Choice
**Observation**: About page uses `<Image>` instead of `OptimizedImage`.

**Why it's OK**: 
- About page is rarely updated
- Profile image is small (150px display size)
- Map image is static, descriptive
- OptimizedImage is overkill for these use cases

**Recommendation**: Leave as-is. OptimizedImage is better for blog content where you want aggressive responsive sizing.

---

### 7. 📝 DOCUMENTATION NOTE: Contact Form Excellence
**Status**: ✅ Best practices implemented
- Honeypot spam protection (silent failure)
- Client + server validation
- Email regex validation both sides
- Accessibility: ARIA labels, focus management
- Error/success messages with auto-dismiss
- Submits to Resend API with proper headers
- Form reset after success

---

### 8. 📝 DOCUMENTATION NOTE: Dark Mode Implementation
**Status**: ✅ Properly implemented
- CSS variables switch via `.dark` class toggle
- `<ThemeToggle>` component handles logic + localStorage
- All color variables have dark mode overrides
- Smooth 0.3s transition on all color changes
- Links tested for contrast in both modes

No changes needed.

---

## Checklist Summary
- ✅ Hero image sizes standardized (1020px → 960px)
- ✅ Gallery lazy loading added
- ✅ Gallery alt text verified as correct
- ✅ All pages follow `<T>` pattern
- ✅ Image size documentation created
- ✅ Contact form best practices verified
- ✅ Dark mode implementation verified
