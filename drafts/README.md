# Drafts, prototypes and beta assets

This folder is the quarantine area for work that is not production-ready.

## Put here

- Dashboard and UI mockups
- HTML prototypes and visual experiments
- Screenshots, reference exports and design explorations
- Experimental integrations and throwaway proof-of-concept code
- Draft specifications that have not been approved

## Rules

1. Every item must identify its owner/product, purpose, date or version, and status (DRAFT / BETA / EXPERIMENT).
2. Include a short README stating how to view/run it and what is deliberately not connected.
3. Do not import files from this folder into production builds or runtime code.
4. Do not place credentials, broker identifiers, private account data or real trading secrets here.
5. Promotion requires a separate reviewed change into the correct product source folder, with tests and owner approval.
6. Preserve historical betas when useful; mark them superseded rather than silently treating them as current.

The existing Quint Control beta dashboard is now copied into `drafts/quint-control/beta-dashboard-mockup/` on this preparation branch, including its HTML, README and Fable handoff. The original isolated branch `design/quint-beta-dashboard-reference` is preserved unchanged as a historical source. The beta remains presentation-only and must never be imported into the production website build.
