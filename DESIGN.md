---
name: Moni
description: Personal finance tracker where every quantity is counted in identical unit figures on flat paper and ink.
colors:
  paper: "#fbfbf9"
  ink: "#1c1c1a"
  ink-2: "#5e5d58"
  rule: "#dedcd5"
  wash: "#f1f0eb"
  cartera: "#2b4c8c"
  inversiones: "#3f6e2f"
  activos: "#d8a23a"
  activos-text: "#8a5f12"
  deudas: "#c3352b"
  alerta: "#b06d00"
  paper-dark: "#141412"
  ink-dark: "#ecebe5"
  ink-2-dark: "#a3a29b"
  rule-dark: "#2f2e2a"
  wash-dark: "#1e1d1b"
  cartera-dark: "#8aa6e6"
  inversiones-dark: "#93c174"
  activos-dark: "#e2b04f"
  deudas-dark: "#f0705f"
  alerta-dark: "#f0a948"
typography:
  display:
    fontFamily: "'Jost Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 7vw, 5.25rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.035em"
    fontFeature: "'tnum' 1, 'kern' 1"
  headline:
    fontFamily: "'Jost Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "-0.025em"
  numeral:
    fontFamily: "'Jost Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "'Jost Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum' 1, 'kern' 1"
  amount:
    fontFamily: "'Jost Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "'Jost Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  micro:
    fontFamily: "'Jost Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.025em"
rounded:
  sm: "3px"
  md: "4px"
  full: "9999px"
spacing:
  figure-gap: "3px"
  row: "16px"
  heading: "20px"
  page-x-mobile: "16px"
  page-x-desktop: "32px"
  section: "56px"
  column-gap: "64px"
components:
  button-confirm:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    size: "36px"
  button-skip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    size: "36px"
  button-skip-hover:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.deudas}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    height: "36px"
    padding: "8px 16px"
  toggle-period:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    height: "32px"
    padding: "0 6px"
  toggle-period-on:
    textColor: "{colors.ink}"
  nav-tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    height: "56px"
    padding: "0 12px"
  nav-tab-active:
    textColor: "{colors.ink}"
  category-row-open:
    backgroundColor: "{colors.wash}"
    rounded: "{rounded.sm}"
    padding: "10px 8px"
---

# Design System: Moni

## Overview

**Creative North Star: "The Pictorial Ledger"**

Moni counts money the way Otto Neurath and Gerd Arntz counted populations: every quantity is a row of identical unit figures, one figure equals one fixed amount, and more money means more figures, never a bigger figure. "How am I doing" and "where does it go" are read by row length before a single number is parsed. The page is paper and ink, with four flat domain inks that mean the same thing on every screen.

Density is calm. Sections are separated by an ink hairline and generous vertical air (56px), not by cards. Hierarchy comes from scale alone: one huge patrimonio numeral, then section titles, then body. There are no gradients, no glow, no tinted surfaces and no decorative imagery; the unit blocks are the only marks, and each one is also a unit of measure.

The world ships a dark rendition (ink-black ground, the same four inks lifted for contrast) that follows the system preference. It is the same world, not a second theme.

**Key Characteristics:**
- Isotype rows of identical flat blocks as the primary data display.
- Four fixed domain inks: blue cartera, green inversiones, ochre activos, red deudas.
- One typeface (Jost, Futura lineage) for every word and number, tabular figures throughout.
- Ink hairlines above sections; a thick ink underline marks the active tab or period.
- Flat everywhere: no card surfaces, no shadows, no gradients.

## Colors

Warm paper and near-black ink carry everything; color appears only as one of four domain inks, and its meaning never changes.

### Primary
- **Ink** (ink): All primary text, section rules, the header rule, the active-tab bar, the filled confirm button, figure rows for neutral quantities (spending categories, "Salió"). Primary actions are ink, not a brand color.

### Secondary (domain inks)
- **Cartera Blue** (cartera): Available cash. Cartera figure row, income amounts, "Entró".
- **Inversiones Green** (inversiones): Investments. Figure row, yields, the inversiones series in the monthly chart.
- **Activos Ochre** (activos): Assets. Fills the figure row and the text-selection highlight. Too light for small text on paper; text uses Activos Text.
- **Activos Text** (activos-text): The legible ochre for asset amounts on paper. In dark mode it equals Activos.
- **Deudas Red** (deudas): Debts and anything that subtracts: debt rows, negative patrimonio, negative months, overdue dates, the error banner rule, the skip hover.

### Tertiary
- **Alerta Amber** (alerta): Only the small stale-price dot beside a nav item. Not a domain ink; never used for data.

