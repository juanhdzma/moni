---
name: Moni
description: Compact card dashboard for one household's money, where every card says in one sentence what its numbers mean.
colors:
  background: "#fafafa"
  foreground: "#09090b"
  card: "#ffffff"
  muted: "#f4f4f5"
  muted-foreground: "#6b6b74"
  border: "#e4e4e7"
  ring: "#a1a1aa"
  cartera: "#2563eb"
  inversiones: "#16a34a"
  inversiones-text: "#15803d"
  activos: "#d4961c"
  activos-text: "#a16207"
  deudas: "#dc2626"
  alerta: "#d97706"
  background-dark: "#131518"
  foreground-dark: "#f2f2f3"
  card-dark: "#1b1e21"
  muted-dark: "#24272b"
  muted-foreground-dark: "#9a9ea5"
  border-dark: "#2a2d31"
  ring-dark: "#5b6068"
  cartera-dark: "#6c9be8"
  inversiones-dark: "#46b25e"
  inversiones-text-dark: "#5cc272"
  activos-dark: "#e2b04f"
  deudas-dark: "#ef5c53"
  alerta-dark: "#f0a020"
typography:
  display:
    fontFamily: "'Archivo Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
    fontFeature: "'tnum'"
  headline:
    fontFamily: "'Archivo Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
    fontFeature: "'tnum'"
  title:
    fontFamily: "'Archivo Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
  body:
    fontFamily: "'Archivo Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.375
    fontFeature: "'tnum'"
  body-sm:
    fontFamily: "'Archivo Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "'tnum'"
  label:
    fontFamily: "'Archivo Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
    fontFeature: "'tnum'"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  hairline: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "16px"
  panel-wide:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: "20px"
  segmented:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "2px"
  segmented-item:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "28px"
    padding: "0 8px"
  segmented-item-on:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
  nav-pill:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  nav-pill-active:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
  button-confirm:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    size: "32px"
  button-quiet:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    size: "32px"
  fab:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.full}"
    size: "56px"
  bar-track:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.full}"
    height: "8px"
  composition-bar:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.full}"
    height: "12px"
---

# Design System: Moni

## Overview

**Creative North Star: "The Annotated Ledger"**

Moni is a compact card dashboard. Each card states its finding in one plain Spanish sentence ("Subiste +$20,1M desde fin de jun.", "Arriendo se lleva el 39% de lo que gastaste en el último mes"), then shows the chart, list or sum that backs it up. The cards use the shadcn neutral style: white panels on an off-white ground with hairline borders, or near-black panels on a cool charcoal ground in dark mode. The theme follows the system preference and the app has no theme toggle.

The density is set by the owner. The dashboard replaced an Isotype layout that was rejected for being empty and wasting space, so every block takes only the room its content needs. Color carries meaning, not decoration. Four fixed domain colors (activos ochre, inversiones green, cartera blue, deudas red) are the only hues allowed, and they show up wherever those domains appear. Everything else is neutral. Sums are shown the way an adding machine would: entró, salió, a rule, then te quedó.

Archivo sets every word and every number, with tabular figures across the whole document so amounts line up in columns. The app has no display face, no monospace and no decorative type.

**Key Characteristics:**
- One plain-language sentence at the top of every card, before any chart or list.
- Compact cards: 16px padding (20px from 640px), 12 to 16px gaps between cards.
- Four domain colors with fixed meanings; the rest is neutral.
- Archivo only, with tabular figures everywhere.
- Flat surfaces with hairline borders; shadows only on floating or selected elements.
- Light and dark themes follow `prefers-color-scheme`.

## Colors

Neutral zinc-family surfaces carry the structure, and four domain colors carry the meaning.

### Primary
- **Ink** (foreground; dark mode foreground-dark): text, the active nav pill, the confirm button, the FAB, and the 2px rule above a sum. In this system the shadcn `primary` is Ink, not a brand hue.

### Domain colors
- **Cartera Blue** (cartera / cartera-dark): available cash, money that came in, the patrimonio line on the evolution chart, the "entró" bars, and the selection highlight (mixed at 30%).
- **Inversiones Green** (inversiones / inversiones-dark): fills only, meaning composition bar segments, chips and chart series. When it is used on text, switch to **Inversiones Text** (inversiones-text / inversiones-text-dark), which is darker in light mode so small figures pass AA. That covers gains, positive projections and savings rates.
- **Activos Ochre** (activos / activos-dark): fills for assets. Text uses **Activos Text** (activos-text), a deeper ochre that stays legible on white.
- **Deudas Red** (deudas / deudas-dark): debts, money that went out, overdue dates, negative balances and errors. `destructive` is an alias of it.
- **Alerta Amber** (alerta / alerta-dark): only the 6px stale-price dot on a nav item. It never appears as text.

