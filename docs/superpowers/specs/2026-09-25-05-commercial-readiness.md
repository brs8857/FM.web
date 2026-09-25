# Spec 5: Commercial readiness — a one-time purchase on the App Store

| | |
|---|---|
| **Status** | Draft for owner review, 2026-09-25 |
| **Date** | 2026-09-25 |
| **Series** | 5 of 6 |
| **Baseline** | `main` @ `8b3fc57` (v1.1.0): static React/Vite app on GitHub Pages, saves in `localStorage`, no backend |
| **Inputs** | [03](2026-09-25-03-competitive-research.md) §5 rights review, [04](2026-09-25-04-ui-redesign.md) §8 native-feel |
| **Plan** | [2026-09-25-redesign-and-app-store.md](../plans/2026-09-25-redesign-and-app-store.md) milestones D–E |

Target: **ship on the Apple App Store as a one-time purchase, no
subscription, no recurring charge to the player.** This document
recommends an architecture and a business model, with the trade-offs,
and lists every place Apple's rules force a decision. Facts about Apple's
programme were checked against Apple's own pages on 2026-09-25 and are
linked; they change, so re-check before submission. Nothing here is legal
or tax advice.

Sections marked **⚠ Apple forces this** are decisions the owner has not
signed off on that Apple's rules make for us.

---

## 1. Recommendation in one paragraph

