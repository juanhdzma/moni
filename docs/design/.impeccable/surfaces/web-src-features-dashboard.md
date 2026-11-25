---
version: 1
slug: "web-src-features-dashboard"
primary_target: "web/src/features/dashboard"
related_targets: ["web/src/shell"]
---

# Dashboard (Operate)

Scope: the app shell (header, nav, drawer, banner) and the Dashboard tab of `web/`. First surface of the redesign; the other six tabs extend this system afterwards.

Audience and job: the owner, alone, on phone and desktop equally. Job: see how they are doing, see where the money goes, and decide how to organize better. It must be easy to understand and telling, compact (no space it does not need), not a generic bank page.

History: a first build in an Isotype direction (rows of unit figures on paper) was rejected as too empty and space-hungry. The owner then compared five rendered styles of the same screen and chose the compact card dashboard: light as "shadcn standard", dark as "dark compact" (the old app's family without monospace), following the system preference, plus the adding-machine idea of showing sums (entró − salió = te quedó, totals under lists). The owner also wants real charts.

Constraints: all current figures stay reachable; próximas operaciones keep their pending-key behavior; pinch-zoom and keyboard reach stay; no CDN; Tailwind CSS + shadcn/ui (Radix) + shadcn charts (Recharts); tabs not yet redesigned keep working on the legacy CSS.

## Direction contract

THESIS: A compact card dashboard where every card opens with one plain sentence that says what the numbers mean ("Subiste +$20,1M desde junio", "Arriendo se lleva el 39%"), then the chart or list that proves it. It refuses the empty, decorative or statement-like layouts the owner rejected.

OWN-WORLD: shadcn neutral cards with thin borders and 10px corners; light ground #fafafa with white cards, dark ground #131518 with #1b1e21 cards. Archivo for every word and number, tabular figures. Four fixed domain colors: activos ochre, inversiones green, cartera blue, deudas red; spending bars in foreground. Segmented controls for periods, pill navigation.

STORY: The owner opens Moni, reads patrimonio and its composition bar in one strip, reads "Cómo vas" with an area chart, sees which category takes the most money, checks this month's sum (entró − salió = te quedó) with six months of bars, and confirms or skips what is coming.

FIRST VIEWPORT: Full-width strip: "Patrimonio" + the figure + projection, a stacked composition bar, four labeled values. Below, 7/5 columns: left "Cómo vas" (area chart, serie and period toggles) and "En qué se va tu plata" (bars + total); right "Este mes en tu cartera" (sum + monthly bars) and "Lo que viene". Últimos movimientos under the left column. Phone: one column in that order.

FORM: owner-selected from rendered comparisons (options 4 and 5 merged as light and dark), after re-roll of seed 56750fb8.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
