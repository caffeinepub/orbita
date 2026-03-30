# Orbita

## Current State
Dashboard fetches 4 separate backend calls in parallel (listDeals, listTasks, listActivities, listContacts) and aggregates stats on the frontend.

## Requested Changes (Diff)

### Add
- `DashboardSummary` return type in `main.mo`
- `getDashboardSummary(todayStart, todayEnd)` query in `main.mo` that returns pre-aggregated stats in one call
- Corresponding type + method in `backend.d.ts`

### Modify
- `Dashboard.tsx`: replace 4-call `Promise.all` with single `getDashboardSummary` call

### Remove
- Nothing

## Implementation Plan
1. Add `StageBreakdownEntry` and `DashboardSummary` types to `main.mo`
2. Implement `getDashboardSummary(todayStart: Int, todayEnd: Int)` query
3. Update `backend.d.ts` with new interface types
4. Update `Dashboard.tsx` loadData to use the single call