Wrap the existing web app with **Capacitor 8** (iOS first; Android is a
follow-on), keep the game 100% offline and account-free, sell it as a
**free download with a single non-consumable in-app purchase ("Full
career")** that unlocks everything beyond the first season, price it in
the **$4.99 / £3.99 tier** (owner decision), enrol in the **App Store
Small Business Program** (15% commission, automatic for a new developer
under $1M), store saves in native storage with **iCloud key-value sync**
(no accounts, no server, no personal data), ship **no analytics in v1**,
and keep the **web build as the free tier** with a link to the App Store.
Add accounts only if a later feature needs them.

---

## 2. Getting a React/Vite app onto the App Store

### 2.1 Options

| | Capacitor 8 | Tauri 2 (mobile) | Native rewrite (SwiftUI) |
|---|---|---|---|
| What it is | Ionic's WKWebView wrapper with a JS↔native bridge and plugin ecosystem; the web `dist/` is bundled into the app | Rust core + system WebView (WKWebView on iOS); mobile support arrived in Tauri 2.0 (Oct 2024) | Throw the React code away; keep only the engine's logic by porting it |
| Requirements (2026) | Node 22+, Xcode 26+, iOS 15+ deployment target; Swift Package Manager default ([Ionic: Capacitor 8](https://ionic.io/blog/announcing-capacitor-8), [Capawesome upgrade guide](https://capawesome.io/blog/how-to-upgrade-your-capacitor-app-to-capacitor-8/)) | Rust toolchain + Xcode; iOS 15+ for the StoreKit 2 plugins | Xcode, Swift |
| IAP | Several StoreKit 2 plugins that support non-consumables: Capawesome Purchases, Cap-go `capacitor-native-purchases`, RevenueCat `purchases-capacitor`, `spruikco/capacitor-iap` ([Capawesome](https://capawesome.io/plugins/purchases/), [Cap-go](https://github.com/Cap-go/capacitor-native-purchases), [RevenueCat](https://github.com/RevenueCat/purchases-capacitor)) | Community plugins only (`tauri-plugin-iap`, `tauri-plugin-purchases`), iOS StoreKit 2, Android "planned" in at least one ([spicavi](https://github.com/spicavi/tauri-plugin-purchases), [Choochmeque](https://github.com/Choochmeque/tauri-plugin-iap)) | StoreKit 2 directly |
| Storage, haptics, share, iCloud KVS | First-party Preferences/Filesystem/Haptics/Share; community CloudKit-KVS plugin ([capacitor-cloudkit-api](https://github.com/LukasAndreano/capacitor-cloudkit-api)) | Store/FS plugins first-party; haptics community; iCloud KVS would be custom Swift | Native APIs |
| Drag-and-drop tactics board | Pointer events in WKWebView; already `touch-action: none` on the board; no change | Same WKWebView, same behaviour | Rebuild with SwiftUI gestures |
| 0.93 MB dataset | Bundled in the app; loads from the app bundle, no network | Same | Bundled as JSON or converted |
| Reuse of tested code | All of it (engine, reducer, save format, Playwright suite) | All of it | Engine ported and re-tested; golden files reusable as fixtures |
| Effort to first TestFlight | Days | Days to a week (Rust setup, fewer examples) | Months |
| Risk | Guideline 4.2 "repackaged website" if the UI feels like a site — addressed by 04 §8 | Younger mobile tooling; smaller community for App Store specifics | Cost; two codebases (web + native) to keep in sync |
| Android later | Same project (`npx cap add android`) | Same project | Separate rewrite |

### 2.2 Recommendation: Capacitor 8 (⚠ owner decision A1, reversible until the Xcode project has custom native code)

Capacitor is the option with the fewest unknowns for exactly this app: a
tested web codebase, a need for StoreKit 2 non-consumables with a
maintained plugin, native storage that survives WebView eviction, and a
path to Android with no extra code. Tauri would give a smaller binary and
a Rust core we don't need. A native rewrite would discard the golden-master
tested engine and the whole React UI the redesign is about to build.

The one thing Capacitor does not solve is *feel*: WKWebView content that
behaves like a website gets rejected under 4.2 ("features, content, and
UI that elevate it beyond a repackaged website"). That is why 04 §8
specifies safe areas, a native tab bar pattern, sheets, haptics and no
hover affordances. ([Guideline 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality))

### 2.3 Build shape

```
vite build --mode native   →  dist-native/   (no PWA plugin, relative base, data bundled)
npx cap sync ios           →  ios/App/App/public/
Xcode                      →  archive → TestFlight → App Store Connect
```

One codebase, three targets: `web` (Pages, PWA), `standalone` (single
file), `native` (Capacitor). Platform differences go through one adapter
module, `src/platform/` (§5.3), never into screens.

---

## 3. Apple's rules for a one-time purchase

**⚠ Apple forces this.** Digital unlocks inside an App Store app must use
Apple's In-App Purchase. Guideline 3.1.1: "If you want to unlock features
or functionality within your app… you must use in-app purchase. Apps may
not use their own mechanisms to unlock content or functionality, such as
license keys…". A Stripe checkout on the website that unlocks the app is
exactly the prohibited "own mechanism". ([Guideline 3.1.1](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase))

Two ways to sell once:

| | Paid up front | Free + non-consumable IAP |
|---|---|---|
| How | Price on the listing; download is the purchase | Free listing; a **non-consumable** product ("Full career") bought once, restored on any device signed into the same Apple ID |
| Free trial | Not possible for paid apps (Apple has no trial for paid-upfront; the workaround is a separate "Lite" app, which 4.3 discourages) | Built in: the free part *is* the trial |
| Conversion | Every visitor must pay before playing; premium sports management on iOS is a niche | Visitors play a season first; the comparables that work this way: Retro Bowl ($0.99 "Unlimited"), New Star Soccer (career unlock) (03 §1.5) |
| Refund/restore | Apple ID | Apple ID, `Transaction.currentEntitlements` / restore button (Apple requires a visible Restore) |
| Family Sharing | Optional for paid apps | Optional for non-consumables |
| Piracy exposure | Same | Same |
| Web build relationship | Awkward: the web game would be a free version of a paid app | Natural: the web build *is* the free tier |

**Recommendation: free download + one non-consumable** (⚠ owner decision A2).

**Commission.** 30% standard; **15%** under the Small Business Program for
developers with under $1M in prior-year proceeds — new developers qualify
automatically once enrolled, and the reduced rate applies to paid apps and
IAP including non-consumables. Proceeds above $1M in a calendar year move
you to 30% for the rest of that year. ([Apple: Small Business Program](https://developer.apple.com/app-store/small-business-program/))

**External payment links (US only).** After the Epic v. Apple contempt
ruling, US-storefront apps may link to external purchase flows; in August
2026 Apple asked the court to approve a 15%/10%/5% fee schedule on those
transactions, which is pending. Two reasons not to build on this: it's
US-only and unsettled, and the *unlock* would still have to happen in the
app, which 3.1.1 forbids for a mechanism of our own. Use IAP. Revisit only
if the fee structure settles and volumes justify it. ([TechCrunch, Aug 2026](https://techcrunch.com/2026/08/14/apple-proposes-to-take-a-15-cut-of-purchases-made-outside-the-app-store/), [Guideline 3.1.3](https://developer.apple.com/app-store/review/guidelines/#other-purchase-methods))

**Recurring costs the owner must accept** (⚠ owner decision A3):

- Apple Developer Program: **US$99 per year** (individual or organisation; waiver possible for some non-profits/education, not applicable here).
- Nothing else in the recommended architecture recurs: no server, no analytics subscription, no auth provider.

**Pricing** (⚠ owner decision A4). Comparables: Retro Bowl Unlimited
$0.99; Motorsport Manager Mobile 3 around $3.99 premium; Slay the Spire
and Balatro $9.99. A draft-and-career game with a six-season arc and no
match engine sits between Retro Bowl and Balatro. Default: **Tier 5,
$4.99 / £3.99**, with a launch price of $2.99 for the first two weeks.
Apple sets the local-currency equivalents.

---

## 4. Free versus paid: the boundary

### 4.1 What is free (the web build and the App Store free tier are the same)

- Full draft (any era, any formation, redraws), the board, one complete season with the reveal, vidiprinter and back page, sharing.
- After the first season's back page: the window and every further season are locked. The player can start as many new careers as they like.

### 4.2 What the unlock adds

- Seasons 2 onwards (the career), the record book, career codes / start-from-code, challenge modifiers and the daily draw when they ship (06 §4), and any future content.

### 4.3 Why here

One season is the whole loop (01 §1), so the free tier is a real game,
not a crippled one; the *career* is what the redesign and the Phase 2
progression work make worth paying for (02 G6). The boundary is a single
check, `isUnlocked()` from `src/platform/entitlements.js`, applied in one
place (the back page's "Open the window" button) plus the Club tab's
locked rows. On the web, `isUnlocked()` is `false` and the button reads
"Continue on iPhone" with the App Store link (⚠ owner decision A5, §7 has
the alternatives).

### 4.4 App Store copy rules

The listing must say "Free. One-time purchase unlocks the full career."
Guideline 3.1.1 also requires that the IAP be usable and restorable; the
Club tab's **Restore purchases** does that. Nothing in the app may point
to buying it elsewhere (3.1.1 / 3.1.3, outside the US carve-out).

---

## 5. Accounts, saves and cloud sync

### 5.1 Are accounts needed?

No. The things an account would give and what covers them instead:

| Need | Without accounts |
|---|---|
| Restore the purchase on a new device | Apple ID: non-consumables restore via StoreKit (`Transaction.currentEntitlements`, Restore button) |
| Keep saves across devices | iCloud key-value store (§5.2), tied to the Apple ID, no server of ours |
| Recover a save after reinstalling | iCloud KVS, plus the existing export/import |
| Web ↔ iPhone continuity | Export/import (already shipped); the web build is the free tier, so there's no paid career to move *to* the web |
| Leaderboards / daily comparison | Not needed for the daily draw (06 §4): comparison is by screenshot and career code |

Apple's guideline 5.1.1(v) is explicit: "If your app doesn't include
significant account-based features, let people use it without a login."
An account for a single-player offline game is friction for the player,
a review risk, and a GDPR obligation for the owner (a controller with
personal data, deletion flows, a processor agreement). **Recommendation:
no accounts in v1** (⚠ owner decision A6). ([Guideline 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage))

If accounts are added later (for cross-platform sync to Android/web, or
for a server-side daily leaderboard), the constraints already known:
guideline 4.8 requires Sign in with Apple (or an equivalent private
login) whenever a third-party login such as Google is offered; 5.1.1(v)
requires in-app account deletion; the app must still work without
logging in. A sensible stack at that point would be Sign in with Apple +
a hosted Postgres/auth service; that is a separate spec.

### 5.2 Saves on iOS

`localStorage` inside WKWebView is not durable: Capacitor's own storage
guide says it "must be considered transient… the OS will reclaim local
storage from Web Views if a device is running low on space", and
IndexedDB is no better on iOS. The native build must therefore write the
autosave through a native store. ([Capacitor storage guide](https://capacitorjs.com/docs/guides/storage), [Apple forum thread](https://developer.apple.com/forums/thread/742037))

Measured save sizes (six-season career, real dataset): 10 KB at first
tactics, 16.5 KB after six seasons. That is small enough for:

- **`@capacitor/preferences`** (UserDefaults on iOS) for the autosave and prefs. Requires a privacy-manifest "required reason" entry for UserDefaults (reason `CA92.1`), which Capacitor's template includes. ([Privacy manifest for Capacitor](https://capgo.app/blog/privacy-manifest-for-capacitor-apps-guide/))
- **iCloud key-value store** (`NSUbiquitousKeyValueStore`, 1 MB total, 1024 keys) for cross-device sync of the same autosave, via a small community plugin or ~40 lines of Swift in the app project. No account, no server, no data leaves Apple's infrastructure under our control, so the Privacy Nutrition Label is unaffected. Conflict rule: last-write-wins by `savedAt`, with a "Newer save found on iCloud: use it / keep this device's" prompt when both changed. (⚠ owner decision A7: ship KVS sync in v1 or v1.1; default **v1.1**, so the first submission has one fewer moving part.)

`seasonHistory` (04 §9) keeps the save under 30 KB across a long career;
if Phase 2 later stores full match logs per season, the KVS budget needs
checking (100 seasons × ~5 KB is still fine).

### 5.3 The platform adapter

```
src/platform/
  index.js          detects web | native
  storage.js        get/set autosave + prefs: localStorage (web) | Preferences (native)
  cloud.js          no-op (web) | iCloud KVS (native)
  entitlements.js   isUnlocked(), purchase(), restore(): always false / no-op (web) | StoreKit 2 plugin (native)
  share.js          navigator.share | Share plugin
  haptics.js        no-op | Haptics plugin
```

The reducer and screens never import a Capacitor plugin directly.
Playwright runs against the web adapter; a small Vitest suite runs each
native adapter against a mocked plugin.

---

## 6. App Store review items specific to this game

| Topic | Position | Action |
|---|---|---|
| **Age rating** (new 4+/9+/13+/16+/18+ system, questionnaire required since 31 Jan 2026) | Sports game, no violence, no user content, no web access, no chat. Expected **4+** | Answer the questionnaire; "Gambling and Contests: none" — see next row ([Apple: updated age ratings](https://developer.apple.com/news/?id=ks775ehf)) |
| **"Simulated gambling" / contests** | The draft's random club-season draw has no wager, no prize, no purchasable chance. It is not gambling under Apple's definitions or 5.3. But the current UI *calls it a wheel and says "Spin"*, which is the vocabulary a reviewer scans for | 04 §5.2 renames it "Draw" and drops the wheel presentation. Never sell redraws or draws for money (that would be a paid random outcome, which is the loot-box question on the questionnaire) |
| **In-app purchase declaration** | Yes, non-consumable | Declare in the questionnaire; list the product on the listing |
| **Privacy Nutrition Label** | With no analytics, no accounts and no third-party SDKs that phone home: **"Data Not Collected"** | Verify no plugin collects data (RevenueCat's SDK does collect purchase data and would change the label to "Purchases · not linked to you"; prefer a plugin that talks only to StoreKit, e.g. Capawesome or Cap-go, or accept the label) |
| **Privacy policy** | Required regardless (5.1.1(i)): link in App Store Connect and in the app | Host at the Pages site; the Club → About screen links to it; 06 §6 has the outline |
| **Consent for usage data** (5.1.1(ii)) | "Apps that collect user or usage data must secure user consent… even if such data is considered to be anonymous" | This is why v1 ships **no analytics**. If added later (06 §2), it's opt-in from Settings, default off |
| **App Tracking Transparency** | Not applicable: nothing tracks across apps | Do not show the ATT prompt |
| **Sign-in** | None | 5.1.1(v) satisfied |
| **Minimum functionality 4.2** | Offline game with a native shell | 04 §8 |
| **Export compliance** | HTTPS only | `ITSAppUsesNonExemptEncryption = NO` in Info.plist |
| **Privacy manifest** | Required since May 2024 | `PrivacyInfo.xcprivacy` with the UserDefaults reason; Capacitor 8 template supplies it |
| **Restore purchases** | Required for non-consumables | Club → About |
| **Kids Category** | Not applying | Age rating 4+ is not the same as opting into Kids; don't opt in (it forbids links and third-party SDKs and adds review burden) |
| **Trademarks in metadata** | 03 §3.1 | No "Football Manager", "FM", "Premier League" in the name, subtitle, keywords or screenshots; keywords may not reference competitor names |

---

## 7. What happens to the web build

Options:

1. **Web is the free tier** (recommended, ⚠ A5): same code, same boundary; the season-one back page says "Continue this career on iPhone" with a store link. GitHub Pages stays, PWA stays, `standalone/` build stays as the offline single-file version of the free tier.
2. Web stays fully free forever: the web version would be a complete free copy of the paid app; kills conversion and creates a review risk (a reviewer who finds the free web full game may query 3.1.1).
3. Retire the web build: loses the marketing channel and the itch.io option (06 §5).

Option 1 does mean paying players cannot play their career in a browser.
06 §5 proposes a paid web/desktop channel through itch.io later if
demand appears; an itch purchase would unlock a *separate* web build, not
the App Store one (no cross-unlock; 3.1.1 forbids it in the app).

---

## 8. Compliance basics

**Privacy.** With the recommended architecture the app processes no
personal data on any server of ours. The privacy policy still has to say
so, list what stays on the device and in the user's iCloud, and explain
that Apple processes the purchase. If analytics or accounts are added,
the policy, the label and (for EU/UK users) the GDPR/UK GDPR basis
change; that's the point at which a controller registration with the UK
ICO (£40–£60 a year for most small controllers; fee exemptions exist)
would need checking.

**Children.** Rated 4+ but not "directed at children". COPPA obligations
attach to collecting personal information from under-13s; with none
collected there is nothing to comply with beyond not adding it later
without a design review. The UK Children's Code applies to services
"likely to be accessed by children" that process personal data; with no
processing, the design duties reduce to defaults (no nudges toward
sharing, no timers), which 01 E1–E2 already require. ([ICO: Age
appropriate design code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/))

**Consumer law.** A one-time purchase in the UK/EU carries the usual
digital-content rights; Apple handles refunds through the App Store. The
listing must describe the unlock accurately (4.1).

**Licences.** Code licence (MIT proposed in the Phase 1 spec §14) with the
dataset excluded; font licences (OFL) noted in About; the rights review in
03 §5 completed before submission.

---

## 9. Costs summary

| Item | One-off | Recurring |
|---|---|---|
| Apple Developer Program | — | $99/yr ⚠ |
| Apple commission | — | 15% of net proceeds (30% above $1M/yr) |
| Domain for policy/marketing (optional; Pages is enough) | — | ~£10/yr, optional |
| Trade-mark search/registration (03 §5) | Owner's call; a UK application is £170 for one class | — |
| Mac with Xcode 26 | Existing hardware or a cloud Mac for CI | Optional |
| Everything else in the recommended stack | £0 | £0 |

---

## 10. Owner decisions (all with a default; flagged ⚠ where Apple constrains the answer)

| # | Decision | Default | Constraint |
|---|---|---|---|
| A1 | Wrapper | Capacitor 8 | Reversible until native code is written |
| A2 | Free + non-consumable vs paid up front | Free + non-consumable "Full career" | ⚠ IAP is mandatory either way (3.1.1) |
| A3 | Accept $99/yr Developer Program | Yes | ⚠ Required to publish |
| A4 | Price | $4.99 / £3.99 tier; $2.99 launch fortnight | — |
| A5 | Web build | Becomes the free tier with a store link | 3.1.1 makes a full free web copy a risk |
| A6 | Accounts | None in v1 | ⚠ 5.1.1(v) makes them optional anyway |
| A7 | iCloud KVS sync | v1.1 (after first release) | — |
| A8 | IAP plugin | Capawesome Purchases or Cap-go native-purchases (StoreKit-only, keeps "Data Not Collected"); not RevenueCat | Privacy label |
| A9 | Analytics in v1 | None | ⚠ 5.1.1(ii) consent rule |
| A10 | Android release | **Out of scope (owner decision, 2026-09-25)** — iOS only | — |
