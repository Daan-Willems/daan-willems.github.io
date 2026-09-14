# Daan Willems — Project Context

This file is the source of truth for project decisions. Anything *not* in here can be derived from the code — what's here is the intent, conventions, and the user's explicit preferences. Read it on every fresh session.

---

## What this is

A single-page promotional/sales site for **Daan Willems** — a car salesman who became viral on social media. He sells:

- **Social posts** (sponsored content)
- **Product placement**
- **Video collabs** (full productions)
- **Stage performances** / live appearances

The page sells these as collaboration packages to brands. It is **not** a portfolio; it is a sales pitch.

### Daan's positioning

- Car salesman first; viral fame followed. **Do not call him an influencer** — he doesn't want that label and we don't use it anywhere on the page.
- His differentiator: he's unfiltered, direct, and himself on camera. **WYSIWYG.** He is who he is, and a diverse audience follows him for exactly that reason.
- He still sells cars — that's the day job, his viral content emerged from it. Frame him as a salesman with reach, not a content creator.

### Tagline (locked)

> **"Eerlijk in beeld, breed in bereik."** (NL, primary)
> "Honest on screen, broad in reach." (EN)

Captures both promises (authenticity + audience size) without naming either bluntly. Sales-deck friendly. Don't change without asking.

---

## Hosting & deploy

- **GitHub Pages**, user/org page (repo: `daan-willems.github.io` → served at root, `baseURL = "/"`).
- **Static** — `nuxi generate` output, no server runtime.
- Deploy: `.github/workflows/deploy.yml` (push to `main` → Pages action).
- A custom domain may be added later; for now PoC on `github.io`.

---

## Stack & non-negotiables

| Choice | Why |
|---|---|
| **Nuxt 4** | latest installment, requested |
| **`@nuxt/content` v3** | source for all section copy, with locale-keyed frontmatter |
| **`@nuxtjs/i18n` v10** | locale routing/state + switcher; messages come from Content, not standard locale files |
| **`better-sqlite3`** | required by Nuxt Content v3 |
| **Plain CSS** + scoped SFC styles + CSS variables for tokens | **No Tailwind. The user dislikes it. Don't reintroduce it.** |
| **NL primary, EN scaffolded** | strategy `no_prefix`; switcher swaps live |
| **Dutch is the source of truth** for copy; EN translations live alongside |

---

## Architecture

### Component contract

Components are **agnostic and reusable across other projects**. Daan-specific data lives in `content/` and `public/data/content.json`, never inside components. New components must follow the same rule — props in, slots for content, no hard-coded brand strings.

**Layout primitives** — `NavBar`, `AppFooter`, `SectionBlock`, `RevealOnScroll`, `Locale`, `LangSwitcher`
**Display** — `HeroStage`, `StatCounter`, `StatStrip`, `Card`, `ServiceCard`, `MarqueeStrip`, `CtaButton`
**Media + interaction** — `MediaEmbed`, `MediaGrid`, `Lightbox`, `ContactTile`

### Composables

- `useCopy(section)` — loads `content/sections/<section>.md`, returns reactive proxy where any locale-keyed property auto-resolves to the current locale. **The plumbing the rest of the app depends on.**
- `useEmbed(url)` — auto-detects YouTube/TikTok/Instagram/Vimeo, returns embed URL + thumbnail.
- `useRuntimeContent()` — fetches `public/data/content.json` **client-side only** (see Runtime JSON rule below).
- `useSocialsData()` — fetches the three `public/data/socials.<platform>.json` files **client-side only**. Those files are written by GitHub Actions, not by the app; nothing calls a social API from the browser.

### Theming

- Tokens in `app/assets/css/tokens.css` — colors, type, spacing, radius, shadows, transitions, z-index.
- Reset + globals in `app/assets/css/base.css`.
- Per-component scoped styles in SFCs.
- Palette: **dark background + gold accent.** Black `#0a0908` base, gold `#d4af37` primary accent, off-white text. Reflects Daan's existing automotive brand.
- Logo: monogram **DW** typographic placeholder for now. To be replaced with an SVG extract from the automotive logo (`daanwillemsautomotive.nl`) once it lands in `original_media/`.

---

## Content / i18n / runtime split

### The split rule

| Where | What | When it changes |
|---|---|---|
| `content/sections/*.md` | Section copy (eyebrows, titles, taglines, intros, CTA labels, prose) | Editorial changes — needs rebuild |
| `public/data/content.json` | Stats, pricing, collabs list, social URLs, contact info, API keys | **Live edits, no rebuild** |
| `app/components/*.vue` | Visual layout, structural strings only via props | Code change |

Apply this rule when adding anything new. Frequently-changing values go in JSON. Editorial structural copy goes in Content. Don't bake numbers, prices, URLs, or contact info into Markdown.

### i18n via Nuxt Content (the chosen pattern)

One markdown file per section. **Both locales live in the same file**, frontmatter properties carry locale sub-keys:

