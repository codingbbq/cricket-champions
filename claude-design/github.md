repo: codingbbq/cricket-champions
branch: main
path: (whole repo — read for data model reference)

## Last sync
date: 2026-08-13T18:38:16Z
commit: cd6ef8f727e6

### Updated in this project
- Built the Home feed screen (mobile, Nocturne design system) grounded in the repo's `Player`/`Team`/`Match` types (src/types/index.ts)
- Match card model: venue, date, overs, teamA/teamB score+overs, result text, status (live/completed/upcoming) — mirrors `Match.status` and `TeamInMatch`
- YouTube video embed + thumbnail slot added per completed match card (repo has no video field yet — add `videoId`/`videoUrl` to `Match` when wiring real uploads)

### Updated in this project (round 2)
- Team Setup & Toss.dc.html: match creation form → team assignment → coin-flip toss → confirmation, mirrors admin/CreateMatchPage, admin/TeamSelectionPage, admin/TossPage
- Live Scoring.dc.html: functional ball-by-ball scorer (runs, extras, wickets, undo, live commentary) grounded in the `Ball`/`Innings` types
- Match Summary.dc.html: full scorecard (batting/bowling tables, fall of wickets) + video embed
- Player Profile.dc.html: career stats, form chart, recent match lines

## Screen map
| Project screen | Repo source |
| --- | --- |
| Home Feed.dc.html | src/pages/Home.tsx, src/types/index.ts (Match, TeamInMatch), public/manifest.json (PWA config reference) |
| Team Setup & Toss.dc.html | src/pages/admin/CreateMatchPage.tsx, TeamSelectionPage.tsx, TossPage.tsx, src/types/index.ts (Team, Match.toss) |
| Live Scoring.dc.html | src/pages/ScoringPage.tsx, src/components/scoring/*, src/types/index.ts (Ball, Innings) |
| Match Summary.dc.html | src/pages/ScoringPage.tsx (scorecard shape), src/types/index.ts (Innings) |
| Player Profile.dc.html | src/pages/admin/StatisticsPage.tsx, src/types/index.ts (Player) |