### Neutral
- **Paper** (paper): Page ground and every surface, including the drawer and popovers.
- **Ink 2** (ink-2): Secondary text, legends, unit keys, inactive tabs and toggles, the neutral bar in the patrimonio chart.
- **Rule** (rule): Light dividers between list rows, inputs, the scrollbar thumb.
- **Wash** (wash): The only fill besides ink: hover and open state on rows and icon buttons, loading skeletons.

The `-dark` tokens are the dark rendition of the same roles, applied under `prefers-color-scheme: dark`.

### Named Rules
**The Fixed Ink Rule.** Blue is always cartera, green always inversiones, ochre always activos, red always deudas or subtraction. A domain ink is never used decoratively or for a different meaning, and no fifth data color is introduced.

**The Red Subtracts Rule.** Anything that lowers net worth or cash is red, and the legend says so ("Lo rojo resta"). Spending is ink, not red; red is reserved for debt and loss.

**The Ochre Split Rule.** Ochre fills figures; Activos Text carries ochre words and amounts. Never set small text in the fill ochre on paper.

## Typography

**Display Font:** Jost Variable (with ui-sans-serif, system-ui)
**Body Font:** Jost Variable
**Label/Mono Font:** none; amounts use Jost with tabular figures.

**Character:** A geometric sans in the Futura lineage, the type of the Isotype charts themselves. One family at three weights (400, 500, 600) for everything, with tabular numerals set on the body so amounts align in every list.

### Hierarchy
- **Display** (500, clamp(3rem, 7vw, 5.25rem), line-height 1, -0.035em): Only the patrimonio figure, the largest thing on the page, followed inline by a 20px ink-2 qualifier ("de patrimonio").
- **Headline** (600, 18px, tight tracking): Section titles under the ink rule. Sentence case, phrased as plain Spanish ("En qué se va tu plata", "Lo que viene").
- **Numeral** (500, 26px, line-height 1): The day number in the upcoming-payments date column; red when overdue.
- **Body** (400, 15px): Row names, explanatory sentences, list primary lines. Emphasis inside a sentence is a 500 or 600 span in ink.
- **Amount** (600, 15px): Every money figure in a row, colored by its domain ink.
- **Label** (400, 13px): Legends, unit keys, sublines, percentages, toggle labels.
- **Micro** (500, 11px, uppercase, wide tracking): Only the abbreviated month under a date numeral. Chart value labels use 11px regular ink-2, month axis labels 12px.

### Named Rules
**The Scale-Only Hierarchy Rule.** Rank is expressed by size and weight, never by a colored or boxed heading. There is exactly one display-size number per screen.

**The Sentence Rule.** Numbers are explained by a full sentence beneath them ("Te quedó el 63,4% de lo que entró."), not by a label above them.

## Layout

A centered column, max 1280px, with 16px side padding on phones and 32px from 768px. Below the sticky 56px header, content starts 32px down (48px from 768px) and leaves 96px plus the safe-area inset at the bottom for the floating action button.

From 1024px the dashboard is a 12-column grid split 7/5 with a 64px gutter: patrimonio, spending and evolution on the left; this month, upcoming and recent movements on the right. Below 1024px the same blocks stack in one column in reading order (patrimonio, spending, this month, upcoming, evolution, movements), reordered with CSS order rather than duplicated markup.

Sections stack 56px apart. Within a section: ink rule, 16px, headline row (title left, toggles right, wrapping), 20px, content. Data rows are 16px apart.

Figure rows use a fixed 20-column grid with 3px gaps, so one figure is always the same width within a block and rows reflow by whole cells. From 640px, a figure row sits beside an 11rem label column (name, amount, detail) with a 24px gutter; on phones the label sits above the row and the detail below.

## Elevation & Depth

Flat. Depth is never conveyed by shadow or by a raised surface: sections are separated by ink hairlines, rows by rule hairlines, and the open or hovered state is a wash fill. The sticky header sits on paper at 95% opacity with a light backdrop blur so content passing under it stays legible; its edge is an ink rule, not a shadow. The drawer is a paper panel bounded by an ink rule.

### Named Rules
**The No-Card Rule.** There are no card containers. Grouping is done with a full-width ink rule above a section and whitespace around it.

**The Focus-Dims Rule.** Emphasis comes from dimming the rest, not lifting the subject: an open spending category keeps full ink while every other row drops to 25% opacity over 300ms.

## Shapes

Nearly square. Interactive fills (hover wash, icon buttons, skeletons, open rows) take a barely softened 3px corner; nothing reads as a pill or bubble. Lines carry the structure: 1px ink rules above sections and under the header, 1px rule-color dividers between rows, a 3px ink bar for the active nav tab (bottom on desktop, left edge in the drawer), and a 2px ink bar under the active period toggle. Unit blocks take a 2px corner. A remnant figure is cut vertically at half its drawn width, never at an arbitrary fraction.

