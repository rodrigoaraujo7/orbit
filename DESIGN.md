# Design system — copy and paste

Dark, near-black product UI. One accent: bordô (`#c03a4a`). Everything else is neutral grayscale. Instrument Serif for titles and names, Instrument Sans for UI. Pill buttons, hairline borders, glass only on overlays and signed-out screens.

Paste this document into a prompt when generating screens, components, or CSS that must match this front end. Do not invent a light theme, a second brand color, or extra chart hues.

Stack this system assumes: Tailwind CSS v4, CSS variables, shadcn `base-luma` (neutral, CSS variables), Base UI primitives, Lucide icons at 16px (`size-4`) unless a recipe says otherwise.

---

## Personality

- Quiet surfaces, loud type. Page titles are large serif at normal weight. Body and controls are sans, 14px, medium.
- Bordô is scarce. Use it for the primary button, the active nav marker, the active tab underline, status “in progress”, focus rings, and the refetch scan. Do not paint cards, page backgrounds, or large regions in bordô.
- Borders are white at 10% opacity, not gray solids. Elevation is a ring or a soft shadow, not a heavy drop shadow.
- Motion is short and ease-out. Honor `prefers-reduced-motion`: skip entrance animations, count-up, and the filter scan.
- Numbers that are money, counts, or dates use `tabular-nums`.
- Copy is never hardcoded in the component. This document only specifies visual treatment.

---

## Color

Source of truth is OKLCH. Hex is the sRGB equivalent for tools that cannot read OKLCH. Alpha tokens stay as white-with-alpha, not a flattened gray.

| Token                            | OKLCH                       | Hex       | Use                                     |
| -------------------------------- | --------------------------- | --------- | --------------------------------------- |
| `background`                     | `oklch(0.1 0 0)`            | `#030303` | Page, html, inputs                      |
| `foreground`                     | `oklch(0.985 0 0)`          | `#fafafa` | Primary text                            |
| `card`                           | `oklch(0.14 0 0)`           | `#090909` | Cards, popovers                         |
| `card-foreground`                | `oklch(0.985 0 0)`          | `#fafafa` | Text on cards                           |
| `popover`                        | `oklch(0.14 0 0)`           | `#090909` | Menus, toasts                           |
| `primary`                        | `oklch(0.55 0.17 18)`       | `#c03a4a` | Key actions, active, in-progress        |
| `primary-foreground`             | `oklch(0.985 0 0)`          | `#fafafa` | Text on primary fills                   |
| `secondary` / `muted` / `accent` | `oklch(0.269 0 0)`          | `#262626` | Secondary fills, hover, icon wells      |
| `muted-foreground`               | `oklch(0.708 0 0)`          | `#a1a1a1` | Descriptions, labels, placeholders      |
| `destructive`                    | `oklch(0.704 0.191 22.216)` | `#ff6467` | Errors, negative money, failed workflow |
| `success`                        | `oklch(0.696 0.17 162.48)`  | `#00bc7d` | Completed, positive                     |
| `warning`                        | `oklch(0.769 0.188 70.08)`  | `#fe9a00` | Paused, running                         |
| `border`                         | `oklch(1 0 0 / 10%)`        | white 10% | Hairlines, dividers, scrollbar          |
| `input`                          | `oklch(1 0 0 / 15%)`        | white 15% | Input border, textarea fill mix         |
| `ring`                           | same as `primary`           | `#c03a4a` | Focus                                   |
| `sidebar`                        | `oklch(0.16 0 0)`           | `#0d0d0d` | Desktop sidebar                         |
| `sidebar-foreground`             | `oklch(0.985 0 0)`          | `#fafafa` | Sidebar text                            |
| `sidebar-primary`                | same as `primary`           | `#c03a4a` | Active nav tick                         |
| `sidebar-accent`                 | `oklch(0.269 0 0)`          | `#262626` | Nav hover and active fill               |
| `sidebar-border`                 | `oklch(1 0 0 / 10%)`        | white 10% | Sidebar divider                         |

`color-scheme: dark`. There is no light palette.

### Chart palette

Six hues, fixed order. Do not reorder. Do not add a seventh. They sit in one lightness band, stay separable for color-vision deficiency, and contrast against the dark surface.

| Token     | OKLCH                  | Hex       | Role    |
| --------- | ---------------------- | --------- | ------- |
| `chart-1` | `oklch(0.58 0.18 18)`  | `#cf3f50` | Bordô   |
| `chart-2` | `oklch(0.63 0.12 195)` | `#009fa0` | Teal    |
| `chart-3` | `oklch(0.66 0.14 70)`  | `#c8800d` | Amber   |
| `chart-4` | `oklch(0.55 0.17 265)` | `#3f69d3` | Blue    |
| `chart-5` | `oklch(0.65 0.16 145)` | `#43a84c` | Green   |
| `chart-6` | `oklch(0.58 0.19 320)` | `#a94bbe` | Magenta |

