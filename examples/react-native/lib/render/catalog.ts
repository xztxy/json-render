import { z } from "zod";
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react-native/schema";
import {
  standardComponentDefinitions,
  standardActionDefinitions,
} from "@json-render/react-native/catalog";

/**
 * Custom rules for the AI to follow when generating UIs
 */
export const customRules = [
  // Initial state
  "INITIAL STATE: When the UI uses interactive components with statePath bindings (TextInput, Checkbox, Switch, Slider), you MUST output a /state patch BEFORE the element patches to seed the state model with initial values.",
  'Example: {"op":"add","path":"/state","value":{"todos":[{"title":"Buy milk","completed":false}],"newTodoText":""}}',
  "The state model is the source of truth for all statePath-bound components. Without initial state, bound components will have no starting values.",

  // State-driven content: no duplicating values as static props
  'STATE CONSISTENCY: When content comes from the state model, ALWAYS use { "$path": "/some/path" } dynamic props instead of hardcoding the same value in both state and props. The state model is the single source of truth.',
  'Example: If state has todos[0].title = "Buy groceries", the Paragraph displaying it MUST use "text": { "$path": "/todos/0/title" } -- NOT "text": "Buy groceries". Hardcoding text that also exists in state causes the UI to go out of sync when state changes.',
  "This applies to ALL display props that correspond to state fields: text, label, color, checked, value, etc. If a value lives in /state, read it with $path.",

  // Array state actions
  'ARRAY STATE: Use "pushState" to add items to arrays and "removeState" to remove items by index.',
  'pushState params: { "path": "/todos", "value": { "title": { "path": "/newTodoText" }, "completed": false }, "clearPath": "/newTodoText" }. The value can contain { "path": "/statePath" } references to read current state. Use clearPath to reset an input after adding.',
  'removeState params: { "path": "/todos", "index": 0 }. Removes the item at the given index from the array.',
  "For todo lists, shopping carts, or any list that users can add to / remove from, use pushState and removeState instead of trying to hardcode arrays with setState.",

  // Image URLs using Picsum (free, no API key)
  'Image props: { "src": "https://picsum.photos/WIDTH/HEIGHT?random=N" } - use Picsum for any placeholder or example images',
  "Use different random numbers for each image to get different photos (e.g., ?random=1, ?random=2, ?random=3)",
  "Picsum provides random professional stock photos - great for avatars, hero images, product shots, and backgrounds",
  'Avatar props: { "src": "https://picsum.photos/100/100?random=N" } - use Picsum for avatar images too',

  // Icons vs emojis
  "CRITICAL: NEVER use emoji characters for UI icons, action buttons, navigation items, or indicators. ALWAYS use the Icon component instead.",
  "The Icon component uses Ionicons. Common icon names: heart, heart-outline, chatbubble-outline, share-social-outline, bookmark-outline, bookmark, home, home-outline, search, person, person-outline, add, close, checkmark, ellipsis-horizontal, ellipsis-vertical, camera-outline, notifications-outline, settings-outline, send, arrow-back, arrow-forward, chevron-back, chevron-forward, star, star-outline, eye-outline, eye-off-outline, trash-outline, create-outline, refresh, lock-closed-outline, mail-outline, call-outline, location-outline, time-outline, play, pause, image-outline, menu, filter-outline, globe-outline, link-outline, cloud-outline, download-outline, share-outline.",
  "Emojis ARE allowed inside user-generated content such as comment text, post captions, chat messages, and status text - just like real social apps. Only UI chrome (buttons, tabs, indicators) must use the Icon component.",

  // Layout patterns
  "FIXED BOTTOM BAR PATTERN: When building a screen with a fixed header and/or fixed bottom tab bar, the outermost Column must have flex:1 so it fills the SafeArea. The scrollable content area must also have flex:1. Structure: SafeArea > Column(flex:1, gap:0) > [header, Container(flex:1) > [ScrollContainer(...)], bottom-tabs]. Both the outer Column AND the content Container need flex:1.",
  "NEVER place a bottom tab bar or fixed footer inside a ScrollContainer. It must be a sibling AFTER the flex:1 container that holds the ScrollContainer.",

  // Element integrity
  "CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist. A missing child element causes that entire branch of the UI to be invisible.",
  "SELF-CHECK: After generating all elements, mentally walk the tree from root. Every key in every children array must resolve to a defined element. If you find a gap, output the missing element immediately.",
  "When building repeating content (e.g. posts in a feed, cards in a list), always define a wrapper Container element for each item (e.g. 'post-1', 'post-2') with children pointing to that item's sub-elements (e.g. 'post-1-header', 'post-1-image'). Never reference sub-elements directly from a parent list without a wrapper.",

  // Visible field placement
  'CRITICAL: The "visible" field goes on the ELEMENT object, NOT inside "props". Correct: {"type":"Column","props":{"gap":8},"visible":{"eq":[{"path":"/activeTab"},"home"]},"children":[...]}. WRONG: {"type":"Column","props":{"gap":8,"visible":{...}},"children":[...]}.',

  // Tab UI pattern
  "TAB NAVIGATION PATTERN: When building a UI with multiple tabs, use Pressable + setState action + visible conditions to make tabs functional.",
  'Each tab button should be a Pressable wrapping its icon/label children, with action "setState" and actionParams { "path": "/activeTab", "value": "tabName" }.',
  'Each tab\'s content section should have a visible condition: { "eq": [{ "path": "/activeTab" }, "tabName"] }.',
  "The first tab's content should NOT have a visible condition (so it shows by default when no tab is selected yet). All other tabs MUST have a visible condition.",

  // Tab active state highlighting (using dynamic props)
  "TAB ACTIVE STYLING: Use $cond dynamic props on the Icon inside each tab Pressable so a single Icon changes appearance based on the active tab.",
  '  - For the icon name: { "$cond": { "eq": [{ "path": "/activeTab" }, "thisTabName"] }, "$then": "home", "$else": "home-outline" }',
  '  - For the icon color: { "$cond": { "eq": [{ "path": "/activeTab" }, "thisTabName"] }, "$then": "#007AFF", "$else": "#8E8E93" }',
  "  - For labels, use $cond on the color prop similarly.",
  '  - For the FIRST/DEFAULT tab, use { "$cond": { "or": [{ "eq": [{ "path": "/activeTab" }, "thisTabName"] }, { "not": { "path": "/activeTab" } }] }, "$then": "#007AFF", "$else": "#8E8E93" } so it appears active before any tab is tapped.',

  // Push/Pop screen navigation (all screens in one spec)
  'SCREEN NAVIGATION: Use Pressable with action "push" and actionParams { "screen": "screenName" } to navigate to a new screen. Use action "pop" to go back. All screens must be defined in the SAME spec.',
  'Each screen section uses a visible condition on /currentScreen: { "eq": [{ "path": "/currentScreen" }, "screenName"] }. The default/home screen should also be visible when /currentScreen is not set: { "or": [{ "eq": [{ "path": "/currentScreen" }, "home"] }, { "not": { "path": "/currentScreen" } }] }.',
  "push automatically maintains a /navStack in the state model so pop always returns to the previous screen.",
  'Include a back button on pushed screens using action "pop". Example: Pressable(action:"pop") > Row > Icon(name:"chevron-back") + Label(text:"Back").',
  "Use push/pop for drill-down flows: tapping a list item to see details, opening a profile, etc. Use setState + visible conditions for tab switching within a screen.",
  'Example: A list screen with items that push to detail: Pressable(action:"push", actionParams:{screen:"repo-detail"}) wrapping each list item card. The detail screen section has visible:{"eq":[{"path":"/currentScreen"},"repo-detail"]} and contains a back button with action:"pop".',
];

/**
 * React Native catalog
 *
 * Uses all standard components and actions from @json-render/react-native,
 * plus an Icon component powered by Ionicons (@expo/vector-icons).
 */
export const catalog = defineCatalog(schema, {
  components: {
    ...standardComponentDefinitions,
    Icon: {
      props: z.object({
        name: z.string(),
        size: z.number().nullable(),
        color: z.string().nullable(),
      }),
      slots: [],
      description:
        "Icon display using Ionicons. Use for action buttons, navigation items, and indicators. ALWAYS use this instead of emoji characters for UI icons. Use Ionicons naming convention (e.g. heart, heart-outline, chatbubble-outline, share-social-outline).",
    },
  },
  actions: standardActionDefinitions,
});
