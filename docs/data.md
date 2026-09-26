# The data

_Written 2026-09-25 for milestone B (plan B10); the derivation and rebuild
sections were added by milestone C0 after the original pipeline turned out
to be unrecoverable._

## What is in the repository

| File | Contents | Size |
|---|---|---|
| `src/data/players.json` | `clubs` (slug → name), `squads` (`year_slug` → player rows), `index` (one entry per club-season with its label) and `opponents` (the nineteen rivals for season 1) | 0.93 MB |
| `src/data/championship.json` | The 24-club promotion pool with the same strength fields as `opponents` | 3 KB |
| `src/data/legacyClubIds.json` | The map from the numeric club ids used until 1.1.0 to today's slugs; only the save migration reads it | 1 KB |

There are 666 club-seasons from 1992-93 to 2024-25 and 14,493 player rows,
roughly 22 per club-season.

## Player rows

Each row is `[name, slot, side, age, nat, ov, pace, shooting, passing,
dribbling, defending, physical]`. `slot` is one of `GK CB FB DM CM AM WIDE
ST`; `side` is `L`, `R` or empty; `age` is the player's age in that season;
`ov` and the six stats are 0–99 integers. `engine/players.js` `rowToPlayer`
turns a row into the player object the game uses, with the id
`${seasonKey}__${name}__${ov}__${slot}` (the season key is `year_slug`).

## Where the numbers come from

The original build script (`build_final.py`) and its inputs are not in this
repository, and milestone C0 confirmed they are not in any branch, tag or
deleted path of its history either: no Python file was ever committed. What
follows is reconstructed from the surviving notes and from the data itself,
and `scripts/derive-ratings.mjs` implements it. The club-strength part is
exact: `npm run data:check` rebuilds every `ov`, `histMean`, `histStd`,
`weight` and `vol` of the nineteen rivals and the promotion pool from the
shipped squads and matches all 43 clubs. The player part reproduces the
shape of the data (its ranges, the position profiles, the noise), not the
individual numbers, because the market values it started from are gone.

### Squads

Each club's top-flight squad for the season, trimmed to about 22 players,
with names, positions, preferred side, age and nationality from public
squad records.

### Overall rating (`ov`)

Engineered from the player's market value in that season, ranked against
every other player in the league that season rather than converted with a
fixed multiplier, so three decades of inflation cancel out. The rebuild:

1. `score = ln(value) − ageValuePremium(age)`, where the premium is
   `clamp((27 − age) × 0.06, −0.3, 0.6)`: a young player's value prices in
   what he might become, and the overall is meant to rate the season he had.
2. Rank the scores within the season; `pct` runs from 0 (lowest) to 1.
3. `ov = round(38 + 58 × pct^0.45)`. The curve puts the season mean in the
   high 70s and the top at 96, which is what the shipped seasons show
   (1992-93: 55–93, mean 80; 2024-25: 38–96, mean 76).

### The six stats

`stat = clamp(round(ov + offset[position] + uniform(−5, 5)), 1, 99)`. The
offsets are the position archetypes, fitted to the shipped data
(`engine/players.js` `ARCHETYPES`, in the order pace, shooting, passing,
dribbling, defending, physical):

| Position | Pace | Shooting | Passing | Dribbling | Defending | Physical |
|---|---|---|---|---|---|---|
| GK | −14 | −24 | −10 | −17 | +5 | −2 |
| CB | −8 | −19 | −10 | −14 | +6 | +2 |
| FB | +1 | −16 | −5 | −3 | −2 | −5 |
| DM | −8 | −14 | −2 | −8 | +3 | 0 |
| CM | −5 | −10 | +3 | −3 | −8 | −5 |
| AM | −3 | −2 | +3 | +4 | −18 | −11 |
| WIDE | +6 | −5 | −5 | +5 | −19 | −11 |
| ST | 0 | +8 | −13 | −1 | −22 | −1 |

