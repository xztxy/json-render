# @json-render/remotion

Remotion renderer for json-render. JSON becomes video compositions.

## Overview

This package demonstrates json-render's flexibility - the spec format, schema, and types are completely different from React:

| Feature | @json-render/react | @json-render/remotion |
|---------|-------------------|----------------------|
| Spec Format | Element tree (nested components) | Timeline (tracks + clips) |
| Components | UI components (Button, Card) | Video components (scenes, overlays) |
| Actions | User interactions (click, submit) | Effects (transitions, animations) |
| Output | React DOM | Remotion video |

## Installation

```bash
npm install @json-render/remotion remotion
```

## Schema

The Remotion schema is timeline-based, designed for video composition:

```typescript
import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/remotion';
import { z } from 'zod';

const catalog = defineCatalog(schema, {
  components: {
    TitleCard: {
      props: z.object({
        title: z.string(),
        subtitle: z.string().nullable(),
        backgroundColor: z.string(),
      }),
      type: 'scene',
      defaultDuration: 90, // 3 seconds at 30fps
      description: 'Full-screen title card with text',
    },
    ImageSlide: {
      props: z.object({
        src: z.string(),
        alt: z.string(),
        fit: z.enum(['cover', 'contain']),
      }),
      type: 'image',
      defaultDuration: 150, // 5 seconds at 30fps
      description: 'Full-screen image display',
    },
    LowerThird: {
      props: z.object({
        name: z.string(),
        title: z.string(),
      }),
      type: 'overlay',
      defaultDuration: 120,
      description: 'Name/title overlay in lower third',
    },
  },
  transitions: {
    fade: {
      defaultDuration: 15, // 0.5 seconds
      description: 'Fade in/out transition',
    },
    slideLeft: {
      defaultDuration: 15,
      description: 'Slide from right to left',
    },
    zoom: {
      defaultDuration: 20,
      description: 'Zoom in/out transition',
    },
  },
  effects: {
    kenBurns: {
      params: z.object({
        startScale: z.number(),
        endScale: z.number(),
        startX: z.number(),
        startY: z.number(),
      }),
      description: 'Ken Burns pan and zoom effect',
    },
  },
});
```

## Spec Format

The AI generates a timeline-based spec:

```json
{
  "composition": {
    "id": "intro-video",
    "fps": 30,
    "width": 1920,
    "height": 1080,
    "durationInFrames": 300
  },
  "tracks": [
    { "id": "main", "name": "Main Video", "type": "video", "enabled": true },
    { "id": "overlay", "name": "Overlays", "type": "overlay", "enabled": true }
  ],
  "clips": [
    {
      "id": "clip-1",
      "trackId": "main",
      "component": "TitleCard",
      "props": {
        "title": "Welcome",
        "subtitle": "To the future",
        "backgroundColor": "#1a1a1a"
      },
      "from": 0,
      "durationInFrames": 90,
      "transitionIn": { "type": "fade", "durationInFrames": 15 },
      "transitionOut": { "type": "fade", "durationInFrames": 15 }
    },
    {
      "id": "clip-2",
      "trackId": "main",
      "component": "ImageSlide",
      "props": {
        "src": "/images/hero.jpg",
        "alt": "Hero image",
        "fit": "cover"
      },
      "from": 90,
      "durationInFrames": 150,
      "transitionIn": { "type": "slideLeft", "durationInFrames": 15 },
      "transitionOut": { "type": "fade", "durationInFrames": 15 }
    }
  ],
  "audio": {
    "tracks": [
      {
        "id": "bg-music",
        "src": "/audio/background.mp3",
        "from": 0,
        "durationInFrames": 300,
        "volume": 0.5
      }
    ]
  }
}
```

## Types

Define video components with frame-aware context:

```typescript
import { VideoComponents, VideoComponentFn } from '@json-render/remotion';
import { interpolate } from 'remotion';

const TitleCard: VideoComponentFn<typeof catalog, 'TitleCard'> = ({ props, frame }) => {
  // Animate based on current frame
  const opacity = interpolate(frame.frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ 
      opacity,
      backgroundColor: props.backgroundColor,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
    }}>
      <h1>{props.title}</h1>
      {props.subtitle && <h2>{props.subtitle}</h2>}
    </div>
  );
};

const components: VideoComponents<typeof catalog> = {
  TitleCard,
  ImageSlide: ({ props }) => <Img src={props.src} style={{ objectFit: props.fit }} />,
  LowerThird: ({ props, frame }) => {
    const slideIn = interpolate(frame.frame, [0, 15], [-200, 0]);
    return (
      <div style={{ transform: `translateX(${slideIn}px)` }}>
        <div>{props.name}</div>
        <div>{props.title}</div>
      </div>
    );
  },
};
```

## Why Different Schemas?

json-render is fundamentally "JSON -> render". What happens in between is completely flexible:

- **React**: Nested component tree, user interactions, DOM output
- **Remotion**: Timeline with tracks/clips, frame-based animations, video output
- **Vue** (hypothetical): Could use a different tree structure, Vue-specific reactivity
- **Native** (hypothetical): Could target React Native, Flutter, or native mobile

The core provides:
- `defineSchema()` - define your spec format
- `defineCatalog()` - create catalogs that match your schema
- Type inference utilities

Each renderer provides:
- Its own schema (spec format)
- Type-safe component/handler types
- The actual rendering implementation

This separation allows json-render to power any rendering target while sharing the same AI generation flow.
