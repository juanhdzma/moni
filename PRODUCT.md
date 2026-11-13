# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person, the owner, tracking their own finances. Uses it about equally on a phone (Safari iOS) and on a desktop browser.

## Product Purpose

Moni puts a single household's money in one place: spending, credit cards, loans, investments, other assets and recurring income/expenses, instead of several spreadsheets. Success means the owner can, at a glance, see how they are doing, see where their money goes, and decide how to organize it better.

## Positioning

A private, self-hosted tracker built around the owner's real financial life in Colombia: debts and cards with cuotas and adelantos, CDT-style fixed-rate investments with EA/MV rates, and assets, all reconciled into one ledger so net worth and available cash stay consistent. No bank sync, no accounts, no cloud.

## Operating Context

- Runs on a home server on the LAN (Docker via Portainer), no internet required at runtime, no authentication.
- Data is entered by hand: transactions, debt payments, investment contributions/yields, asset value updates.
- "Próximas operaciones" projects upcoming cuotas, yields and recurring charges so the owner confirms or skips them.
- Backup is a JSON export/import from Ajustes.

## Capabilities and Constraints

- Tabs: Dashboard, Transacciones, Deudas, Inversiones, Activos, Recurrentes, Ajustes.
- Spanish UI, Colombian peso (COP, no cents), `es-CO` formatting.
- Two money definitions must stay distinct: cartera (available cash) and patrimonio (net worth).
- Every asset (fonts, icons, chart library) is self-hosted; no CDN.
- Pinch-zoom must never be blocked; everything clickable must be keyboard-reachable.
- Frontend: React + TypeScript + Vite. Redesign moves styling to Tailwind CSS + shadcn/ui (Radix); Motion only where it earns its place.

## Brand Commitments

- Name: Moni. Existing icon at `web/public/assets/icons/moni.svg`. Card network logos in `web/public/assets/franquicias/`.

## Evidence on Hand

- The owner's real data lives in the production SQLite file; screenshots must use dummy data (`docs/img/` already does).

## Product Principles

1. Insight before bookkeeping: the first thing on screen answers "how am I doing and where does my money go".
2. Help organize, not just record: surface what is coming up and what is out of balance so the owner can act.
3. Numbers are the content: amounts must be legible, consistent and trustworthy on both phone and desktop.
4. One truth: every view reads from the same reconciled ledger; never show a figure that disagrees with another screen.

## Accessibility & Inclusion

WCAG AA as the baseline: pinch-zoom allowed, keyboard reachable controls, sufficient contrast for small mono amounts on mobile.
