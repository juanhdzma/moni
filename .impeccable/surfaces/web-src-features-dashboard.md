---
version: 1
slug: "web-src-features-dashboard"
primary_target: "web/src/features/dashboard"
related_targets: ["web/src/shell"]
---

# Dashboard (Operate)

Scope: the app shell (header, nav, drawer, banner) and the Dashboard tab of `web/`. First surface of the redesign; the other six tabs extend this world afterwards.

Audience and job: the owner, alone, on phone and desktop equally. Job: see how they are doing, see where the money goes, and decide how to organize better. Must not feel like a generic bank app, and must not feel dense.

Dark variant: the world also ships a dark rendition (ink-black ground #141412, same four inks lifted for contrast) that follows the system preference, because the owner checks the phone at night and the previous app was dark; it is the same world, not a second one.

Open decision: the Moni icon (`web/public/assets/icons/moni.svg`, a green gradient wallet) contradicts the flat-ink world; it is a brand asset, so redrawing it waits for the owner.

Constraints: all current figures stay reachable (some move off the first viewport); próximas operaciones keep their pending-key behavior; pinch-zoom and keyboard reach stay; no CDN; Tailwind CSS + shadcn/ui (Radix) as the styling base; tabs not yet redesigned keep working on the legacy CSS.

## Direction contract

THESIS: Money counted in figures. Every quantity on the dashboard is a row of identical unit figures (Isotype: one figure = one fixed amount, more money means more figures, never a bigger figure), so "where does it go" and "how am I doing" are read by length at a glance. It refuses the KPI-tile row plus donut plus line-chart dashboard every finance app ships.

OWN-WORLD: Paper-white ground (#fbfbf9), ink black (#1c1c1a), flat inks with no gradients, glow or shadows: blue cartera, green inversiones, ochre activos, red deudas, used as fixed domain colors across the whole app. Geometric sans in the Futura lineage (Jost) for every word and number, tabular figures. Hairline rules instead of cards; a thick ink bar marks the active tab. Pictograms are flat silhouettes, one per spending category, repeated as the unit.

STORY: The owner opens Moni, reads their patrimonio as one huge number, sees what it is made of as colored figure rows (activos, inversiones, cartera minus deudas), sees this period's spending as one row of pictograms per category, taps a category to lift it and see its movements, and checks the column of upcoming dated payments to confirm or skip.

FIRST VIEWPORT: Desktop 1440: left 7/12 holds the patrimonio figure (largest type on the page) with the projection line under it, then the composition rows, then "En qué se va" with period pills and one pictogram row per category. Right 5/12 holds "Este mes" (ingresos vs gastos as two measured rows, ahorro %) and "Próximas operaciones" as a date column (day numeral large, month small) with skip/confirm. Phone 390: same order in one column, patrimonio first, próximas after gastos. Evolution charts and últimos movimientos sit below the fold, restyled flat.

FORM: Isotipo (Neurath/Arntz pictorial statistics), position 4 of 7 on the ordered list, seed key 56750fb8. Raises: hierarchy by scale alone; length is exact quantity; reflow by whole cells; focused category lifts and the rest dims; four fixed domain inks.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
