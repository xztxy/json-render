import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react-native/schema";
import {
  standardComponentDefinitions,
  standardActionDefinitions,
} from "@json-render/react-native/catalog";

/**
 * React Native catalog
 *
 * Uses all standard components and actions from @json-render/react-native.
 * The AI can generate UIs using Container, Row, Column, Card, Button,
 * TextInput, Image, Avatar, Badge, Spinner, and more.
 *
 * @example Extending with custom components:
 * ```ts
 * components: {
 *   ...standardComponentDefinitions,
 *   MyCustomComponent: {
 *     props: z.object({ title: z.string() }),
 *     slots: ["default"],
 *     description: "A custom component",
 *   },
 * },
 * ```
 */
export const catalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
  actions: standardActionDefinitions,
});