```markdown
---
eyebrow:
  nl: "Wie is Daan"
  en: "Who is Daan"
tagline:
  nl: "Eerlijk in beeld, breed in bereik."
  en: "Honest on screen, broad in reach."
---
```

`useCopy('hero').tagline` returns the current-locale string. Adding a third locale = adding `fr:` keys, no new files or directories. **Do not** split into per-locale folders or per-locale filename suffixes — the user explicitly chose inline locales for maintainability.

For long prose, frontmatter `|` block scalars work today. If we later need real markdown rendering inside content (bold, links, lists in body), we layer on `::locale{lang="nl"}` MDC blocks via the existing `<Locale>` component — keep that door open.

### Runtime JSON rule

`public/data/content.json` is fetched **client-side only** (see `useRuntimeContent.ts` — has `import.meta.server` guard). The whole point is that editing the JSON updates the live site without a redeploy. If you ever feel tempted to fetch this server-side, **don't** — it'd bake values into the prerendered HTML and defeat the design.

The page renders structural copy from Content during SSR, then hydrates and pulls runtime values from JSON. Sections like Stats, Services, Collabs, Socials, and Contact appear empty briefly then populate — this is expected.

---

## Socials: fetched in CI, never from the browser

Social data is fetched by **GitHub Actions**, committed into the repo as JSON, and
read client-side from those static files. No social API is ever called from the
browser, and no token is ever in the bundle. That decision was explicit.

`scripts/fetch-socials.mjs --platform <name>`, one workflow per platform:

| Platform | Source | Workflow | Cadence |
|---|---|---|---|
| YouTube | Data API v3 (`secrets.YOUTUBE_API_KEY`) | `socials-youtube.yml` | 6h at :15 |
| TikTok | public web JSON, no auth | `socials-tiktok.yml` | 6h at :30 |
| Instagram | **Graph API `business_discovery`** (`secrets.IG_USER_ID` + `IG_TOKEN`) | `socials-instagram.yml` | 6h at :45 |

### Media images must be downloaded, never hotlinked

