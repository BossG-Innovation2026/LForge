---
title: LForge
type: project-context
status: active
owner: BossG
created: 2026-09-05
updated: 2026-09-05
ai_access: internal
review_status: draft
---

# LForge Project Context

## Overview

LForge is a Next.js application deployed on Cloudflare Workers using OpenNext.

## Tech Stack

- Framework: Next.js (App Router)
- Deployment: Cloudflare Workers via OpenNext
- Language: TypeScript
- Styling: Tailwind CSS (PostCSS)
- Linting: ESLint

## Key Files

- `wrangler.jsonc` — Cloudflare Worker configuration
- `open-next.config.ts` — OpenNext build configuration
- `src/` — Application source code
- `scripts/` — Build and deployment scripts

## Decisions

- Using Cloudflare Workers for edge deployment
- OpenNext for Next.js compatibility on Cloudflare
