# LawScan review interface

Applies to review results, expert findings, contract result labels, overview metrics and operational reports.

## Design basis

Use `frontend/.agents/skills/redesign-existing-projects` for the audit and incremental implementation, and `minimalist-ui` for typography, flat surfaces and restrained semantic color. This is a working legal review interface: preserve the existing routes, controls, evidence and permissions. Marketing page effects, oversized section spacing and decorative imagery do not serve this workflow.

## Audit and decisions

- Replace the row of equal pastel tiles with one leading total and a compact breakdown. Counts and priority must be readable before opening a finding.
- Remove whole-card category colors, stacked borders, decorative icon tiles and generic shadows. Reserve one outer surface for each meaningful section.
- Use the already loaded Geist typeface instead of the Arial override. Numbers use tabular figures; contract names and finding titles have a clear hierarchy.
- Keep the existing blue brand accent for actions and selection. Use muted red for confirmed violations, amber for missing or uncertain information and sage for completed checks. Other categories use neutral labels. Always retain text labels alongside color.
- Present summaries as numbered document rows, evidence as quoted text, and proposed wording as a highlighted text passage. Avoid a card inside a card inside a card.
- Keep all finding filters and source-navigation controls. Selected filters have a solid, high-contrast treatment; selected expert findings have a quiet blue rail. Rejected findings remain visually distinct.
- Keep loading, empty, incomplete and legacy-result states explicit. Zero counts must not appear as active warnings.

## Tokens and layout

- Ink: `#292c28`; secondary: `#73766f`; divider: `#e4e6df`.
- Canvas: `#f7f7f5`; surface: `#ffffff`; inset: `#f4f5f1`.
- Action: `#315eac`; violation: `#9f2f2d`; attention: `#956400`; completed: `#346538`.
- Corners: 6px for controls, 8–12px for section surfaces. No gradients or heavy shadows.
- Review layout keeps the existing two-pane document workflow; headings and horizontal rules establish sections within each pane.
- Mobile reduces the leading summary to a compact strip, wraps filters without clipping and uses one column for findings. No decorative layout movement; interactive feedback respects reduced-motion preferences.

## Validation

Check representative completed, incomplete, empty, rejected and uncertain results at 1440px, 768px and 390px. Exercise filters, disclosure, source navigation and keyboard focus. Check the public sample report for typography regressions from the shared font change. TypeScript, ESLint and a production build must pass.
