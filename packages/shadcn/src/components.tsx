"use client";

import { useState } from "react";
import {
  useBoundProp,
  useStateBinding,
  useFieldValidation,
  type BaseComponentProps,
} from "@json-render/react";

import { Button } from "./ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Switch } from "./ui/switch";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import {
  Dialog as DialogPrimitive,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Accordion as AccordionPrimitive,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Badge } from "./ui/badge";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Carousel as CarouselPrimitive,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Table as TablePrimitive,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Drawer as DrawerPrimitive,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import {
  DropdownMenu as DropdownMenuPrimitive,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Pagination as PaginationPrimitive,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import {
  Popover as PopoverPrimitive,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Skeleton } from "./ui/skeleton";
import { Slider } from "./ui/slider";
import {
  Tabs as TabsPrimitive,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "./ui/tabs";
import { Toggle } from "./ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import {
  Tooltip as TooltipPrimitive,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "./lib/utils";

// =============================================================================
// Types
// =============================================================================

interface ValidationCheck {
  type: string;
  message: string;
  args?: Record<string, unknown>;
}

// =============================================================================
// Component Prop Types
// =============================================================================

interface CardComponentProps {
  title?: string | null;
  description?: string | null;
  maxWidth?: "sm" | "md" | "lg" | "full" | null;
  centered?: boolean | null;
}

interface StackComponentProps {
  direction?: "horizontal" | "vertical" | null;
  gap?: "none" | "sm" | "md" | "lg" | null;
  align?: "start" | "center" | "end" | "stretch" | null;
  justify?: "start" | "center" | "end" | "between" | "around" | null;
}

interface GridComponentProps {
  columns?: number | null;
  gap?: "sm" | "md" | "lg" | null;
}

interface SeparatorComponentProps {
  orientation?: "horizontal" | "vertical" | null;
}

interface TabsComponentProps {
  tabs?: Array<{ label: string; value: string }> | null;
  defaultValue?: string | null;
  value?: string | null;
}

interface AccordionComponentProps {
  items?: Array<{ title: string; content: string }> | null;
  type?: "single" | "multiple" | null;
}

interface CollapsibleComponentProps {
  title?: string | null;
  defaultOpen?: boolean | null;
}

interface DialogComponentProps {
  title?: string | null;
  description?: string | null;
  openPath?: string | null;
}

interface DrawerComponentProps {
  title?: string | null;
  description?: string | null;
  openPath?: string | null;
}

interface CarouselComponentProps {
  items?: Array<{
    title?: string | null;
    description?: string | null;
  }> | null;
}

interface TableComponentProps {
  columns?: string[] | null;
  rows?: string[][] | null;
  caption?: string | null;
}

interface HeadingComponentProps {
  text?: string | null;
  level?: "h1" | "h2" | "h3" | "h4" | null;
}

interface TextComponentProps {
  text?: string | null;
  variant?: "body" | "caption" | "muted" | "lead" | "code" | null;
}

interface ImageComponentProps {
  src?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
}

interface AvatarComponentProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | null;
}

interface BadgeComponentProps {
  text?: string | null;
  variant?: "default" | "secondary" | "destructive" | "outline" | null;
}

interface AlertComponentProps {
  title?: string | null;
  message?: string | null;
  type?: "info" | "success" | "warning" | "error" | null;
}

interface ProgressComponentProps {
  value?: number | null;
  max?: number | null;
  label?: string | null;
}

interface SkeletonComponentProps {
  width?: string | null;
  height?: string | null;
  rounded?: boolean | null;
}

interface SpinnerComponentProps {
  size?: "sm" | "md" | "lg" | null;
  label?: string | null;
}

interface TooltipComponentProps {
  content?: string | null;
  text?: string | null;
}

interface PopoverComponentProps {
  trigger?: string | null;
  content?: string | null;
}

interface InputComponentProps {
  label?: string | null;
  name?: string | null;
  type?: "text" | "email" | "password" | "number" | null;
  placeholder?: string | null;
  value?: string | null;
  checks?: ValidationCheck[] | null;
}

interface TextareaComponentProps {
  label?: string | null;
  name?: string | null;
  placeholder?: string | null;
  rows?: number | null;
  value?: string | null;
  checks?: ValidationCheck[] | null;
}

interface SelectComponentProps {
  label?: string | null;
  name?: string | null;
  options?: string[] | null;
  placeholder?: string | null;
  value?: string | null;
  checks?: ValidationCheck[] | null;
}

interface CheckboxComponentProps {
  label?: string | null;
  name?: string | null;
  checked?: boolean | null;
}

interface RadioComponentProps {
  label?: string | null;
  name?: string | null;
  options?: string[] | null;
  value?: string | null;
}

interface SwitchComponentProps {
  label?: string | null;
  name?: string | null;
  checked?: boolean | null;
}

interface SliderComponentProps {
  label?: string | null;
  min?: number | null;
  max?: number | null;
  step?: number | null;
  value?: number | null;
}

interface ButtonComponentProps {
  label?: string | null;
  variant?: "primary" | "secondary" | "danger" | null;
  disabled?: boolean | null;
}

interface LinkComponentProps {
  label?: string | null;
  href?: string | null;
}

interface DropdownMenuComponentProps {
  label?: string | null;
  items?: Array<{ label: string; value: string }> | null;
  value?: string | null;
}

interface ToggleComponentProps {
  label?: string | null;
  pressed?: boolean | null;
  variant?: "default" | "outline" | null;
}

interface ToggleGroupComponentProps {
  items?: Array<{ label: string; value: string }> | null;
  type?: "single" | "multiple" | null;
  value?: string | null;
}

interface ButtonGroupComponentProps {
  buttons?: Array<{ label: string; value: string }> | null;
  selected?: string | null;
}

interface PaginationComponentProps {
  totalPages?: number | null;
  page?: number | null;
}

// =============================================================================
// Helpers
// =============================================================================

function getPaginationRange(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: Array<number | "ellipsis"> = [];
  pages.push(1);
  if (current > 3) {
    pages.push("ellipsis");
  }
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (current < total - 2) {
    pages.push("ellipsis");
  }
  pages.push(total);
  return pages;
}

// =============================================================================
// Standard Component Implementations
// =============================================================================

/**
 * Standard shadcn/ui component implementations.
 *
 * Pass to `defineRegistry()` from `@json-render/react` to create a
 * component registry for rendering JSON specs with shadcn/ui components.
 *
 * @example
 * ```ts
 * import { defineRegistry } from "@json-render/react";
 * import { shadcnComponents } from "@json-render/shadcn";
 *
 * const { registry } = defineRegistry(catalog, {
 *   components: {
 *     Card: shadcnComponents.Card,
 *     Button: shadcnComponents.Button,
 *   },
 * });
 * ```
 */
export const shadcnComponents = {
  // ── Layout ────────────────────────────────────────────────────────────

  Card: ({ props, children }: BaseComponentProps<CardComponentProps>) => {
    const maxWidthClass =
      props.maxWidth === "sm"
        ? "max-w-xs sm:min-w-[280px]"
        : props.maxWidth === "md"
          ? "max-w-sm sm:min-w-[320px]"
          : props.maxWidth === "lg"
            ? "max-w-md sm:min-w-[360px]"
            : "w-full";
    const centeredClass = props.centered ? "mx-auto" : "";

    return (
      <Card className={cn(maxWidthClass, centeredClass)}>
        {(props.title || props.description) && (
          <CardHeader>
            {props.title && <CardTitle>{props.title}</CardTitle>}
            {props.description && (
              <CardDescription>{props.description}</CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent className="flex flex-col gap-3">{children}</CardContent>
      </Card>
    );
  },

  Stack: ({ props, children }: BaseComponentProps<StackComponentProps>) => {
    const isHorizontal = props.direction === "horizontal";
    const gapMap: Record<string, string> = {
      none: "gap-0",
      sm: "gap-2",
      md: "gap-3",
      lg: "gap-4",
    };
    const alignMap: Record<string, string> = {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    };
    const justifyMap: Record<string, string> = {
      start: "",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around",
    };

    const gapClass = gapMap[props.gap ?? "md"] ?? "gap-3";
    const alignClass = alignMap[props.align ?? "start"] ?? "items-start";
    const justifyClass = justifyMap[props.justify ?? ""] ?? "";

    return (
      <div
        className={`flex ${isHorizontal ? "flex-row flex-wrap" : "flex-col"} ${gapClass} ${alignClass} ${justifyClass}`}
      >
        {children}
      </div>
    );
  },

  Grid: ({ props, children }: BaseComponentProps<GridComponentProps>) => {
    const colsMap: Record<number, string> = {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6",
    };
    const gridGapMap: Record<string, string> = {
      sm: "gap-2",
      md: "gap-3",
      lg: "gap-4",
    };

    const n = Math.max(1, Math.min(6, props.columns ?? 1));
    const cols = colsMap[n] ?? "grid-cols-1";
    const gridGap = gridGapMap[props.gap ?? "md"] ?? "gap-3";

    return <div className={`grid ${cols} ${gridGap}`}>{children}</div>;
  },

  Separator: ({ props }: BaseComponentProps<SeparatorComponentProps>) => {
    return (
      <Separator
        orientation={props.orientation ?? "horizontal"}
        className={props.orientation === "vertical" ? "h-full mx-2" : "my-3"}
      />
    );
  },

  Tabs: ({
    props,
    children,
    bindings,
    emit,
  }: BaseComponentProps<TabsComponentProps>) => {
    const tabs = props.tabs ?? [];
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState(
      props.defaultValue ?? tabs[0]?.value ?? "",
    );
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? tabs[0]?.value ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    return (
      <TabsPrimitive
        value={value}
        onValueChange={(v) => {
          setValue(v);
          emit("change");
        }}
      >
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {children}
      </TabsPrimitive>
    );
  },

  Accordion: ({ props }: BaseComponentProps<AccordionComponentProps>) => {
    const items = props.items ?? [];
    const isMultiple = props.type === "multiple";

    const itemElements = items.map((item, i) => (
      <AccordionItem key={i} value={`item-${i}`}>
        <AccordionTrigger>{item.title}</AccordionTrigger>
        <AccordionContent>{item.content}</AccordionContent>
      </AccordionItem>
    ));

    if (isMultiple) {
      return (
        <AccordionPrimitive type="multiple" className="w-full">
          {itemElements}
        </AccordionPrimitive>
      );
    }
    return (
      <AccordionPrimitive type="single" collapsible className="w-full">
        {itemElements}
      </AccordionPrimitive>
    );
  },

  Collapsible: ({
    props,
    children,
  }: BaseComponentProps<CollapsibleComponentProps>) => {
    const [open, setOpen] = useState(props.defaultOpen ?? false);
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="w-full">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            {props.title}
            <svg
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
      </Collapsible>
    );
  },

  Dialog: ({ props, children }: BaseComponentProps<DialogComponentProps>) => {
    const [open, setOpen] = useStateBinding<boolean>(props.openPath ?? "");
    return (
      <DialogPrimitive open={open ?? false} onOpenChange={(v) => setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{props.title}</DialogTitle>
            {props.description && (
              <DialogDescription>{props.description}</DialogDescription>
            )}
          </DialogHeader>
          {children}
        </DialogContent>
      </DialogPrimitive>
    );
  },

  Drawer: ({ props, children }: BaseComponentProps<DrawerComponentProps>) => {
    const [open, setOpen] = useStateBinding<boolean>(props.openPath ?? "");
    return (
      <DrawerPrimitive open={open ?? false} onOpenChange={(v) => setOpen(v)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{props.title}</DrawerTitle>
            {props.description && (
              <DrawerDescription>{props.description}</DrawerDescription>
            )}
          </DrawerHeader>
          <div className="p-4">{children}</div>
        </DrawerContent>
      </DrawerPrimitive>
    );
  },

  Carousel: ({ props }: BaseComponentProps<CarouselComponentProps>) => {
    const items = props.items ?? [];
    return (
      <CarouselPrimitive className="w-full">
        <CarouselContent>
          {items.map((item, i) => (
            <CarouselItem
              key={i}
              className="basis-3/4 md:basis-1/2 lg:basis-1/3"
            >
              <div className="border border-border rounded-lg p-4 bg-card h-full">
                {item.title && (
                  <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                )}
                {item.description && (
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </CarouselPrimitive>
    );
  },

  // ── Data Display ──────────────────────────────────────────────────────

  Table: ({ props }: BaseComponentProps<TableComponentProps>) => {
    const columns = props.columns ?? [];
    const rows = (props.rows ?? []).map((row) => row.map(String));

    return (
      <div className="rounded-md border border-border overflow-hidden">
        <TablePrimitive>
          {props.caption && <TableCaption>{props.caption}</TableCaption>}
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell key={j}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </TablePrimitive>
      </div>
    );
  },

  Heading: ({ props }: BaseComponentProps<HeadingComponentProps>) => {
    const level = props.level ?? "h2";
    const headingClass =
      level === "h1"
        ? "text-2xl font-bold"
        : level === "h3"
          ? "text-base font-semibold"
          : level === "h4"
            ? "text-sm font-semibold"
            : "text-lg font-semibold";

    if (level === "h1")
      return <h1 className={`${headingClass} text-left`}>{props.text}</h1>;
    if (level === "h3")
      return <h3 className={`${headingClass} text-left`}>{props.text}</h3>;
    if (level === "h4")
      return <h4 className={`${headingClass} text-left`}>{props.text}</h4>;
    return <h2 className={`${headingClass} text-left`}>{props.text}</h2>;
  },

  Text: ({ props }: BaseComponentProps<TextComponentProps>) => {
    const textClass =
      props.variant === "caption"
        ? "text-xs"
        : props.variant === "muted"
          ? "text-sm text-muted-foreground"
          : props.variant === "lead"
            ? "text-xl text-muted-foreground"
            : props.variant === "code"
              ? "font-mono text-sm bg-muted px-1.5 py-0.5 rounded"
              : "text-sm";

    if (props.variant === "code") {
      return <code className={`${textClass} text-left`}>{props.text}</code>;
    }
    return <p className={`${textClass} text-left`}>{props.text}</p>;
  },

  Image: ({ props }: BaseComponentProps<ImageComponentProps>) => {
    if (props.src) {
      return (
        <img
          src={props.src}
          alt={props.alt ?? ""}
          width={props.width ?? undefined}
          height={props.height ?? undefined}
          className="rounded max-w-full"
        />
      );
    }
    return (
      <div
        className="bg-muted border border-border rounded flex items-center justify-center text-xs text-muted-foreground"
        style={{ width: props.width ?? 80, height: props.height ?? 60 }}
      >
        {props.alt || "img"}
      </div>
    );
  },

  Avatar: ({ props }: BaseComponentProps<AvatarComponentProps>) => {
    const name = props.name || "?";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const avatarSize =
      props.size === "lg"
        ? "w-12 h-12 text-base"
        : props.size === "sm"
          ? "w-8 h-8 text-xs"
          : "w-10 h-10 text-sm";

    return (
      <div
        className={`${avatarSize} rounded-full bg-muted flex items-center justify-center font-medium`}
      >
        {initials}
      </div>
    );
  },

  Badge: ({ props }: BaseComponentProps<BadgeComponentProps>) => {
    return <Badge variant={props.variant ?? "default"}>{props.text}</Badge>;
  },

  Alert: ({ props }: BaseComponentProps<AlertComponentProps>) => {
    const variant = props.type === "error" ? "destructive" : "default";
    const customClass =
      props.type === "success"
        ? "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100"
        : props.type === "warning"
          ? "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100"
          : props.type === "info"
            ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100"
            : "";

    return (
      <Alert variant={variant} className={customClass}>
        <AlertTitle>{props.title}</AlertTitle>
        {props.message && <AlertDescription>{props.message}</AlertDescription>}
      </Alert>
    );
  },

  Progress: ({ props }: BaseComponentProps<ProgressComponentProps>) => {
    const value = Math.min(100, Math.max(0, props.value || 0));
    return (
      <div className="space-y-2">
        {props.label && (
          <Label className="text-sm text-muted-foreground">{props.label}</Label>
        )}
        <Progress value={value} />
      </div>
    );
  },

  Skeleton: ({ props }: BaseComponentProps<SkeletonComponentProps>) => {
    return (
      <Skeleton
        className={props.rounded ? "rounded-full" : "rounded-md"}
        style={{
          width: props.width ?? "100%",
          height: props.height ?? "1.25rem",
        }}
      />
    );
  },

  Spinner: ({ props }: BaseComponentProps<SpinnerComponentProps>) => {
    const sizeClass =
      props.size === "lg"
        ? "h-8 w-8"
        : props.size === "sm"
          ? "h-4 w-4"
          : "h-6 w-6";
    return (
      <div className="flex items-center gap-2">
        <svg
          className={`${sizeClass} animate-spin text-muted-foreground`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        {props.label && (
          <span className="text-sm text-muted-foreground">{props.label}</span>
        )}
      </div>
    );
  },

  Tooltip: ({ props }: BaseComponentProps<TooltipComponentProps>) => {
    return (
      <TooltipProvider>
        <TooltipPrimitive>
          <TooltipTrigger asChild>
            <span className="text-sm underline decoration-dotted cursor-help">
              {props.text}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{props.content}</p>
          </TooltipContent>
        </TooltipPrimitive>
      </TooltipProvider>
    );
  },

  Popover: ({ props }: BaseComponentProps<PopoverComponentProps>) => {
    return (
      <PopoverPrimitive>
        <PopoverTrigger asChild>
          <Button variant="outline" className="text-sm">
            {props.trigger}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <p className="text-sm">{props.content}</p>
        </PopoverContent>
      </PopoverPrimitive>
    );
  },

  // ── Form Inputs ───────────────────────────────────────────────────────

  Input: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<InputComponentProps>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState("");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    const hasValidation = !!(bindings?.value && props.checks?.length);
    const { errors, validate } = useFieldValidation(
      bindings?.value ?? "",
      hasValidation ? { checks: props.checks ?? [] } : undefined,
    );

    return (
      <div className="space-y-2">
        {props.label && (
          <Label htmlFor={props.name ?? undefined}>{props.label}</Label>
        )}
        <Input
          id={props.name ?? undefined}
          name={props.name ?? undefined}
          type={props.type ?? "text"}
          placeholder={props.placeholder ?? ""}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") emit("submit");
          }}
          onFocus={() => emit("focus")}
          onBlur={() => {
            if (hasValidation) validate();
            emit("blur");
          }}
        />
        {errors.length > 0 && (
          <p className="text-sm text-destructive">{errors[0]}</p>
        )}
      </div>
    );
  },

  Textarea: ({
    props,
    bindings,
  }: BaseComponentProps<TextareaComponentProps>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState("");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    const hasValidation = !!(bindings?.value && props.checks?.length);
    const { errors, validate } = useFieldValidation(
      bindings?.value ?? "",
      hasValidation ? { checks: props.checks ?? [] } : undefined,
    );

    return (
      <div className="space-y-2">
        {props.label && (
          <Label htmlFor={props.name ?? undefined}>{props.label}</Label>
        )}
        <Textarea
          id={props.name ?? undefined}
          name={props.name ?? undefined}
          placeholder={props.placeholder ?? ""}
          rows={props.rows ?? 3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (hasValidation) validate();
          }}
        />
        {errors.length > 0 && (
          <p className="text-sm text-destructive">{errors[0]}</p>
        )}
      </div>
    );
  },

  Select: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<SelectComponentProps>) => {
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState<string>("");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;
    const rawOptions = props.options ?? [];
    const options = rawOptions.map((opt) =>
      typeof opt === "string" ? opt : String(opt ?? ""),
    );

    const hasValidation = !!(bindings?.value && props.checks?.length);
    const { errors, validate } = useFieldValidation(
      bindings?.value ?? "",
      hasValidation ? { checks: props.checks ?? [] } : undefined,
    );

    return (
      <div className="space-y-2">
        <Label>{props.label}</Label>
        <Select
          value={value}
          onValueChange={(v) => {
            setValue(v);
            if (hasValidation) validate();
            emit("change");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={props.placeholder ?? "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt, idx) => (
              <SelectItem key={`${idx}-${opt}`} value={opt || `option-${idx}`}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.length > 0 && (
          <p className="text-sm text-destructive">{errors[0]}</p>
        )}
      </div>
    );
  },

  Checkbox: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<CheckboxComponentProps>) => {
    const [boundChecked, setBoundChecked] = useBoundProp<boolean>(
      props.checked as boolean | undefined,
      bindings?.checked,
    );
    const [localChecked, setLocalChecked] = useState(!!props.checked);
    const isBound = !!bindings?.checked;
    const checked = isBound ? (boundChecked ?? false) : localChecked;
    const setChecked = isBound ? setBoundChecked : setLocalChecked;

    return (
      <div className="flex items-center space-x-2">
        <Checkbox
          id={props.name ?? undefined}
          checked={checked}
          onCheckedChange={(c) => {
            setChecked(c === true);
            emit("change");
          }}
        />
        <Label htmlFor={props.name ?? undefined} className="cursor-pointer">
          {props.label}
        </Label>
      </div>
    );
  },

  Radio: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<RadioComponentProps>) => {
    const rawOptions = props.options ?? [];
    const options = rawOptions.map((opt) =>
      typeof opt === "string" ? opt : String(opt ?? ""),
    );
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState(options[0] ?? "");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    return (
      <div className="space-y-2">
        {props.label && <Label>{props.label}</Label>}
        <RadioGroup
          value={value}
          onValueChange={(v) => {
            setValue(v);
            emit("change");
          }}
        >
          {options.map((opt, idx) => (
            <div key={`${idx}-${opt}`} className="flex items-center space-x-2">
              <RadioGroupItem
                value={opt || `option-${idx}`}
                id={`${props.name}-${idx}-${opt}`}
              />
              <Label
                htmlFor={`${props.name}-${idx}-${opt}`}
                className="cursor-pointer"
              >
                {opt}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  },

  Switch: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<SwitchComponentProps>) => {
    const [boundChecked, setBoundChecked] = useBoundProp<boolean>(
      props.checked as boolean | undefined,
      bindings?.checked,
    );
    const [localChecked, setLocalChecked] = useState(!!props.checked);
    const isBound = !!bindings?.checked;
    const checked = isBound ? (boundChecked ?? false) : localChecked;
    const setChecked = isBound ? setBoundChecked : setLocalChecked;

    return (
      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor={props.name ?? undefined} className="cursor-pointer">
          {props.label}
        </Label>
        <Switch
          id={props.name ?? undefined}
          checked={checked}
          onCheckedChange={(c) => {
            setChecked(c);
            emit("change");
          }}
        />
      </div>
    );
  },

  Slider: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<SliderComponentProps>) => {
    const [boundValue, setBoundValue] = useBoundProp<number>(
      props.value as number | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState(props.min ?? 0);
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? props.min ?? 0) : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    return (
      <div className="space-y-2">
        {props.label && (
          <div className="flex justify-between">
            <Label className="text-sm">{props.label}</Label>
            <span className="text-sm text-muted-foreground">{value}</span>
          </div>
        )}
        <Slider
          value={[value]}
          min={props.min ?? 0}
          max={props.max ?? 100}
          step={props.step ?? 1}
          onValueChange={(v) => {
            setValue(v[0] ?? 0);
            emit("change");
          }}
        />
      </div>
    );
  },

  // ── Actions ───────────────────────────────────────────────────────────

  Button: ({ props, emit }: BaseComponentProps<ButtonComponentProps>) => {
    const variant =
      props.variant === "danger"
        ? "destructive"
        : props.variant === "secondary"
          ? "secondary"
          : "default";

    return (
      <Button
        variant={variant}
        disabled={props.disabled ?? false}
        onClick={() => emit("press")}
      >
        {props.label}
      </Button>
    );
  },

  Link: ({ props, emit }: BaseComponentProps<LinkComponentProps>) => {
    return (
      <a
        href={props.href ?? "#"}
        className="text-primary underline-offset-4 hover:underline text-sm font-medium"
        onClick={() => emit("press")}
      >
        {props.label}
      </a>
    );
  },

  DropdownMenu: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<DropdownMenuComponentProps>) => {
    const items = props.items ?? [];
    const [, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    return (
      <DropdownMenuPrimitive>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">{props.label}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {items.map((item) => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => {
                setBoundValue(item.value);
                emit("select");
              }}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenuPrimitive>
    );
  },

  Toggle: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<ToggleComponentProps>) => {
    const [boundPressed, setBoundPressed] = useBoundProp<boolean>(
      props.pressed as boolean | undefined,
      bindings?.pressed,
    );
    const [localPressed, setLocalPressed] = useState(props.pressed ?? false);
    const isBound = !!bindings?.pressed;
    const pressed = isBound ? (boundPressed ?? false) : localPressed;
    const setPressed = isBound ? setBoundPressed : setLocalPressed;

    return (
      <Toggle
        variant={props.variant ?? "default"}
        pressed={pressed}
        onPressedChange={(v) => {
          setPressed(v);
          emit("change");
        }}
      >
        {props.label}
      </Toggle>
    );
  },

  ToggleGroup: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<ToggleGroupComponentProps>) => {
    const type = props.type ?? "single";
    const items = props.items ?? [];
    const [boundValue, setBoundValue] = useBoundProp<string>(
      props.value as string | undefined,
      bindings?.value,
    );
    const [localValue, setLocalValue] = useState(items[0]?.value ?? "");
    const isBound = !!bindings?.value;
    const value = isBound ? (boundValue ?? "") : localValue;
    const setValue = isBound ? setBoundValue : setLocalValue;

    if (type === "multiple") {
      return (
        <ToggleGroup type="multiple">
          {items.map((item) => (
            <ToggleGroupItem key={item.value} value={item.value}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      );
    }

    return (
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => {
          if (v) {
            setValue(v);
            emit("change");
          }
        }}
      >
        {items.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  },

  ButtonGroup: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<ButtonGroupComponentProps>) => {
    const buttons = props.buttons ?? [];
    const [boundSelected, setBoundSelected] = useBoundProp<string>(
      props.selected as string | undefined,
      bindings?.selected,
    );
    const [localValue, setLocalValue] = useState(buttons[0]?.value ?? "");
    const isBound = !!bindings?.selected;
    const value = isBound ? (boundSelected ?? "") : localValue;
    const setValue = isBound ? setBoundSelected : setLocalValue;

    return (
      <div className="inline-flex rounded-md border border-border">
        {buttons.map((btn, i) => (
          <button
            key={btn.value}
            className={`px-3 py-1.5 text-sm transition-colors ${
              value === btn.value
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            } ${i > 0 ? "border-l border-border" : ""} ${
              i === 0 ? "rounded-l-md" : ""
            } ${i === buttons.length - 1 ? "rounded-r-md" : ""}`}
            onClick={() => {
              setValue(btn.value);
              emit("change");
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    );
  },

  Pagination: ({
    props,
    bindings,
    emit,
  }: BaseComponentProps<PaginationComponentProps>) => {
    const [boundPage, setBoundPage] = useBoundProp<number>(
      props.page as number | undefined,
      bindings?.page,
    );
    const currentPage = boundPage ?? 1;
    const totalPages = props.totalPages ?? 1;
    const pages = getPaginationRange(currentPage, totalPages);

    return (
      <PaginationPrimitive>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) {
                  setBoundPage(currentPage - 1);
                  emit("change");
                }
              }}
            />
          </PaginationItem>
          {pages.map((page, idx) =>
            page === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={page === currentPage}
                  onClick={(e) => {
                    e.preventDefault();
                    setBoundPage(page);
                    emit("change");
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) {
                  setBoundPage(currentPage + 1);
                  emit("change");
                }
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </PaginationPrimitive>
    );
  },
};
