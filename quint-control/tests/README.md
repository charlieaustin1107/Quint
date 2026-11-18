# tests

Tests that check the project as a whole: the protocol examples against the schemas, the firm presets, and the folder structure.

- `golden/`: golden files (inputs in, expected decisions out). Made by `reference/`, read by the engine's self-tests, so the JavaScript and C# must agree exactly.
- `run3.js`: runs the whole suite three times (`npm run test:3`).