### Neutral
- **Ground** (background / background-dark): the page behind the cards, and the translucent sticky header (90% plus a blur).
- **Panel** (card / card-dark): card surfaces, popovers, and the selected segment of a segmented control.
- **Wash** (muted / muted-dark): the track of a segmented control, the empty part of a bar, hover fills and loading skeletons.
- **Quiet Ink** (muted-foreground / muted-foreground-dark): card titles, secondary lines, axis labels and unselected nav items.
- **Hairline** (border / border-dark): card borders, list dividers and chart grid lines.
- **Ring** (ring / ring-dark): the 2px focus outline.

### Named Rules
**The Four Meanings Rule.** Activos is ochre, inversiones is green, cartera is blue, deudas is red, on every surface and in every chart. No fifth hue is ever introduced, and none of these colors is borrowed for decoration or for an unrelated meaning.

**The Text Variant Rule.** Green and ochre each have a fill value and a text value. Any figure or word set in those colors uses the `-text` token. Blue and red are AA on both grounds as they are.

**The Neutral Spending Rule.** Spending-by-category bars are drawn in Ink at 75%, not in a domain color. A category is not a domain, and red is kept for debt and outflow.

## Typography

**Body Font:** Archivo Variable (self-hosted via @fontsource, falling back to ui-sans-serif, system-ui)

**Character:** A single slightly grotesque sans that handles both prose and figures. Tabular numerals (`font-variant-numeric: tabular-nums` on body) keep amounts aligned in lists and sums.

### Hierarchy
- **Display** (600, 30px on mobile and 36px from 640px, tight tracking): only the patrimonio figure, one per screen.
- **Headline** (600, 18px): the four composition values under the patrimonio bar.
- **Title** (600, 14px, Quiet Ink): card titles. They name the card; the sentence below says what it means.
- **Body** (400, 15px, line-height 1.375): the interpretive sentence and sum lines. Key figures inside the sentence go semibold, and take their domain color when the sign matters.
- **Body small** (400, 14px): list rows, nav items, empty states.
- **Label** (400, 12 to 13px, Quiet Ink): secondary lines, dates, captions, chart ticks, segmented items (500).

### Named Rules
**The One Face Rule.** Archivo sets every word and number. Don't add a monospace for amounts or a display face for headings.

**The Weight Over Size Rule.** Emphasis inside a sentence or list comes from weight (600) and domain color, not from larger type. Only the patrimonio figure is big.

## Layout

The content column is capped at 1240px and centered, with 12px side padding on mobile and 24px from 768px. The sticky header is 56px tall and includes the safe-area inset.

The dashboard starts with a full-width patrimonio strip. Below it, from 1024px, comes a 12-column grid split 7/5: the left column holds evolution, spending and recent movements; the right holds this month and upcoming. On narrower screens it becomes one column, with order set explicitly through CSS `order` (evolution, spending, this month, upcoming, movements). Gaps are 12px on mobile and 16px on desktop.

Inside a card, the title row has a 12px bottom margin, the sentence 16px, and list rows are 6 to 8px tall with hairline dividers between them. The bottom padding on main reserves room for the FAB.

### Named Rules
**The Compact Rule.** Nothing gets space it doesn't need. Cards are sized by their content, with no fixed heights beyond the chart itself (200px area, 120px bars), no hero padding and no empty decorative bands. If a block looks sparse, merge it or shrink it. Don't pad it.

**The Sentence First Rule.** Every card opens with one plain-language sentence that interprets its numbers, such as "Te quedó el 63,4% de lo que entró" or "Tenés 1 pago vencido y $1.145.000 por pagar en 45 días". The chart, list or sum that follows is the evidence. A card that only shows numbers is unfinished.

## Elevation & Depth

Surfaces are flat, and a hairline border plus the step from ground to panel does the separating. Shadows appear only on elements that float above the page or show selection.

### Shadow Vocabulary
- **Selected segment** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): the active item of a segmented control.
- **Floating** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): the FAB and the Sheet drawer.

### Named Rules
**The Flat Panel Rule.** Cards never get a shadow. Depth comes from the border and the change in surface color.

## Shapes

