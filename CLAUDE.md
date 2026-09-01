# projects-manager

## What it is

SaaS project-management platform for freelance developers. Each user
(freelancer) manages their own clients, projects, and finances in isolation.

## Problem it solves

A freelancer juggling several projects and clients at once loses track of:

- How much each client has already paid and how much they still owe.
- Which paid tools (AWS, Railway, Resend, Sentry, Datadog, etc.) were used on
  which project, and who is paying for them.
- Which account/login was used to access each tool.
- What is in development and what is queued, across several simultaneous
  projects.

## Main modules

### Finance

- Per-client billing and pending-payment tracking.
- Recorded agreed amount per project (free, installments, upfront).
- Paid-tool costs per project (who pays, how much, which account).
- Dashboard with figures, goals, and financial indicators.

### Projects

- Full record: primary contact, agreed amount, tools in use (paid and free)
  and the account/login used for each.
- Link to the project's GitHub repository and GitHub Actions tracking.

### Kanban

- View of what is in development and what is in the queue, across all
  projects.

## Audience

Multi-user / SaaS — each freelancer has their own clients, projects, and
financial data isolated from everyone else.