### Status color

Project status and workflow share one mapping. A status never changes color between a badge, a dot, and a text label.

| Status           | Badge                                 | Dot / text              |
| ---------------- | ------------------------------------- | ----------------------- |
| Queued           | `bg-muted text-muted-foreground`      | `muted-foreground`      |
| In progress      | `bg-primary/20 text-primary`          | `primary`               |
| Paused           | `bg-warning/20 text-warning`          | `warning`               |
| In validation    | `border-border text-muted-foreground` | `foreground` at 50–70%  |
| Completed        | `bg-success/20 text-success`          | `success`               |
| Workflow success | success badge                         | `text-success`          |
| Workflow failure | destructive badge                     | `text-destructive`      |
| Workflow running | warning badge + spinning icon         | `text-warning`          |
| Workflow none    | muted badge                           | `text-muted-foreground` |

Negative currency uses `text-destructive`. Stat tones are `foreground`, `success`, `warning`, or `destructive` — never primary.

---

## Typography

| Role                              | Family           | Weight     | Size              | Notes                                                                                                 |
| --------------------------------- | ---------------- | ---------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| Page title                        | Instrument Serif | 400        | 36px (`text-4xl`) | `tracking-normal`, one line with the description under it                                             |
| Hero figure                       | Instrument Serif | 400        | 36px              | `tabular-nums`, right-aligned from `sm`                                                               |
| Dialog title                      | Instrument Serif | 400        | 26px              | `tracking-wide`                                                                                       |
| Drawer title                      | Instrument Serif | 500        | 22px              |                                                                                                       |
| Card / kanban title               | Instrument Serif | 400–500    | 16–18px           | Kanban names are `text-lg font-normal` and truncate                                                   |
| Section / KPI value               | Instrument Sans  | 600        | 18–30px           | `tracking-tight tabular-nums`                                                                         |
| Chart / panel title               | Instrument Sans  | 600        | 14px              |                                                                                                       |
| Body, buttons, inputs, table      | Instrument Sans  | 500        | 14px (`text-sm`)  |                                                                                                       |
| Meta, errors, hints, table header | Instrument Sans  | 500        | 12px (`text-xs`)  | Errors are `text-destructive`; hints are `text-muted-foreground`                                      |
| Eyebrow                           | Instrument Sans  | 500        | 12px              | `uppercase tracking-wide text-muted-foreground`                                                       |
| Status label over a title         | Instrument Serif | 400 italic | inherit           | `tracking-wider` plus the status text color                                                           |
| Inline emphasis (a name)          | Instrument Serif | 700 italic | 1.15em            | `tracking-wider`. If italics must be off, switch to Instrument Sans bold — do not leave a roman serif |

Load Instrument Sans 400/500/600/700 and italic, plus Instrument Serif 400 and 400 italic. `font-synthesis: none`. Antialiased. `text-rendering: optimizeLegibility`.

```css
--font-sans: "Instrument Sans", sans-serif;
--font-heading: "Instrument Serif", serif;
--font-subtitle: "Instrument Sans", sans-serif;
```

---

## Radius, space, elevation

Base radius `--radius: 0.625rem` (10px).

| Token        | Value | Typical use                                       |
| ------------ | ----- | ------------------------------------------------- |
| `radius-sm`  | 6px   | Focusable text links, tiny chips                  |
| `radius-md`  | 8px   | —                                                 |
| `radius-lg`  | 10px  | Nav items, icon wells, select items               |
| `radius-xl`  | 14px  | Inputs, selects, tables, content cards, auth card |
| `radius-2xl` | 18px  | Textareas, dialogs, toasts, kanban columns        |
| `radius-4xl` | 26px  | Buttons and badges (pill on a 36px control)       |

Page inset is `px-4 sm:px-6 lg:px-8`. Header is `py-6` with a bottom border. Content blocks start at `pt-6` and use `pb-24` on small screens when a floating dock is present, `md:pb-6` otherwise. Gaps inside a form field are `gap-1.5`. Stacked sections use `gap-3` or `gap-4`.

Content cards (KPI tiles, chart panels, settings sections, project detail) are `rounded-xl border p-4` with no fill and no shadow. The primitive `Card` is the exception: `rounded-4xl bg-card shadow-md ring-1 ring-foreground/10`, padding `--spacing(6)` (or 4 when `size="sm"`).

