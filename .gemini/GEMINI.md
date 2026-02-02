# Project Context & Rules

## Tech Stack
- **Framework**: Astro (Static Site Generator)
- **Styling**: Scoped CSS in `.astro` files, Global CSS in `src/styles/global.css`
- **Scripting**: Vanilla JavaScript inside `<script>` tags (using Web Components/Custom Elements pattern)
- **Content**: MDX for blog posts

## Key Components & Patterns

### 1. Translation (`<T>` Component)
We use a custom `<T>` component for all text content to support English, Japanese, and Simple English.
**Rule**: Never write raw text in pages/components. Always wrap it in `<T>`.

**Usage:**
```astro
<T>
  <span slot="en">Standard English text</span>
  <span slot="ja">Japanese translation</span>
  <span slot="en_simple">Simple English version</span>
</T>
2. Interactive Components (JavaScript)
We use standard Web Components (Custom Elements) for interactivity to ensure scripts run correctly in Astro's island architecture.

Use CSS variables defined in global.css for consistency:
Colors: var(--accent), var(--background), var(--gray), var(--text)
Fonts: font-family: "Atkinson", sans-serif;
Keep styles scoped within the <style> block of the component whenever possible.

Specific File Locations


Global Styles: src/styles/global.css
Components: src/components/
Pages: src/pages/
Blog Content: src/content/blog/
Assets: src/assets/
