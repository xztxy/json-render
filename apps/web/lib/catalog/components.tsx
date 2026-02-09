"use client";

import { useState, type ReactNode } from "react";
import type { z } from "zod";
import { useStateBinding } from "@json-render/react";

// shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog as DialogPrimitive,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion as AccordionPrimitive,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Carousel as CarouselPrimitive,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table as TablePrimitive,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Drawer as DrawerPrimitive,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu as DropdownMenuPrimitive,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination as PaginationPrimitive,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover as PopoverPrimitive,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Tabs as TabsPrimitive,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip as TooltipPrimitive,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { playgroundCatalog } from "../catalog";

// =============================================================================
// Types - Inferred from Catalog
// =============================================================================

type CatalogComponents = typeof playgroundCatalog.data.components;

export type InferProps<K extends keyof CatalogComponents> =
  CatalogComponents[K] extends { props: z.ZodType<infer P> } ? P : never;

export interface ComponentContext<K extends keyof CatalogComponents> {
  props: InferProps<K>;
  children?: ReactNode;
  emit?: (event: string) => void;
  loading?: boolean;
}

export type ComponentFn<K extends keyof CatalogComponents> = (
  ctx: ComponentContext<K>,
) => ReactNode;

// =============================================================================
// Components - Type-safe with Catalog using shadcn/ui
// =============================================================================