Glass (dialogs, auth card, mobile tab dock): `bg-card/40` or `bg-background/40`, `ring-1 ring-white/10`, `shadow-lg`, `backdrop-blur-xl`. Dialog overlay is `bg-black/40` plus `backdrop-blur-lg`.

---

## Layout

- App frame: column on small screens, row from `md`. Sidebar is sticky, full viewport height, `border-r bg-sidebar`. Expanded `w-60`, collapsed `w-16`. Width animates 400ms with `cubic-bezier(0.34, 1.65, 0.64, 1)`.
- Logo: 28px rounded-lg square, `bg-primary`, bold “P”, then a 14px semibold wordmark with `tracking-tight`. On signed-out screens the mark is `bg-muted text-muted-foreground` at 40px.
- Nav item: height 36px, `rounded-lg px-3`, icon 16px, label 14px medium. Idle text is `sidebar-foreground` at 65%. Hover and active: `bg-sidebar-accent text-sidebar-foreground`. Active also shows a 2px × 16px bordô tick on the left (`-left-2`, `rounded-r-full`). Collapsed nav is icon-only with a tooltip.
- Mobile: 56px top bar, `bg-background/80 backdrop-blur-sm`, ghost icon button opens a left drawer `w-60`.
- Page header: title left, optional description under it (`text-sm text-muted-foreground`), actions on the right from `sm`. Header enters with `fade-in slide-in-from-bottom-1 duration-500`.

---

## Components

### Button

Pill, 14px medium, `rounded-4xl`. Press shifts down 1px. Disabled is 50% opacity and `cursor-not-allowed`. Focus: `border-ring ring-3 ring-ring/30`. Invalid: destructive border and `ring-destructive/40`. Icon-only sizes are square; default icons are 16px, `xs` icons are 12px.

| Variant     | Classes                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| default     | `bg-primary text-primary-foreground hover:bg-primary/80`                 |
| outline     | transparent, `border-border`, hover `bg-input/30`                        |
| secondary   | `bg-secondary`, hover mixes 5% foreground into secondary                 |
| ghost       | hover `bg-muted/50`                                                      |
| destructive | `bg-destructive/20 text-destructive`, hover `/30` — not a solid red fill |
| link        | `text-primary underline-offset-4 hover:underline`                        |

| Size                               | Height            | Padding          |
| ---------------------------------- | ----------------- | ---------------- |
| xs                                 | 24px              | `px-2.5 text-xs` |
| sm                                 | 32px              | `px-3`           |
| default                            | 36px              | `px-3`           |
| lg                                 | 40px              | `px-4`           |
| icon / icon-sm / icon-xs / icon-lg | 36 / 32 / 24 / 40 | square           |

Primary on the signed-out screen may add a bordô glow: `shadow-[0_0_16px_rgba(192,58,74,0.45)]`, hover `0 0 28px rgba(192,58,74,0.7)`. Do not use that glow inside the app shell.

### Badge

`rounded-4xl px-2 py-0.5 text-xs font-medium`. Variants: default `bg-primary/20 text-primary`, muted, outline (`border-border text-muted-foreground`), success, warning, destructive — each tint is the tone at 20% background and full tone as text. Icon-only workflow badges use `p-1`.

### Input, select, textarea

- Input and select trigger: `h-9 rounded-xl border border-border bg-background px-3 text-sm`. Placeholder `text-muted-foreground`. Focus `border-ring ring-3 ring-ring/30`. Invalid input: `border-destructive ring-destructive/40`. Disabled 50%.
- Select popup: `rounded-xl border bg-popover p-1 shadow-lg`, items `rounded-lg px-2 py-1.5`, highlight `bg-accent`. Group labels are eyebrows.
- Textarea: `min-h-16 rounded-2xl border-transparent bg-input/50 px-3 py-3`, no resize.
- Field: label (`text-sm font-medium`) then control then message, `gap-1.5`. Error `text-xs text-destructive`. Hint `text-xs text-muted-foreground`. Wire `aria-invalid` and `aria-describedby`.

### Surface recipes

- KPI / chart / detail card: `rounded-xl border p-4`. Chart header is title `text-sm font-semibold` plus optional hint `text-xs text-muted-foreground`, `mb-4`.
- Icon well: `grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground`, icon 20px.
- Inset note: `rounded-lg bg-muted/40 p-3` (tighter `p-2` inside a list).
- Empty dashed: `rounded-xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground`.
- Kanban column: `w-72 rounded-2xl bg-muted/40`. Drop target: `bg-muted ring-ring`. Header has a status dot, 14px medium title, count in `text-xs tabular-nums`.
- Kanban card: primitive card, `shadow-none ring-border`. While dragging: `rotate-1 shadow-lg ring-foreground/10`.

### Table