`scontent.cdninstagram.com` URLs are **signed and expire in ~32h** (`oe` is a hex
Unix expiry; `oh` is an HMAC over it, so a longer TTL can't be forged). Storing a
remote URL in the served JSON guarantees broken images within days — that is
exactly how the grid ended up serving six 403s. `cacheImage()` downloads them and
`pruneCacheDir()` must **fail closed**: when a refetch fails, keep the copy already
on disk, because the post is still on the page. Dropping it from the keep-list
deletes a good file *and* leaves a URL that then expires.

### Instagram: don't try to scrape it again

Instagram walled logged-out API access around **2026-09-01**; the old scraper
recorded 0/52 successful feed pages after that. A **residential IP gets the same
`401 require_login`**, so proxies, self-hosted runners and VPN egress do not help.
Migrated on 2026-09-14 to the official `business_discovery` edge.

- `IG_USER_ID` is **our own** IG Business account (the caller), not the target.
- `IG_TOKEN` is a **Business-portfolio system user token — it does not expire.**
  Nothing needs periodic re-auth. Don't replace it with a User token.
- Reading a public professional account needs no access to that account.
- `scripts/probe-ig-graph.mjs` re-verifies the setup gates.

**Known limit:** `business_discovery` returns only media the account *owns*, so
collab/branded posts are absent (121 of 151 at migration, ~11.2M views missing).
Meta exposes these via `collaborative_media`, but **only to the account holder's
own token** — recovering them requires Daan authorising the app. Completeness
means the media cursor ran out, *not* matching `media_count`; `media_count` is
grid-based and counts posts the edge never returns.

**Metric honesty:** `view_count` counts views not unique people, includes paid,
and since April 2026 combines IG+FB views for crossposted reels. Label it views,
never "reach".

---

## Contact methods

Phone, WhatsApp, email — all client-side links via `<ContactTile>`:

- `tel:` for phone
- `https://wa.me/<digits>?text=<message>` for WhatsApp
- `mailto:?subject=&body=` with prefilled subject and body for email

Numbers/email + prefill text in `content.json` under `contact`. The `mailBody` is multi-line (uses `\n`) and pre-fills a structured briefing template so brands don't start from a blank page.

---

## File layout

```
app/
  app.vue                       # NuxtPage host, nothing else
  pages/index.vue               # the single page, composes all sections
  components/                   # 17 reusable primitives
  composables/                  # useCopy, useEmbed, useRuntimeContent, useYouTubeFeed
  assets/css/                   # tokens.css, base.css
content/
  sections/*.md                 # one MD per section, locale-keyed frontmatter
content.config.ts               # Nuxt Content collection schema
scripts/
  fetch-socials.mjs             # the CI fetcher, one --platform per workflow
  probe-ig-graph.mjs            # one-off: verify the Instagram Graph setup
public/
  data/content.json             # runtime-editable (stats, pricing, socials, contact)
  data/socials.*.json           # written by CI, one per platform — do not hand-edit
  images/socials/               # avatars + post thumbnails, downloaded by CI
original_media/                 # raw user drops, GITIGNORED
.github/workflows/deploy.yml    # GH Pages deploy on push to main
.github/workflows/socials-*.yml # one refresh job per platform
.claude/settings.json           # project-scoped permission allowlist
nuxt.config.ts, tsconfig.json, package.json
```

---

## Conventions

- **No comments** unless the *why* is non-obvious. Don't narrate what the code does.
- Components are slot-friendly; expose named slots over rigid props when content might vary.
- Prop names use plain English, not abbreviations (`fromPrice`, not `fp`).
- Locale resolution happens in **one place** (`useCopy` + the page-level mapping for runtime JSON). Components receive resolved strings, not locale maps.
- Animations gate on `prefers-reduced-motion` via the token reset in `tokens.css`.
- Use `RevealOnScroll` to stagger entrance animations on grids; pass `:delay="i * 80"` for cascade.

---

## Tooling

### Permission allowlist

`.claude/settings.json` is committed and lists read-only / build-related Bash commands (Nuxt CLI, npm scripts, git read commands, find/grep). Anything destructive still prompts. **Don't add destructive permissions here without asking.**

### Playwright MCP (UI verification)

Installed at the project level (entry lives under this project's block in `~/.claude.json`) via `claude mcp add --transport stdio playwright -- npx -y @playwright/mcp@latest --headless`. Runs headless so it doesn't pop a Chrome window. **Confirmed connected** but tool schemas only register on a *fresh* Claude Code session — `--resume` does **not** pick up newly-added MCP servers, and config edits to the entry require a fresh session too.

**Use Playwright for UI verification** — actually drive the page, click the lightbox, swap locales, check responsive breakpoints. Do not ship "works for me" claims based on `curl` alone. Type-checking is not feature-correctness.

If Playwright tools aren't surfacing in tool list at session start, the user needs to fully exit (not resume) Claude Code in this directory.

### Typecheck

`npm run typecheck` runs `nuxt typecheck`. Optional: install `typescript-lsp` plugin for live diagnostics.

### Skills to author later (not yet written)

When patterns repeat, write these as `.claude/skills/*.md`:

- `/scaffold-component` — new SFC matching conventions
- `/scaffold-section` — new section + matching `content/sections/*.md`
- `/audit-i18n` — find frontmatter keys missing in `nl` or `en`
- `/check-deploy` — pre-flight before pushing to main

Do **not** write these speculatively. Write them when we've felt the same pattern twice.

---

## Open placeholders / TODOs

These need real input from the user before this can ship:

- [ ] **DW logo SVG** — extract from `daanwillemsautomotive.nl` automotive logo, drop in `public/images/` and replace the typographic monogram fallback in `NavBar` and `AppFooter`.
- [x] **Real stats** — live from the platforms via CI since 2026-09-14. Instagram 163k followers / 70.1M views, TikTok ~137k, YouTube ~44k. Nothing to hand-maintain.
- [ ] **Real pricing** — current `fromPrice` values are guesses. Replace with actual numbers when known.
- [ ] **Real collabs** — only Jorcustom (Kingsday t-shirts, 2025) is a real collab. Others are `Voorbeeld Brand` placeholders.
- [ ] **Real contact info** — phone, WhatsApp, email all placeholders (`+31 6 00 00 00 00`, `info@daanwillems.nl`).
- [x] **YouTube channel ID + API key** — in Actions secrets, fetched in CI (not from the browser, so no referrer restriction needed).
- [x] **TikTok / Instagram posts** — fetched automatically; curated URLs no longer needed. `content.json`'s `socials.instagram` / `socials.tiktok` keys are dead config with no consumer.
- [ ] **Instagram collab/branded posts** — 30 posts (~11.2M views) that `business_discovery` can't return. Needs Daan to authorise the app so `collaborative_media` becomes callable. See the Instagram section above.
- [ ] **Hero background** — currently a dark+gold radial gradient. Could be a hero video or photo when assets land in `original_media/`.
- [ ] **Press/testimonials section** — not yet built; add if user wants it.
- [ ] **Playwright UI pass** — once a fresh session is open, verify the full UI: hero parallax, scroll reveals, stat counters, service-card lightbox, locale swap, mailto/wa/tel hrefs, mobile breakpoints.

---

## User's preferences (specific to this project)

The user noted that other customers / projects have different opinions, so these are **not** to be assumed elsewhere. They apply here:

- **No Tailwind.** Plain CSS, scoped SFC styles, CSS variables.
- **Components reusable across projects** — keep them brand-agnostic.
- **Component-first design** — agree on the component contract before composing pages.
- **JSON over YAML** for runtime config; **Markdown** for prose copy. The user wasn't comfortable with YAML for long text.
- **i18n inline in content files**, not split by directory or filename suffix — easier maintenance.
- **Same file holds both locales** for a given section.
- **Runtime JSON must update without rebuild.** Client-side fetch only.
- **Dutch primary, English secondary** — but EN must work today, not later.
- **Use Playwright** for UI verification once available.
- **Verify via the browser**, not just type-checks or curl.
