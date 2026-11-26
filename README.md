# Jilebi Premier League

Your friends. Your franchise. Your cricket chaos.

JPL is a browser based 3D cricket game starter built around React, TypeScript, Three.js, and Supabase. The project is structured for the first playable phase: franchise selection, private invite rooms, a live lobby, a 3D ground, and interactive batting/bowling calls.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Add your Supabase project URL and publishable key.
4. Run `npm install` and `npm run dev`.

The publishable key is safe for browser use when database access is protected with RLS. Never put a service role key in the client.

## Supabase setup

Apply `supabase/migrations/202611260001_jpl_schema.sql` to your project. Realtime private room presence and broadcasts use `jpl-room-<ROOMCODE>` channels. Keep channel access limited to invited room members before launch; add short-lived room membership tokens for production matches.

The current playable room flow uses Supabase Realtime and needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The schema is ready for authenticated player profiles and completed match cards. Authentication, authoritative match simulation, persistence of match cards, and production room access control are follow-on work and are not claimed as complete here.

## Controls

- Create a room or join with its four character code.
- Mark ready in the lobby; the captain starts the match.
- Switch between batting and bowling, then choose a delivery or shot.
- The scene is mouse/touch orbitable. A dedicated virtual joystick and individual fielder control are planned next.

Franchise names and colors are configurable in `src/data.ts`. The simple procedural players and stadium are replaceable assets, not official team logos or licensed player likenesses.

