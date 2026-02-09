---
"@json-render/react": patch
"@json-render/react-native": patch
"@json-render/remotion": patch
---

Prevent rendering errors from crashing the application. Added error boundaries to all renderers so a single bad component silently disappears instead of causing a white-screen-of-death. Fixed Select and Radio components to handle non-string option values from AI output.