export const components: { [K in keyof CatalogComponents]: ComponentFn<K> } = {
  // Layout Components
  Card: ({ props, children }) => {
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
      <div
        className={`border border-border rounded-lg p-4 bg-card text-card-foreground overflow-hidden ${maxWidthClass} ${centeredClass}`}
      >
        {(props.title || props.description) && (
          <div className="mb-4">
            {props.title && (
              <h3 className="font-semibold text-lg text-left">{props.title}</h3>
            )}
            {props.description && (
              <p className="text-sm text-muted-foreground mt-1 text-left">
                {props.description}
              </p>
            )}
          </div>
        )}
        <div className="space-y-3">{children}</div>
      </div>
    );
  },

  Stack: ({ props, children }) => {
    const isHorizontal = props.direction === "horizontal";

    const gapClass =
      props.gap === "lg"
        ? "gap-4"
        : props.gap === "md"
          ? "gap-3"
          : props.gap === "sm"
            ? "gap-2"
            : props.gap === "none"
              ? "gap-0"
              : "gap-3";

    const alignClass =
      props.align === "center"
        ? "items-center"
        : props.align === "end"
          ? "items-end"
          : props.align === "stretch"
            ? "items-stretch"
            : "items-start";

    const justifyClass =
      props.justify === "center"
        ? "justify-center"
        : props.justify === "end"
          ? "justify-end"
          : props.justify === "between"
            ? "justify-between"
            : props.justify === "around"
              ? "justify-around"
              : "";

    return (
      <div
        className={`flex ${isHorizontal ? "flex-row flex-wrap" : "flex-col"} ${gapClass} ${alignClass} ${justifyClass}`}
      >
        {children}
      </div>
    );
  },

  Grid: ({ props, children }) => {
    const cols =
      props.columns === 6
        ? "grid-cols-6"
        : props.columns === 5
          ? "grid-cols-5"
          : props.columns === 4
            ? "grid-cols-4"
            : props.columns === 3
              ? "grid-cols-3"
              : props.columns === 2
                ? "grid-cols-2"
                : "grid-cols-1";
    const gridGap =
      props.gap === "lg" ? "gap-4" : props.gap === "sm" ? "gap-2" : "gap-3";

    return <div className={`grid ${cols} ${gridGap}`}>{children}</div>;
  },

  Divider: () => <Separator className="my-3" />,

  Dialog: ({ props, children }) => {
    const [open, setOpen] = useStateBinding<boolean>(props.openPath);
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

  Accordion: ({ props }) => {
    const accordionType = props.type ?? "single";
    // Radix requires different props for single vs multiple
    if (accordionType === "multiple") {
      return (
        <AccordionPrimitive type="multiple" className="w-full">
          {props.items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger>{item.title}</AccordionTrigger>
              <AccordionContent>{item.content}</AccordionContent>
            </AccordionItem>
          ))}
        </AccordionPrimitive>
      );
    }
    return (
      <AccordionPrimitive type="single" collapsible className="w-full">
        {props.items.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent>{item.content}</AccordionContent>
          </AccordionItem>
        ))}
      </AccordionPrimitive>
    );
  },

  ButtonGroup: ({ props, emit }) => {
    const [boundValue, setBoundValue] = props.statePath
      ? useStateBinding<string>(props.statePath)
      : [undefined, undefined];
    const [localValue, setLocalValue] = useState(props.buttons[0]?.value ?? "");
    const value = props.statePath ? (boundValue ?? "") : localValue;
    const setValue = props.statePath ? setBoundValue! : setLocalValue;

    return (
      <div className="inline-flex rounded-md border border-border">
        {props.buttons.map((btn, i) => (
          <button
            key={btn.value}
            className={`px-3 py-1.5 text-sm transition-colors ${
              value === btn.value
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            } ${i > 0 ? "border-l border-border" : ""} ${
              i === 0 ? "rounded-l-md" : ""
            } ${i === props.buttons.length - 1 ? "rounded-r-md" : ""}`}
            onClick={() => {
              setValue(btn.value);
              emit?.("change");
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    );
  },

  Carousel: ({ props }) => {
    return (
      <CarouselPrimitive className="w-full">
        <CarouselContent>
          {props.items.map((item, i) => (
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

  Collapsible: ({ props, children }) => {
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

  Table: ({ props }) => {
    return (
      <div className="rounded-md border border-border overflow-hidden">
        <TablePrimitive>
          {props.caption && <TableCaption>{props.caption}</TableCaption>}
          <TableHeader>
            <TableRow>
              {props.columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.rows.map((row, i) => (
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

  Drawer: ({ props, children }) => {
    const [open, setOpen] = useStateBinding<boolean>(props.openPath);
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

  DropdownMenu: ({ props, emit }) => {
    return (
      <DropdownMenuPrimitive>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">{props.label}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {props.items.map((item) => (
            <DropdownMenuItem key={item.value} onClick={() => emit?.("select")}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenuPrimitive>
    );
  },

  Pagination: ({ props, emit }) => {
    const [boundValue, setBoundValue] = useStateBinding<number>(
      props.statePath,
    );
    const currentPage = boundValue ?? 1;

    const pages = Array.from({ length: props.totalPages }, (_, i) => i + 1);

    return (
      <PaginationPrimitive>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) {
                  setBoundValue(currentPage - 1);
                  emit?.("change");
                }
              }}
            />
          </PaginationItem>
          {pages.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={(e) => {
                  e.preventDefault();
                  setBoundValue(page);
                  emit?.("change");
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < props.totalPages) {
                  setBoundValue(currentPage + 1);
                  emit?.("change");
                }
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </PaginationPrimitive>
    );
  },

  Popover: ({ props }) => {
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

  Separator: ({ props }) => {
    return (
      <Separator
        orientation={props.orientation ?? "horizontal"}
        className={props.orientation === "vertical" ? "h-full mx-2" : "my-3"}
      />
    );
  },

  Skeleton: ({ props }) => {
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

  Slider: ({ props, emit }) => {
    const [boundValue, setBoundValue] = props.statePath
      ? useStateBinding<number>(props.statePath)
      : [undefined, undefined];
    const [localValue, setLocalValue] = useState(props.min ?? 0);
    const value = props.statePath ? (boundValue ?? props.min ?? 0) : localValue;
    const setValue = props.statePath ? setBoundValue! : setLocalValue;

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
            emit?.("change");
          }}
        />
      </div>
    );
  },

  Spinner: ({ props }) => {
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

  Tabs: ({ props, emit }) => {
    const [boundValue, setBoundValue] = props.statePath
      ? useStateBinding<string>(props.statePath)
      : [undefined, undefined];
    const [localValue, setLocalValue] = useState(
      props.defaultValue ?? props.tabs[0]?.value ?? "",
    );
    const value = props.statePath
      ? (boundValue ?? props.tabs[0]?.value ?? "")
      : localValue;
    const setValue = props.statePath ? setBoundValue! : setLocalValue;

    return (
      <TabsPrimitive
        value={value}
        onValueChange={(v) => {
          setValue(v);
          emit?.("change");
        }}
      >
        <TabsList>
          {props.tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </TabsPrimitive>
    );
  },

  Toggle: ({ props, emit }) => {
    const [boundValue, setBoundValue] = props.statePath
      ? useStateBinding<boolean>(props.statePath)
      : [undefined, undefined];
    const [localPressed, setLocalPressed] = useState(props.pressed ?? false);
    const pressed = props.statePath ? (boundValue ?? false) : localPressed;
    const setPressed = props.statePath ? setBoundValue! : setLocalPressed;

    return (
      <Toggle
        variant={props.variant ?? "default"}
        pressed={pressed}
        onPressedChange={(v) => {
          setPressed(v);
          emit?.("change");
        }}
      >
        {props.label}
      </Toggle>
    );
  },

  ToggleGroup: ({ props, emit }) => {
    const type = props.type ?? "single";
    const [boundValue, setBoundValue] = props.statePath
      ? useStateBinding<string>(props.statePath)
      : [undefined, undefined];
    const [localValue, setLocalValue] = useState(props.items[0]?.value ?? "");
    const value = props.statePath ? (boundValue ?? "") : localValue;
    const setValue = props.statePath ? setBoundValue! : setLocalValue;

    if (type === "multiple") {
      return (
        <ToggleGroup type="multiple">
          {props.items.map((item) => (
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
            emit?.("change");
          }
        }}
      >
        {props.items.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  },

  Tooltip: ({ props }) => {
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

  Typography: ({ props }) => {
    const variant = props.variant ?? "p";
    switch (variant) {
      case "h1":
        return (
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            {props.text}
          </h1>
        );
      case "h2":
        return (
          <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
            {props.text}
          </h2>
        );
      case "h3":
        return (
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            {props.text}
          </h3>
        );
      case "h4":
        return (
          <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
            {props.text}
          </h4>
        );
      case "lead":
        return <p className="text-xl text-muted-foreground">{props.text}</p>;
      case "large":
        return <p className="text-lg font-semibold">{props.text}</p>;
      case "small":
        return (
          <small className="text-sm font-medium leading-none">
            {props.text}
          </small>
        );
      case "muted":
        return <p className="text-sm text-muted-foreground">{props.text}</p>;
      case "blockquote":
        return (
          <blockquote className="mt-2 border-l-2 pl-6 italic">
            {props.text}
          </blockquote>
        );
      case "code":
        return (
          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
            {props.text}
          </code>
        );
      case "list":
        return (
          <ul className="ml-6 list-disc [&>li]:mt-2">
            {props.text.split("\n").map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        );
      default:
        return <p className="leading-7">{props.text}</p>;
    }
  },

  // Form Inputs
  Input: ({ props, emit }) => {
    const [boundValue, setBoundValue] = props.statePath
      ? useStateBinding<string>(props.statePath)
      : [undefined, undefined];
    const [localValue, setLocalValue] = useState("");
    const value = props.statePath ? (boundValue ?? "") : localValue;
    const setValue = props.statePath ? setBoundValue! : setLocalValue;

    return (
      <div className="space-y-2">
        {props.label && <Label htmlFor={props.name}>{props.label}</Label>}
        <Input
          id={props.name}
          name={props.name}
          type={props.type ?? "text"}
          placeholder={props.placeholder ?? ""}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") emit?.("submit");
          }}
          onFocus={() => emit?.("focus")}
          onBlur={() => emit?.("blur")}
        />
      </div>
    );
  },

  Textarea: ({ props }) => {
    const [boundValue, setBoundValue] = props.statePath
      ? useStateBinding<string>(props.statePath)
      : [undefined, undefined];
    const [localValue, setLocalValue] = useState("");
    const value = props.statePath ? (boundValue ?? "") : localValue;
    const setValue = props.statePath ? setBoundValue! : setLocalValue;

    return (
      <div className="space-y-2">
        {props.label && <Label htmlFor={props.name}>{props.label}</Label>}
        <Textarea
          id={props.name}
          name={props.name}
          placeholder={props.placeholder ?? ""}
          rows={props.rows ?? 3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
    );
  },

  Select: ({ props, emit }) => {
    const [boundValue, setBoundValue] = props.statePath
      ? useStateBinding<string>(props.statePath)
      : [undefined, undefined];
    const [localValue, setLocalValue] = useState<string>("");
    const value = props.statePath ? (boundValue ?? "") : localValue;
    const setValue = props.statePath ? setBoundValue! : setLocalValue;

    return (
      <div className="space-y-2">
        <Label>{props.label}</Label>
        <Select
          value={value}
          onValueChange={(v) => {
            setValue(v);
            emit?.("change");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={props.placeholder ?? "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {props.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  },

  Checkbox: ({ props, emit }) => {
    const [boundValue, setBoundValue] = props.statePath
      ? useStateBinding<boolean>(props.statePath)
      : [undefined, undefined];
    const [localChecked, setLocalChecked] = useState(!!props.checked);
    const checked = props.statePath ? (boundValue ?? false) : localChecked;
    const setChecked = props.statePath ? setBoundValue! : setLocalChecked;

    return (
      <div className="flex items-center space-x-2">
        <Checkbox
          id={props.name}
          checked={checked}
          onCheckedChange={(c) => {
            setChecked(c === true);
            emit?.("change");
          }}
        />
        <Label htmlFor={props.name} className="cursor-pointer">
          {props.label}
        </Label>
      </div>
    );
  },

  Radio: ({ props, emit }) => {
    const [boundValue, setBoundValue] = props.statePath
      ? useStateBinding<string>(props.statePath)
      : [undefined, undefined];
    const [localValue, setLocalValue] = useState(props.options[0] ?? "");
    const value = props.statePath ? (boundValue ?? "") : localValue;
    const setValue = props.statePath ? setBoundValue! : setLocalValue;

    return (
      <div className="space-y-2">
        {props.label && <Label>{props.label}</Label>}
        <RadioGroup
          value={value}
          onValueChange={(v) => {
            setValue(v);
            emit?.("change");
          }}
        >
          {props.options.map((opt) => (
            <div key={opt} className="flex items-center space-x-2">
              <RadioGroupItem value={opt} id={`${props.name}-${opt}`} />
              <Label
                htmlFor={`${props.name}-${opt}`}
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

  Switch: ({ props, emit }) => {
    const [boundValue, setBoundValue] = props.statePath
      ? useStateBinding<boolean>(props.statePath)
      : [undefined, undefined];
    const [localChecked, setLocalChecked] = useState(!!props.checked);
    const checked = props.statePath ? (boundValue ?? false) : localChecked;
    const setChecked = props.statePath ? setBoundValue! : setLocalChecked;

    return (
      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor={props.name} className="cursor-pointer">
          {props.label}
        </Label>
        <Switch
          id={props.name}
          checked={checked}
          onCheckedChange={(c) => {
            setChecked(c);
            emit?.("change");
          }}
        />
      </div>
    );
  },

  // Actions
  Button: ({ props, emit }) => {
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
        onClick={() => emit?.("press")}
      >
        {props.label}
      </Button>
    );
  },

  Link: ({ props, emit }) => (
    <Button
      variant="link"
      className="h-auto p-0"
      onClick={() => emit?.("press")}
    >
      {props.label}
    </Button>
  ),

  // Typography
  Heading: ({ props }) => {
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

  Text: ({ props }) => {
    const textClass =
      props.variant === "caption"
        ? "text-xs"
        : props.variant === "muted"
          ? "text-sm text-muted-foreground"
          : "text-sm";

    return <p className={`${textClass} text-left`}>{props.text}</p>;
  },

  // Data Display
  Image: ({ props }) => {
    const imgStyle = {
      width: props.width ?? 80,
      height: props.height ?? 60,
    };

    return (
      <div
        className="bg-muted border border-border rounded flex items-center justify-center text-xs text-muted-foreground aspect-video"
        style={imgStyle}
      >
        {props.alt || "img"}
      </div>
    );
  },

  Avatar: ({ props }) => {
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

  Badge: ({ props }) => {
    const variant =
      props.variant === "success" || props.variant === "warning"
        ? "secondary"
        : props.variant === "danger"
          ? "destructive"
          : "default";

    // Add custom colors for success/warning
    const customClass =
      props.variant === "success"
        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
        : props.variant === "warning"
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
          : "";

    return (
      <Badge variant={variant} className={customClass}>
        {props.text}
      </Badge>
    );
  },

  Alert: ({ props }) => {
    const variant = props.type === "error" ? "destructive" : "default";

    // Custom colors for different alert types
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

  Progress: ({ props }) => {
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

  Rating: ({ props }) => {
    const ratingValue = props.value || 0;
    const maxRating = props.max ?? 5;

    return (
      <div className="space-y-2">
        {props.label && (
          <Label className="text-sm text-muted-foreground">{props.label}</Label>
        )}
        <div className="flex gap-1">
          {Array.from({ length: maxRating }).map((_, i) => (
            <span
              key={i}
              className={`text-lg ${i < ratingValue ? "text-yellow-400" : "text-muted"}`}
            >
              *
            </span>
          ))}
        </div>
      </div>
    );
  },

  // Charts
  BarGraph: ({ props }) => {
    const data = props.data || [];
    const maxValue = Math.max(...data.map((d) => d.value), 1);

    return (
      <div className="space-y-2">
        {props.title && (
          <div className="text-sm font-medium text-left">{props.title}</div>
        )}
        <div className="flex gap-2">
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs text-muted-foreground">{d.value}</div>
              <div className="w-full h-24 flex items-end">
                <div
                  className="w-full bg-primary rounded-t transition-all"
                  style={{
                    height: `${(d.value / maxValue) * 100}%`,
                    minHeight: 2,
                  }}
                />
              </div>
              <div className="text-xs text-muted-foreground truncate w-full text-center">
                {d.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },

  LineGraph: ({ props }) => {
    const data = props.data || [];
    const maxValue = Math.max(...data.map((d) => d.value));
    const minValue = Math.min(...data.map((d) => d.value));
    const range = maxValue - minValue || 1;

    const width = 300;
    const height = 100;
    const padding = { top: 10, right: 10, bottom: 10, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const points = data.map((d, i) => {
      const x =
        padding.left +
        (data.length > 1
          ? (i / (data.length - 1)) * chartWidth
          : chartWidth / 2);
      const y =
        padding.top +
        chartHeight -
        ((d.value - minValue) / range) * chartHeight;
      return { x, y, ...d };
    });

    const pathD =
      points.length > 0
        ? `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`
        : "";

    return (
      <div className="space-y-2">
        {props.title && (
          <div className="text-sm font-medium text-left">{props.title}</div>
        )}
        <div className="relative h-28">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            <line
              x1={padding.left}
              y1={padding.top + chartHeight / 2}
              x2={width - padding.right}
              y2={padding.top + chartHeight / 2}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="1"
            />
            <line
              x1={padding.left}
              y1={padding.top}
              x2={width - padding.right}
              y2={padding.top}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="1"
            />
            <line
              x1={padding.left}
              y1={height - padding.bottom}
              x2={width - padding.right}
              y2={height - padding.bottom}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="1"
            />
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              />
            )}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="4"
                className="fill-primary"
              />
            ))}
          </svg>
        </div>
        {data.length > 0 && (
          <div className="flex justify-between">
            {data.map((d, i) => (
              <div
                key={i}
                className="text-xs text-muted-foreground text-center"
                style={{ width: `${100 / data.length}%` }}
              >
                {d.label}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
};

// Fallback component for unknown types
export function Fallback({ type }: { type: string }) {
  return <div className="text-xs text-muted-foreground">[{type}]</div>;
}