The stats are estimates, not observed attributes. `ovFromStats` inverts the
table (the mean of `stat − offset` over the six), which is how the engine
recomputes a player's overall after his stats drift with age (C2); on the
shipped data it recovers `ov` to within a point on average.

### Club strength

For the nineteen rivals (`players.json` `opponents`) and the promotion pool
(`championship.json`), all from the squads:

- A club's **season strength** is the mean `ov` of its squad that season.
- `histMean` and `histStd` are the mean and population standard deviation of
  its season strengths across every top-flight season on file, to one place.
- `ov` is its most recent season strength less a penalty for seasons away
  from the top flight. The two pools were built with different yardsticks
  and both are kept: rivals lose 2.5 per season since 2024-25, capped at 14
  (Sunderland, last on file in 2016-17); pool clubs lose 2.2 per season
  since 2025-26, capped at 16, so a club relegated in 2024-25 starts 2.2
  below its last squad.
- `weight` (pedigree) and `vol` (volatility) are `histMean` and `histStd`
  min-max scaled across the pool the club sits in: rivals to 0.8–1.22 and
  5–15, the promotion pool to 0.78–1.18 and 6–17. Since the league became
  real (C1) the engine reads `ov` and `histMean` for a rival's strength and
  `vol` for its match-to-match swing; `weight` and `histStd` are kept in the
  data but nothing reads them.
- Pool clubs with no top-flight season on file (Millwall, Bristol City,
  Lincoln City, Preston North End, Wrexham) carry a fixed, deliberately
  weaker profile: `ov` doubles as `histMean`, and `histStd` is given.

Rounding is half-to-even, as Python's `round` does.

## Rebuilding the data

`node scripts/derive-ratings.mjs raw.json [--out src/data]` writes
`players.json` and `championship.json` from a JSON file of this shape:

```json
{
  "clubs": { "arsenal": "Arsenal FC" },
  "rows": [
    { "year": 2024, "club": "arsenal", "name": "Kai Havertz", "slot": "ST", "side": "", "age": 25, "nat": "Germany", "value": 75000000 }
  ],
  "rivals": ["arsenal", "..."],
  "pool": ["burnley", "...", { "name": "Wrexham", "ov": 46.5, "histStd": 8.3 }]
}
```

`rows` holds one entry per player per season; `value` is the market value
in any one currency (only its rank within the season matters). `rivals`
lists the nineteen slugs for season 1 and `pool` the 24 promotion-pool
entries, either a slug with history on file or a fixed profile. The output
is deterministic: the stat noise is seeded from the season key, name and
position. `npm run data:check` runs the club-strength reconstruction against
the shipped files and fails on any field that differs.

## Club identifiers

Until 1.1.0 club-seasons were keyed by the club ids of the site the squad
records were collected from. Milestone B replaces them with slugs derived
from the club names (`scripts/rekey-clubs.mjs`; `arsenal`, `leeds-united`,
`wimbledon`), and `state/save.js` `migrations[1]` rewrites the keys in 1.1.0
saves. The rekey is one-way and idempotent.

## Club names

The dataset carries each club's real name. The **Club names** setting
switches every screen to the edited names in `src/content/clubs.json`,
which describe a club by place and colours without using its name or
badge. Whether the real names ship in the App Store build is the rights
review in spec 03 §5, which the owner completes before milestone E.

## Club colours

`src/content/clubColours.json` gives every club in the dataset, the
opposition and the promotion pool a primary and secondary hex colour, keyed
by slug, from its well-known kit and badge identity. The **Colours**
setting (and the third New career step) picks a favourite club and
`content/clubTheme.js` derives the whole token set from those two colours
(see the comment there). Like the names, the colours describe real clubs;
the rights review in spec 03 §5 should cover them too.

## What the game never does with the data

Ratings are never shown as numbers before kick-off: stats appear as five
bands (`screens/Squad/StatPip.jsx`), the overall only stamps in at the
season's reveal. No data leaves the device; there is no backend.
