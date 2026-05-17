Here's the full comparison:

---

## ngStravatron vs. Stravatronics

### Tech Stack

| | ngStravatron + ts-strava-server | Stravatronics |
|---|---|---|
| Frontend | React 16, Redux, MUI 4, Webpack 4 | React 19, Redux Toolkit, MUI 7, Webpack 5 |
| Backend | Express 4, TypeScript 4 | Express 5, TypeScript 5 strict |
| Database | MongoDB (Mongoose 5) | MongoDB (Mongoose 8) |
| Auth | Manual token mgmt (no OAuth UI) | Full OAuth flow with auto-refresh |
| Module system | CommonJS | ESM (NodeNext) |

---

### Features: Old vs. New

#### OAuth & Auth
| | Old | Stravatronics |
|---|---|---|
| OAuth flow | None — tokens hardcoded/manual | Full: authorize redirect, callback, auto-refresh |
| Auth status UI | None | "Connect with Strava" button, status check |

#### Athlete
| | Old | Stravatronics |
|---|---|---|
| Profile display | Not in UI | Avatar, name, location card |
| Measurement prefs | Hardcoded imperial | Reads `measurementPreference` from Strava |

#### Activities List
| | Old | Stravatronics |
|---|---|---|
| Columns | Date, Name, Moving Time, Distance, Elevation, kJ, NP, TSS, Avg/Max Watts, Avg/Max HR | Date, Name, Type chip, Distance, Moving Time, Elevation, Avg HR, NP |
| Sorting | Any column, click header | Fixed: most recent first |
| Pagination | 5/10/25 rows per page | None — all rows |
| Sync | Incremental (after last date) | Same |

#### Activity Detail
| | Old | Stravatronics |
|---|---|---|
| Stats | Name, date, NP, calories, TSS, elevation, avg/max power, avg/max HR | Full grid: speed, elevation hi/lo, HR, power (avg/NP/max/kJ), cadence, temp |
| Map | None | Leaflet map with decoded polyline, auto-fit bounds |
| Segment efforts table | Yes — name, time, distance, speed, grade, elevation, NP, watts, HR | None yet |
| Link to segment leaderboard | Yes | None yet |

#### Segments & Efforts
| | Old | Stravatronics |
|---|---|---|
| Segment effort list per activity | Yes | Not implemented |
| All efforts for a segment (leaderboard) | Yes | Not implemented |
| Segment metadata (grades, geometry) | Stored in MongoDB | Not implemented |

#### Power Analysis
| | Old | Stravatronics |
|---|---|---|
| Normalized Power display | Yes | Yes (from stored summary data) |
| NP computed from streams | Yes (server-side) | No |
| Intensity Factor (NP/FTP) | Yes | No |
| Training Stress Score | Yes | No |
| Mean Maximal Power (MMP) | Yes — per activity + aggregate CSV export | No |

#### Activity Streams
| | Old | Stravatronics |
|---|---|---|
| Fetch & store streams | Yes (time, latlng, elevation, grade, cadence, HR, watts) | No |
| Display streams | No UI built | No |
| Use streams for power calc | Yes | No |

#### Zwift
| | Old | Stravatronics |
|---|---|---|
| Virtual ride detection | Zwift segment ID filtering | No |

---

### Proposed Roadmap

These are ordered by impact relative to parity with the old app and natural UX flow:

1. **Segment efforts in activity detail** — the table of segment efforts per activity, mirroring the old detail view. Requires fetching `activities/:id?include_all_efforts=true` from Strava and caching.

2. **Sortable columns + pagination** — click any column header to sort; rows-per-page control. Low effort, high day-to-day usability.

3. **Activity streams** — fetch and store `time, latlng, altitude, distance, grade_smooth, heartrate, cadence, watts` from Strava. Unlocks accurate server-side NP and MMP.

4. **Power analysis** — compute NP from streams (rather than relying on Strava's summary value), IF, TSS. These were the most analytically distinctive features of the old app.

5. **Mean Maximal Power (MMP)** — power curve per activity and aggregate across all activities. The old app exported this to CSV; a chart would be a significant improvement.

6. **Statistics dashboard** — weekly/monthly totals, activity counts by sport type, trend charts (distance, TSS, elevation over time).

7. **All efforts for a segment** — leaderboard of every recorded effort on a given segment.

8. **Filtering** — filter activity list by sport type, date range, or name search.

9. **Gear tracking** — bikes and shoes from Strava, mileage per gear item.

10. **Zwift filtering** — option to separate virtual rides from outdoor activities.

---

The biggest gap versus the old app is **segment efforts** (contextually important during a ride review) and **stream-based power analysis** (the analytically interesting core). Those two would bring the new app to full parity and then the statistics dashboard and MMP chart would surpass it.
