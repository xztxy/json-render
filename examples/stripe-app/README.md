# Stripe App Example

A [Stripe App](https://stripe.com/docs/stripe-apps) example demonstrating how to use json-render to build dynamic, AI-generated UI within the Stripe Dashboard.

## Overview

This example shows how to integrate json-render with Stripe's UI Extension SDK to create dashboard views that can be dynamically generated from prompts. The app includes:

- **Home** - Revenue dashboard with AI-powered UI generation
- **Customers** - Customer list and management
- **Customer Details** - Individual customer view
- **Payments** - Payment list and details
- **Subscriptions** - Subscription management
- **Invoices** - Invoice list
- **Products** - Product catalog

## Features

- Full Stripe UIXT component catalog mapped to json-render
- Dynamic spec generation from natural language prompts
- Real-time data binding with Stripe API
- Action handlers for Stripe operations (refunds, subscriptions, etc.)

## Getting Started

### Prerequisites

- [Stripe CLI](https://stripe.com/docs/stripe-cli) installed
- A Stripe account with app development enabled

### Setup

```bash
# Install dependencies
pnpm install

# Generate stripe-app.json from template
pnpm setup
```

To use your own Stripe App ID, create a `.env` file (see `.env.example`):

```bash
cp .env.example .env
```

Then set `STRIPE_APP_ID` to your app ID and run `pnpm setup` again.

If you don't set `STRIPE_APP_ID`, the template default (`com.example.json-render-demo`) is used.

> **Note:** `stripe-app.json` is generated and gitignored. Edit `stripe-app.template.json` for structural changes (views, permissions, etc.).

```bash
# Start the Stripe App in development mode
stripe apps start
```

### Development

The app uses the Stripe UI Extension SDK which handles authentication automatically - no API keys required in your environment.

```bash
# Run linting
pnpm lint

# Run tests
pnpm test
```

## How It Works

1. **Component Catalog**: Maps json-render component types to Stripe UIXT components (`Box`, `Button`, `Badge`, etc.)

2. **Action Handlers**: Defines actions that can be triggered from the UI (e.g., `refundPayment`, `cancelSubscription`)

3. **StripeRenderer**: A custom renderer that uses the Stripe component catalog to render json-render specs

4. **Views**: Each view fetches data from the Stripe API and renders it using json-render specs

## Example Usage

```tsx
import { useState, useCallback } from "react";
import { StripeRenderer } from "./lib/render";
import type { Spec } from "@json-render/react";

const spec: Spec = {
  root: "container",
  elements: {
    container: {
      type: "Stack",
      props: { direction: "vertical", gap: "medium" },
      children: ["heading", "metric"],
    },
    heading: {
      type: "Heading",
      props: { text: "Revenue", size: "large" },
      children: [],
    },
    metric: {
      type: "Metric",
      props: { label: "Total", value: "$12,345", format: "currency" },
      children: [],
    },
  },
};

function MyView() {
  const [data, setData] = useState({});
  const handleSetData = useCallback(
    (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      setData((prev) => updater(prev));
    },
    [],
  );

  return <StripeRenderer spec={spec} data={data} setData={handleSetData} />;
}
```

## Full Page Apps (Alpha)

This example includes a `FullPage` view component (`src/views/FullPage.tsx`) that uses Stripe's full-page apps capability. This feature is currently in **private developer preview** and requires Stripe to enable a feature flag for your app and account.

If you have access to the alpha:

1. Upgrade the SDK to the alpha version:

```json
"@stripe/ui-extension-sdk": "9.2.0-alpha.0"
```

2. Add the fullpage viewport to `stripe-app.template.json` and run `pnpm setup`:

```json
{
  "viewport": "stripe.dashboard.fullpage",
  "component": "FullPage"
}
```

3. Run `stripe apps start` and navigate directly to:

```
https://dashboard.stripe.com/test/app/<your-app-id>
```

If you are redirected to the Dashboard home page, the feature flag is not yet enabled for your account. Contact your Stripe partner to have both your `app_id` and `account_id` flagged in.

## Learn More

- [json-render Documentation](https://json-render.com/docs)
- [Stripe Apps Documentation](https://stripe.com/docs/stripe-apps)
- [Stripe UI Extension SDK](https://stripe.com/docs/stripe-apps/reference/ui-extension-sdk)
- [FullPageView Component](https://docs.stripe.com/stripe-apps/components/fullpageview?app-sdk-version=9) (hidden from navigation)
- [FullPageTabs Component](https://docs.stripe.com/stripe-apps/components/fullpagetabs?app-sdk-version=9) (hidden from navigation)
