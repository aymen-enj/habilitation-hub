
# CNSS Habilitation Management Platform — Prototype Plan

A frontend-only React + Vite + Tailwind prototype for managing employee access rights, styled with CNSS institutional identity (deep blue + turquoise) and built for a stakeholder validation demo.

## 1. Information architecture & route map

- `/login` — Demo entry (email + password + role select, mocked)
- `/` — Dashboard (KPIs + quick actions)
- `/agents` — Agents Management (table + detail panel)
- `/access-requests` — Access Requests (creation form + list)
- `/validation` — Validation Queue (pending requests + decision panel)
- `/audit` — Audit Trail (filterable timeline/table)
- `*` — 404

Auth gate: if no role selected in session → redirect to `/login`. Logout returns to `/login`. **Role switching = login only** (no header switcher).

## 2. Design system summary

**Color tokens** (added as HSL CSS variables in `index.css`, mapped in `tailwind.config.ts`):
- `--cnss-primary` #0B3D91, `--cnss-primary-dark` #072C6A
- `--cnss-accent` #19BFD3, `--cnss-accent-soft` #E6F8FB
- `--success` #12805C, `--warning` #C97A00, `--danger` #B42318
- `--text` #0F172A, `--text-muted` #475467
- `--border` #D0D5DD, `--surface` #FFFFFF, `--app-bg` #F5F7FB

Shadcn primary / accent / muted / destructive remapped to CNSS tokens — no hardcoded colors in components.

**Typography:** Inter + Tajawal loaded via Google Fonts; weights 400/500/600/700. Headings 600–700, body 400–500.

**Spacing:** 4px scale, content max-width 1440px, page padding 24/32px.

**Radii & elevation:** 12px (inputs/badges), 16–20px (cards/panels), soft shadow `0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10)`.

**Status badges (pill):**
- PENDING — turquoise soft bg + primary text
- APPROVED — green soft bg + success text
- REJECTED — red soft bg + danger text
- EXPIRED — neutral soft bg + muted text

**Required UI states everywhere:** loading (skeletons), empty (illustration + message + CTA), error (alert banner), success (sonner toast), disabled (reduced opacity + cursor-not-allowed + tooltip reason).

**Motion:** 200–300ms ease-out; focus ring 2px `--cnss-accent` at 60% opacity.

## 3. Page-by-page UX

**Login** — Centered card on light gradient, CNSS wordmark left side, form right side: email, password, role select (Admin / Manager / Validator / Audit Viewer), "Se connecter" primary button. Mocked: any non-empty email/password works; selected role drives the rest of the session.

**Dashboard** — Welcome line ("Bonjour, {nom} — rôle : {role}"). 4 KPI cards (Agents totaux, Agents actifs, Demandes en attente, Demandes approuvées). 3 quick-action cards filtered by role. Chips row: "Applications couvertes — RH, Finance, IT". Audit viewers see read-only KPIs + audit shortcut.

**Agents** — Two-pane: left = filter bar (search matricule/nom, délégation select, statut select) + table (Nom, Matricule, Délégation, Domaine, Statut). Right = sticky detail panel with identity, manager, and active habilitations list. Click row → updates panel. Empty state when filters return nothing. Audit Viewer = read-only (no edit affordances rendered).

**Access Requests** — Two-column layout: left = form card (Bénéficiaire, Application → Profil → Module cascading, Date début, Date fin, Justification textarea, Soumettre). Right = "Mes demandes visibles" list with status badges, sortable by date. Submit → push to mock store with status PENDING + emit audit event + sonner toast "Demande créée avec succès (mode démo)." Validator/Audit Viewer roles see banner: "Ce rôle est en consultation uniquement." and form is disabled.

**Validation Queue** — Master/detail. Left = list of PENDING requests (requester, beneficiary, app, age). Right = full request detail + decision comment textarea + two action buttons "Approuver" (success) / "Rejeter" (destructive). Confirmation dialog before commit. Decision updates status, prepends audit event, toast feedback, auto-selects next pending. Empty state: "Aucune demande en attente — tout est à jour."

**Audit Trail** — Filter bar (event type select + free-text search across actor/target/details). Read-only table: Horodatage, Type, Acteur, Cible, Détails. Newest first. Subtle row hover, no actions.

## 4. Component inventory

- `AppShell` — sidebar + header + outlet, handles role gate
- `SidebarNav` — role-aware nav items, collapsible to icon-rail on tablet, shadcn Sidebar based
- `TopHeader` — page breadcrumb, user identity pill, logout button
- `PageHeader` — title, subtitle, contextual action slot
- `StatCard` — label, value, icon, trend slot
- `DataTable` — generic columns/rows with sort + empty state
- `StatusBadge` — status enum → pill
- `FilterBar` — composable search + select filters
- `FormField` — label + control + helper/error text wrapper
- `EmptyState` — icon, title, description, optional CTA
- `AlertBanner` — info/warning/danger inline alerts (used for read-only role notices)
- `ActionButtons` — primary/secondary/destructive trio with consistent spacing
- `ConfirmDialog` — wraps shadcn AlertDialog for approve/reject
- `RoleGuard` — hides/disables children based on current role

**Mock data layer:** single `src/mocks/` folder exporting typed arrays (roles, users, delegations, applications, profiles, modules, agents, accessRequests, auditEvents) + a lightweight in-memory store via React Context (`DemoStateProvider`) exposing `createRequest`, `decideRequest`, `logAudit`. **In-memory only** — resets on refresh, by design.

**Volume:** ~15 agents, ~10 requests (mix of PENDING/APPROVED/REJECTED/EXPIRED), ~25 audit events seeded.

## 5. Accessibility & responsive

- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<aside>`)
- All interactive elements keyboard-reachable, visible 2px focus ring
- Labels tied to inputs via `htmlFor`, errors announced via `aria-describedby`
- Color contrast ≥ 4.5:1 for text, ≥ 3:1 for UI; status never conveyed by color alone (icon + text)
- Buttons use explicit verbs ("Approuver la demande", not "OK")
- Desktop ≥1024px: sidebar + multi-column. Tablet 768–1023px: icon-rail sidebar, tables horizontal scroll. Mobile <768px: top segmented nav chips, single-column forms, master/detail collapses to stacked views with back link.

## 6. QA checklist for the validation meeting

- [ ] Login accepts any credentials; role choice drives nav visibility
- [ ] Each role sees exactly the pages defined in the access matrix
- [ ] All 4 statuses render with correct color + icon
- [ ] Creating a request adds it to list + audit
- [ ] Approve/Reject updates status + adds audit + shows toast
- [ ] Cascading selects (App → Profile → Module) work
- [ ] Empty, loading, disabled, success states visible on every page
- [ ] Read-only banner shown for non-authorized roles on Access Requests
- [ ] Keyboard-only navigation reaches every action
- [ ] Mobile (375px), tablet (768px), desktop (1440px) all usable
- [ ] French copy throughout, no English leakage, no "TODO"