Corners are softly rounded on a 10px base (`--radius`): cards use 14px, segmented tracks and icon buttons 8px, segments and small controls 6px. Bars, the composition strip, nav pills and the FAB are fully round. Legend chips in the composition list are 8px squares with 2px corners, matching the four squares of the logo. Bar chart columns are rounded only at the top (3px).

## Components

### Panel (card)
The single container for dashboard content.
- **Corner Style:** 14px.
- **Background:** Panel, hairline border, no shadow.
- **Internal Padding:** 16px, 20px from 640px.
- **Structure:** a title row (Title style, with optional controls aligned right and wrapping beneath on narrow widths), then the interpretive sentence (Body), then the content.

### Segmented control (Periodos)
A period or series picker, restyled from shadcn toggle-group.
- **Style:** Wash track at 8px radius with 2px padding. Items are 28px high, 12px medium, Quiet Ink.
- **State:** the selected item takes Panel background, Ink text and the selected-segment shadow. Hovering shifts text to Ink. A single choice is always selected; clicking the active item does not deselect it.

### Bars
- **Category bar:** an 8px full-round track in Wash, with a fill in Ink at 75% and a minimum visible width of 2%. When a row is expanded, the other rows drop to 30% opacity.
- **Composition bar:** a 12px full-round strip with 2px gaps between segments in the four domain fills, each segment proportional to its absolute value. A legend sits underneath: square chip, label, Headline value, Label detail.

### Sum line (Total)
The adding-machine total under a list or under entró/salió: a 2px rule in Ink at 80%, an 8px top padding, then a 15px semibold label and value on the baseline. When a value is negative it turns Deudas Red and gets a real minus sign (U+2212).

### Charts
shadcn charts on Recharts. Grid lines are horizontal only, in Hairline. Axes have no tick lines and no axis lines, and labels use Quiet Ink at 12px. The area chart has a 2px stroke over a vertical gradient fill (25% to 2% opacity) in the series domain color. Bar charts use domain colors with 3px top corners. Series animate in over 500ms. Tooltips use shadcn's ChartTooltipContent with the semibold amount on the right.

### Upcoming row (Lo que viene)
A calendar stamp (20px semibold day over a short uppercase month), the label with a secondary line, the signed amount in its domain color, then two 32px icon buttons: a quiet X to skip and an Ink-filled check to register. Overdue rows turn the day and the "vencido" text red.

### Navigation
- **Desktop (from 1024px):** pills in the header. Inactive pills are Quiet Ink with a Wash hover; the active pill is Ink-filled with Ground text. A stale price adds a 6px Alerta dot next to the label.
- **Mobile:** a menu button opens a left Sheet (78% wide, max 288px) listing the tabs. The active tab is Wash-filled and semibold.
- **Wordmark:** the 20px logo (four flat rounded squares) followed by "Moni" in 17px semibold.

### FAB
On mobile only: a 56px Ink-filled circle with a plus icon, placed above the bottom safe-area inset with the floating shadow. It scales to 1.05 on hover and 0.95 when pressed, and is hidden on tabs that have no create action.

### Error banner
A full-width alert at the top of main: Deudas Red border at 40%, fill at 10%, 8px radius, a triangle icon in red, and 14px text.

### Transitional
Six tabs (Transacciones, Deudas, Inversiones, Activos, Recurrentes, Ajustes) still render through the legacy stylesheets (`tokens.css`, `components.css`, `layout.css`, `fonts.css`), which are loaded in a `legacy` cascade layer. Those are not part of this system. Each tab adopts the components above when it is migrated.

## Do's and Don'ts

### Do:
- **Do** open every card with one plain-language sentence that interprets its numbers, with the key figure semibold and colored by its sign.
- **Do** keep layouts compact: 16 to 20px card padding, 12 to 16px gaps, height set by content.
- **Do** show sums as an adding machine would: the items, a 2px Ink rule, then the total.
- **Do** use the `-text` variants for green and ochre whenever they color text.
- **Do** use a real minus sign (U+2212) and an explicit plus sign on signed amounts.
- **Do** keep the four domain colors bound to activos, inversiones, cartera and deudas everywhere.

### Don't:
- **Don't** add a fifth accent hue or use a domain color for decoration.
- **Don't** put shadows on cards; shadows are for floating and selected elements only.
- **Don't** introduce a second typeface, a monospace for amounts, or proportional figures.
- **Don't** add decorative empty space, hero bands or fixed-height cards that leave room unused.
- **Don't** show a card that is only numbers, with no sentence saying what they mean.
- **Don't** load fonts, icons or chart code from a CDN; everything is bundled or self-hosted.
