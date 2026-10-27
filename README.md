# PGC Scorer

Offline-first golf competition scoring for Panchkula Golf Club, Sector 3.

React + TypeScript PWA wrapped with Capacitor for Android. All state lives in
IndexedDB; the app is fully functional with no network. Every handicap and
format calculation lives in `src/engine/` as pure functions and is unit-tested.

---

## Getting the APK onto your phone

You do not need Android Studio. GitHub builds the APK for you.

### One-time setup

1. Create a new repository on GitHub (private is fine).
2. Push this folder to it:

   ```bash
   git init
   git add .
   git commit -m "PGC Scorer"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

3. That push triggers the build. Open the **Actions** tab and wait ~10 minutes
   for the first run (later runs are faster — npm and Gradle are cached).

### Getting the file

When the run finishes, the APK is in two places:

- **Releases → "PGC Scorer — latest build" → `pgc-scorer.apk`.** This is the
  easy one: open that release page in your phone's browser and tap the file.
- Actions → the run → Artifacts → `pgc-scorer-apk` (a zip, for desktop).

On the phone, open the downloaded `.apk`. Android will ask whether to allow
installing from your browser — allow it once, and the app installs.

### Signing

With no configuration the workflow produces a **debug-signed** APK. It installs
and runs normally; the only limits are that it cannot go on the Play Store and
a future release-signed build will not upgrade over it.

For a release-signed APK, generate a keystore and add four repository secrets
(Settings → Secrets and variables → Actions):

```bash
keytool -genkey -v -keystore release.keystore -alias pgc \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.keystore          # macOS: base64 release.keystore
```

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | the base64 output above |
| `KEYSTORE_PASSWORD` | keystore password |
| `KEY_ALIAS` | `pgc` |
| `KEY_PASSWORD` | key password |

Keep `release.keystore` safe and out of the repo — losing it means you can
never upgrade an installed copy. The workflow switches to release signing
automatically once `KEYSTORE_BASE64` exists.

---

## Local development

```bash
npm install
npm run dev      # dev server
npm test         # engine test suite
npm run build    # production web build
```

To build the APK on your own machine instead (needs Android Studio):

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# app/build/outputs/apk/debug/app-debug.apk
```

---

## Architecture

```
src/engine/     pure scoring — no React, no I/O, no side effects
  round.ts        golf rounding (half away from zero)
  handicap.ts     Course/Playing Handicap, allocation, NDB, differential
  stableford.ts   points against net, editable table
  parbogey.ts     par/bogey competition
  match.ts        match status, dormie, automatic closure
  countback.ts    tie-breaks with visible working
  skins.ts        skins with carryover
  nassau.ts       front/back/overall with presses
  settlement.ts   netting down to fewest transfers
  formats.ts      every format as a FormatConfig object
  scoring.ts      orchestration, team scoring, leaderboard
  exports.ts      CSV, WhatsApp text, text scorecard
src/data/       Dexie schema, Panchkula seed, draw logic
src/screens/    UI — reads engine output, never computes a score
src/sync/       optional relay sync (off by default)
```

### Two corrections to the original spec

The engine follows the spec except where the spec contradicted itself. Both
are covered by tests that document the reasoning.

**Acceptance test 3.** The spec says a plus handicap of −2 gives strokes back
on "holes 13, 2". Against the spec's own stroke-index row, SI 18 is hole 13 and
SI 17 is **hole 4** — hole 2 is SI 15. The stated rule (deduct where
SI ≥ 19 − |PH|) yields holes 13 and 4, which is what the engine does.

**Acceptance test 5.** The spec says gross 7 on hole 5 (par 5) with one stroke
received is net 6 scoring 0 points. Net 6 on a par 5 is a bogey, which the
spec's own table scores as **1**. The explicit points table is treated as
authoritative; the test also covers gross 8 → net 7 → 0, which is presumably
what was meant.

**Acceptance test 4 settled an ambiguity.** "90% off the lowest" only produces
the required 0/7/14/20 from course handicaps 6/14/21/28 when the lowest is
subtracted *before* the allowance is applied. Applying the allowance first
gives 0/8/14/20. The ordering is a flag on `FormatConfig`
(`offLowestBeforeAllowance`), defaulting to the behaviour the test requires.
This also forces half-away-from-zero rounding, since 13.5 must become 14.

---

## Course data

Panchkula GC ships seeded: par 72, the stroke indexes as published, and the
Blue tee at 6904 yards (CR 72.0, Slope 113), with 3520 out and 3384 in.

White and Red ship **blank** — per-hole yardages and CR/Slope are entered in
the Course Editor, as specified. Course Handicap returns null for an unrated
tee and the app tells you to fill it in rather than inventing a number.

Save validation enforces par 72 and a stroke-index permutation of 1–18. The
spec's "odd indexes sum to 81, even sum to 90" is automatically true of any
permutation of 1–18, so it checks nothing; the meaningful rule, and what the
Panchkula card actually does, is that one nine carries all the odd indexes and
the other all the even. That is what is enforced.
