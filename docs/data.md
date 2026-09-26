# The data

_Written 2026-09-25 for milestone B (plan B10). Milestone C0 revisits this
once the original pipeline is recovered or rebuilt._

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
repository; plan task C0 tries to recover them. From the notes that survive:

- **Squads** are each club's top-flight squad for the season, trimmed to
  about 22 players, with names, positions, preferred side, age and
  nationality from public squad records.
- **Overall rating (`ov`)** is engineered from each player's market value in
  that season, compared with the distribution of values across the whole
  league that season rather than a fixed multiplier, so inflation across
  three decades does not favour the recent seasons, blended with the
  player's age in that season.
- **The six stats** are derived from `ov` and a position-archetype profile
  (a striker's shooting sits above his defending, and so on), with small
  per-player variation. They are estimates, not observed attributes.
- **Opponent strength** (`ov`, `histMean`, `histStd`, `weight`, `vol`) for
  the nineteen rivals and the promotion pool comes from the same squad data:
  `ov` is the club's most recent squad strength, `histMean` and `histStd`
  the mean and spread of its squad strength across every top-flight season on
  file, `weight` a pedigree factor from that mean, and `vol` a volatility
  factor from that spread. Clubs in the promotion pool with no top-flight
  season on file have a fixed, deliberately weaker generated profile.

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