## Components

### Buttons
Quiet and square; ink is the only filled action color.
- **Shape:** gently squared (3px).
- **Confirm icon button:** 36px square, ink fill, paper check glyph (lucide, stroke 2.5); hover drops to 85% opacity.
- **Skip icon button:** 36px square, transparent, ink-2 cross glyph; hover fills wash and turns the glyph deudas red.
- **Primary (shadcn default):** ink fill, paper text, 36px tall, 16px horizontal padding, 14px medium.
- **Text link button:** 14px medium ink with a rule-colored underline 4px below that darkens to ink on hover ("Ver las 6").
- **Focus:** 2px solid ink outline offset 2px, globally.

### Chips / Toggles
- **Style:** period and series toggles are bare text (13px), ink-2 at rest, ink on hover. No fill, no border.
- **State:** the selected option turns ink and gains a 2px ink bar along its bottom edge, inset 6px from each side. Single-select; a group can be split by a 1px rule divider.

### Lists
- **Upcoming payments:** a date column (26px numeral over an 11px uppercase month), a label with a 13px subline, the amount in its domain ink, then skip and confirm buttons. Rows divided by rule hairlines.
- **Movements:** a fixed 4.5rem date column in 13px ink-2, description over category, amount right-aligned; income is cartera blue with a plus sign, spending ink with a true minus sign.

### Navigation
- **Desktop (from 1024px):** right-aligned text tabs at 15px in the 56px header, ink-2 inactive, ink hover; active is 500 weight ink over a 3px ink bar that sits on the header's ink rule.
- **Mobile:** a menu button opens a left sheet (78% width, max 288px) of 16px items; the active item is 600 ink with a 3px left ink bar, hover is wash.
- **Stale-price marker:** a 6px alerta dot raised beside the tab label, with screen-reader text.
- **Floating add button:** phones only, a 56px ink circle with a paper plus, on tabs that have a create action.

### Figure Row (signature)
The core of the world. A row of identical plain square blocks (2px corner, no drawing) in a 20-column grid with 3px gaps, colored by its domain ink (or ink for neutral spending). The unit is chosen per block by rounding the largest value divided by 20 up to a 1, 2 or 5 step, so the longest row has at most 20 figures. Remnants snap to whole or half figures; a value under a quarter of a unit beside whole figures is dropped, and a value under one unit with no whole figures shows as a half. Every block that uses figure rows carries a key line ("Una figura = $20M.") with a small ink square. The row is decorative to assistive tech; the amount beside it carries the meaning.

### Blocks, not pictograms
The owner chose plain blocks over pictograms: the unit is a flat square in the row's ink, and color alone tells the domain. Spending categories are told apart by their label, not by a figure. Do not reintroduce pictograms without asking.

### Logo
Four 2x2 squares in the four domain inks (cartera top left, inversiones top right, activos bottom left, deudas bottom right), flat, no gradient. `moni.png` (180x180, paper ground, no alpha) is the iOS home-screen icon; `moni.ico` is the 32px favicon.

### Error Banner
A full-width band bounded top and bottom by 2px deudas rules, a 16px warning glyph in deudas, and the message in 15px ink. No fill.

## Do's and Don'ts

### Do:
- **Do** show any comparable set of quantities as figure rows on one shared unit, with a key line stating the unit.
- **Do** keep each domain on its fixed ink (activos ochre, inversiones green, cartera blue, deudas red) on every tab.
- **Do** separate sections with a 1px ink rule and 56px of space, and dividers inside lists with the rule color.
- **Do** mark selection with an ink bar (3px for navigation, 2px for toggles) and hover with a wash fill.
- **Do** explain a figure with a full sentence in 15px body or 13px label, emphasizing the number in ink.
- **Do** set every amount in Jost with tabular figures, signed with a true minus sign.
- **Do** carry every new color decision as a light and dark pair.

### Don't:
- **Don't** scale a figure up to show more money; add figures.
- **Don't** wrap content in cards, tinted panels or bordered boxes.
- **Don't** use gradients, glow or decorative drop shadows.
- **Don't** introduce a second typeface or a monospace for amounts.
- **Don't** use a domain ink for anything outside its domain, or set small text in the fill ochre on paper.
- **Don't** fall back to the KPI-tile row, donut chart or smoothed line chart.

## Transitional and open

- The six tabs not yet migrated (Transacciones, Deudas, Inversiones, Activos, Recurrentes, Ajustes) still render with the legacy stylesheets (`web/src/styles/tokens.css`, `components.css`, `layout.css`, `fonts.css`) inside a `legacy` cascade layer. They are not part of this system and are retired tab by tab as each is redrawn.
