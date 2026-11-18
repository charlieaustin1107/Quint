# firms

One JSON preset per prop firm plan, checked against `firm.schema.json` by `npm test`. The guardian loads them; you can change any number in Settings.

- `verify` lists numbers that still need checking against the firm's own rules page.
- `quintDefaults` lists Quint's own safety margins, which are stricter than or extra to the firm's rules.
- Update `lastChecked` whenever you check the firm's rules again.