`rounded-xl border`, `text-sm`, collapse borders. Header row `border-b bg-muted/40`, cells `px-4 py-2.5 font-medium text-muted-foreground`. Body cells `px-4 py-3`. Row hover `bg-muted/50`. Clickable rows use `cursor-pointer`. Empty state is centered muted text, `py-8`. Sortable headers are buttons with a 14px arrow; inactive arrows are `text-muted-foreground/50`. First 10 rows stagger in at 40ms steps.

### Dialog and drawer

Dialog panel: centered, `w-[calc(100vw-2rem)] max-w-md rounded-2xl`, glass surface, scale from 95% and fade, 200ms. Header `border-b px-5 py-4`, title serif 26px, footer actions aligned end with `gap-2`. Drawer titles are serif 22px medium.

### Toast

Top of the viewport, `max-w-sm`, `rounded-2xl border bg-popover shadow-lg`. Stacked toasts scale down and peek 12px. Motion 500ms, `cubic-bezier(0.22, 1, 0.36, 1)`. Content is a row, `gap-3 p-4`, with a status icon (success, info, warning, error, loading).

### Tabs

Desktop: text tabs, `gap-6`, 14px medium, muted until hover. Active: `border-b-2 border-primary text-primary`.

Mobile dock: fixed bottom center, pill, `border-border/50 bg-background/40 p-1.5 shadow-lg backdrop-blur-xl`. Each tab is a 44px circle. Active circle is `bg-primary text-primary-foreground` with `shadow-[0_0_18px_6px]` at 50% primary. Labels are visually hidden on small screens; the icon is 20px.

### Loading

- First load of a filtered region: skeleton blocks `animate-pulse rounded-md bg-muted` (rows `h-12 bg-muted/70`). Do not replace the page with a “loading” sentence. Filters stay interactive above the region.
- Refetch: keep the previous results at `opacity-50` and draw a 1px track `bg-primary/20` with a bordô segment (`w-1/3 bg-primary`) scanning left to right, 1.4s, ease-in-out, infinite. Skip the scan when reduced motion is on.
- Dashboard blocks enter `fade-in slide-in-from-bottom-2 duration-500` with a stagger delay. KPI numbers count up over 700ms, ease-out cubic, unless reduced motion is on — then show the final value immediately.

---

## Focus, scroll, icons

- Global outline: `outline-ring/50` on `*`. Interactive controls use a 2px or 3px ring in `ring` (bordô) at 30–50% and never remove the focus style.
- Scrollbars are 8px, transparent track, thumb `border` with a fully round cap. Hover thumb uses `muted-foreground`. Firefox: `scrollbar-width: thin`.
- Icons are Lucide, `currentColor`, `shrink-0`, `pointer-events-none` inside buttons. Default 16px. Do not introduce a second icon set.
- Links inside body copy: `rounded-sm font-medium hover:underline` or `hover:text-primary`, plus the focus ring.

---

## CSS to paste

```css
:root {
  color-scheme: dark;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  --background: oklch(0.1 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.14 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.14 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.55 0.17 18);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --success: oklch(0.696 0.17 162.48);
  --warning: oklch(0.769 0.188 70.08);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.55 0.17 18);
  --chart-1: oklch(0.58 0.18 18);
  --chart-2: oklch(0.63 0.12 195);
  --chart-3: oklch(0.66 0.14 70);
  --chart-4: oklch(0.55 0.17 265);
  --chart-5: oklch(0.65 0.16 145);
  --chart-6: oklch(0.58 0.19 320);
  --radius: 0.625rem;
  --sidebar: oklch(0.16 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.55 0.17 18);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.55 0.17 18);
  --font-sans: "Instrument Sans", sans-serif;
  --font-heading: "Instrument Serif", serif;
  --font-subtitle: "Instrument Sans", sans-serif;
}
```

Map each `--color-*` (and the radius scale) through Tailwind `@theme inline` the same way `apps/web/src/index.css` does, so utilities like `bg-primary`, `text-muted-foreground`, `rounded-xl`, and `font-heading` resolve to these tokens.

---

## Do and don't

- Do keep the app dark. Do leave most surfaces unfilled, separated by a 10% white border.
- Do use serif for the page title, dialog title, kanban name, hero number, and italic status or emphasis. Do use sans for every control.
- Do limit bordô to one primary action per view, plus active navigation, active tabs, and in-progress status.
- Don't fill destructive actions solid red. Use `destructive/20` background and `destructive` text.
- Don't restyle a content tile with the primitive card (large radius, shadow, card fill). Tiles are `rounded-xl border p-4`.
- Don't reorder `--chart-1` … `--chart-6` or add `--chart-7`.
- Don't blank a filtered view while refetching. Skeleton on first paint, muted results plus the bordô scan after that.
