---
"@json-render/core": minor
"@json-render/image": minor
---

Image renderer: generate SVG and PNG from JSON specs.

### New: `@json-render/image` Package

Server-side image renderer powered by Satori. Turns the same `{ root, elements }` spec format into SVG or PNG output for OG images, social cards, and banners.

- `renderToSvg(spec, options)` — render spec to SVG string
- `renderToPng(spec, options)` — render spec to PNG buffer (requires `@resvg/resvg-js`)
- 9 standard components: Frame, Box, Row, Column, Heading, Text, Image, Divider, Spacer
- `standardComponentDefinitions` catalog for AI prompt generation
- Server-safe import path: `@json-render/image/server`
- Sub-path exports: `/render`, `/catalog`, `/server`
