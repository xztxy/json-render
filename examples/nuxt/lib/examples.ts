import type { Spec } from "@json-render/core";

export interface Example {
  name: string;
  description: string;
  spec: Spec;
}

export const examples: Example[] = [
  {
    name: "User Profile Card",
    description: "A card with user info, badges, and a progress bar",
    spec: {
      root: "card",
      elements: {
        card: {
          type: "Card",
          props: {
            title: "User Profile",
            description: null,
            maxWidth: "md",
            centered: null,
          },
          children: ["stack"],
        },
        stack: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "md",
            align: null,
            justify: null,
          },
          children: ["heading", "text", "badges", "sep", "progress"],
        },
        heading: {
          type: "Heading",
          props: { text: "Jane Cooper", level: "h2" },
        },
        text: {
          type: "Text",
          props: {
            text: "Senior software engineer based in San Francisco. Passionate about building accessible, high-performance web applications.",
            variant: "muted",
          },
        },
        badges: {
          type: "Stack",
          props: {
            direction: "horizontal",
            gap: "sm",
            align: null,
            justify: null,
          },
          children: ["b1", "b2", "b3"],
        },
        b1: {
          type: "Badge",
          props: { text: "TypeScript", variant: "default" },
        },
        b2: { type: "Badge", props: { text: "Vue", variant: "secondary" } },
        b3: { type: "Badge", props: { text: "Node.js", variant: "outline" } },
        sep: { type: "Separator", props: { orientation: null } },
        progress: {
          type: "Progress",
          props: { value: 72, max: 100, label: "Profile completion" },
        },
      },
    },
  },

  {
    name: "Settings Form",
    description: "A form with inputs, selects, and switches",
    spec: {
      root: "card",
      state: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        role: "Engineer",
        notifications: true,
        darkMode: false,
      },
      elements: {
        card: {
          type: "Card",
          props: {
            title: "Account Settings",
            description: "Manage your preferences",
            maxWidth: "md",
            centered: null,
          },
          children: ["form"],
        },
        form: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "md",
            align: null,
            justify: null,
          },
          children: [
            "nameInput",
            "emailInput",
            "roleSelect",
            "sep",
            "notifSwitch",
            "darkSwitch",
            "sep2",
            "actions",
          ],
        },
        nameInput: {
          type: "Input",
          props: {
            label: "Full Name",
            name: "name",
            type: "text",
            placeholder: "Your name",
            value: { $bindState: "/name" },
            checks: null,
          },
        },
        emailInput: {
          type: "Input",
          props: {
            label: "Email",
            name: "email",
            type: "email",
            placeholder: "you@example.com",
            value: { $bindState: "/email" },
            checks: null,
          },
        },
        roleSelect: {
          type: "Select",
          props: {
            label: "Role",
            name: "role",
            options: [
              "Engineer",
              "Designer",
              "Product Manager",
              "Data Scientist",
            ],
            placeholder: "Choose a role",
            value: { $bindState: "/role" },
            checks: null,
          },
        },
        sep: { type: "Separator", props: { orientation: null } },
        notifSwitch: {
          type: "Switch",
          props: {
            label: "Email notifications",
            name: "notifications",
            checked: { $bindState: "/notifications" },
          },
        },
        darkSwitch: {
          type: "Switch",
          props: {
            label: "Dark mode",
            name: "darkMode",
            checked: { $bindState: "/darkMode" },
          },
        },
        sep2: { type: "Separator", props: { orientation: null } },
        actions: {
          type: "Stack",
          props: {
            direction: "horizontal",
            gap: "sm",
            align: null,
            justify: "end",
          },
          children: ["cancelBtn", "saveBtn"],
        },
        cancelBtn: {
          type: "Button",
          props: { label: "Cancel", variant: "secondary", disabled: null },
        },
        saveBtn: {
          type: "Button",
          props: { label: "Save Changes", variant: "primary", disabled: null },
        },
      },
    },
  },

  {
    name: "Pricing Table",
    description: "A grid of pricing cards with feature lists",
    spec: {
      root: "outer",
      elements: {
        outer: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "lg",
            align: null,
            justify: null,
          },
          children: ["header", "grid"],
        },
        header: {
          type: "Stack",
          props: {
            direction: "vertical",
            gap: "sm",
            align: "center",
            justify: null,
          },
          children: ["title", "subtitle"],
        },
        title: {
          type: "Heading",
          props: { text: "Simple, transparent pricing", level: "h1" },
        },
        subtitle: {
          type: "Text",
          props: {
            text: "Choose the plan that fits your needs. Upgrade or downgrade at any time.",
            variant: "muted",
          },
        },
        grid: {
          type: "Grid",
          props: { columns: 3, gap: "md" },
          children: ["free", "pro", "enterprise"],
        },
        free: {
          type: "Card",
          props: { title: "Free", description: "$0/month" },
          children: ["freeContent"],
        },
        freeContent: {
          type: "Stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["f1", "f2", "f3", "freeBtn"],
        },
        f1: {
          type: "Text",
          props: { text: "Up to 3 projects", variant: "body" },
        },
        f2: { type: "Text", props: { text: "1 GB storage", variant: "body" } },
        f3: {
          type: "Text",
          props: { text: "Community support", variant: "body" },
        },
        freeBtn: {
          type: "Button",
          props: { label: "Get Started", variant: "secondary" },
        },
        pro: {
          type: "Card",
          props: { title: "Pro", description: "$19/month" },
          children: ["proContent"],
        },
        proContent: {
          type: "Stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["p1", "p2", "p3", "p4", "proBtn"],
        },
        p1: {
          type: "Text",
          props: { text: "Unlimited projects", variant: "body" },
        },
        p2: { type: "Text", props: { text: "50 GB storage", variant: "body" } },
        p3: {
          type: "Text",
          props: { text: "Priority support", variant: "body" },
        },
        p4: {
          type: "Text",
          props: { text: "Custom domains", variant: "body" },
        },
        proBtn: {
          type: "Button",
          props: { label: "Upgrade to Pro", variant: "primary" },
        },
        enterprise: {
          type: "Card",
          props: { title: "Enterprise", description: "Custom pricing" },
          children: ["entContent"],
        },
        entContent: {
          type: "Stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["e1", "e2", "e3", "e4", "entBtn"],
        },
        e1: {
          type: "Text",
          props: { text: "Everything in Pro", variant: "body" },
        },
        e2: {
          type: "Text",
          props: { text: "Unlimited storage", variant: "body" },
        },
        e3: {
          type: "Text",
          props: { text: "Dedicated support", variant: "body" },
        },
        e4: {
          type: "Text",
          props: { text: "SLA guarantees", variant: "body" },
        },
        entBtn: {
          type: "Button",
          props: { label: "Contact Sales", variant: "secondary" },
        },
      },
    },
  },

  {
    name: "Status Dashboard",
    description: "System status with alerts, a table, and an accordion",
    spec: {
      root: "root",
      elements: {
        root: {
          type: "Stack",
          props: { direction: "vertical", gap: "lg" },
          children: [
            "heading",
            "alertOk",
            "alertWarn",
            "sep",
            "table",
            "sep2",
            "accordion",
          ],
        },
        heading: {
          type: "Heading",
          props: { text: "System Status", level: "h1" },
        },
        alertOk: {
          type: "Alert",
          props: {
            title: "API",
            message: "All systems operational -- 99.98% uptime this month",
            type: "success",
          },
        },
        alertWarn: {
          type: "Alert",
          props: {
            title: "Database",
            message: "Elevated latency detected in us-east-1 region",
            type: "warning",
          },
        },
        sep: { type: "Separator", props: { orientation: null } },
        table: {
          type: "Table",
          props: {
            columns: ["Service", "Status", "Latency", "Uptime"],
            rows: [
              ["API Gateway", "Operational", "12ms", "99.99%"],
              ["Auth Service", "Operational", "8ms", "99.98%"],
              ["Database", "Degraded", "145ms", "99.85%"],
              ["CDN", "Operational", "3ms", "100%"],
              ["Workers", "Operational", "22ms", "99.97%"],
            ],
            caption: "Last updated 2 minutes ago",
          },
        },
        sep2: { type: "Separator", props: { orientation: null } },
        accordion: {
          type: "Accordion",
          props: {
            items: [
              {
                title: "What does 'Degraded' mean?",
                content:
                  "The service is still operational but experiencing slower response times than normal. We are actively investigating.",
              },
              {
                title: "How is uptime calculated?",
                content:
                  "Uptime is measured over the current calendar month based on successful health-check pings every 30 seconds.",
              },
              {
                title: "How do I subscribe to updates?",
                content:
                  "You can subscribe to incident notifications via email or webhook on the Settings page.",
              },
            ],
            type: "single",
          },
        },
      },
    },
  },
];
