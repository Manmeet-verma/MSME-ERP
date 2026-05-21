# MSME Pro Mobile — Store Listing

This file holds the copy + asset checklist for publishing MSME Pro Mobile to
the Google Play Store and Apple App Store. Replit does **not** execute the
EAS build or store submission for you — both require your own Expo, Apple
Developer, and Google Play credentials. Treat the steps below as a runbook.

## EAS build (one-time setup)

```bash
npm i -g eas-cli
eas login
cd artifacts/erp-mobile
eas build:configure          # creates eas.json (development / preview / production profiles)
eas build --platform android --profile production
eas build --platform ios     --profile production
eas submit  --platform android
eas submit  --platform ios
```

You will be prompted for an Android keystore (let EAS manage it) and an
Apple App-Specific Password / API key.

## App identity

- **Name**: MSME Pro
- **Subtitle / short description (80 chars max for Play)**: Run your factory from your phone — leads, quotes, GST, payroll.
- **Bundle / package id**: `pro.msme.app` (update `app.json > ios.bundleIdentifier` and `android.package` before first build)
- **Primary category**: Business
- **Secondary category**: Productivity
- **Audience**: 18+
- **Content rating**: Everyone (no UGC, no ads)

## Long description

> MSME Pro is the Business OS for Indian small and medium businesses. Capture
> and qualify leads from IndiaMart, TradeIndia, JustDial, Facebook Lead Ads
> and WhatsApp; build quotations with GST split (CGST/SGST or IGST); record
> sales orders, invoices and payments; manage inventory across warehouses;
> run payroll with PF/ESI auto-deductions; and post journal entries to a
> built-in chart of accounts — all from a single mobile app.
>
> Highlights:
> - Live dashboard: hot leads, overdue invoices, low stock, revenue
> - One-tap call and WhatsApp from any lead, full conversation thread on file
> - Smart AI lead scoring (hot / warm / cold) with next-action suggestions
> - Push notifications for hot leads, due tasks and overdue invoices
> - Offline-friendly cache, dark theme, designed for India (₹ Indian-comma)
>
> Requires a free MSME Pro account — sign up on the web first, then sign in
> on mobile.

## Screenshots checklist (capture on a real device)

1. Dashboard with KPI tiles
2. Leads list (showing hot/warm/cold dots)
3. Lead detail with WhatsApp thread and Call / Email buttons
4. Tasks list with check-off
5. Settings → lead-source sync + push enrolment

Generate Android screenshots in 1080×1920 portrait; iOS in 1290×2796 (6.7")
and 1179×2556 (6.1"). Use the `expo-router` web preview + browser devtools
device emulator if you do not have physical devices for every size.

## Privacy & permissions

The app requests:
- **Notifications** — to deliver hot-lead / due-task / overdue-invoice alerts
- **Network** — to call the MSME Pro API

It does **not** request location, contacts, microphone, calendar or camera in
this release. Update `app.json > ios.infoPlist` and `android.permissions` if
you add expense receipt photos in a follow-up.

## Privacy policy URL

Required by both stores. Point to your hosted policy, e.g.
`https://msme.pro/privacy`. Cover: data collected (email, org name, lead
data you import), where it is stored (Replit-managed Postgres),
third-parties (Anthropic for AI drafts, Meta Graph API for WhatsApp,
Twilio for calls), retention, and user deletion contact.

## Versioning

Bump `expo.version` (semver) and `expo.ios.buildNumber` / `expo.android.versionCode`
in `app.json` before each EAS build. EAS will fail the upload if either
collides with a previous build.
