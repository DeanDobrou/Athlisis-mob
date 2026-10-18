# Athlisis mobile

The members' app for the gym: the class schedule, bookings, check-in, memberships
and profile. Every rule lives on the server, the web app in `crossfit-gym-app`;
this app calls its `/api` routes.

## Run it

1. `npm install`
2. Put the server's address in `.env.development.local`:

   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
   ```

   Only `npm start` reads that file. Builds and updates take the https address
   from the `EXPO_PUBLIC_API_URL` variable in the project's EAS environment.
3. `npm start`

## Ship it

Builds on the `preview` profile are APKs on the `preview` channel.

```bash
npx eas-cli@latest build --profile preview --platform android   # a new APK
npx eas-cli@latest update --channel preview --environment preview --message "what changed"
npx eas-cli@latest update:rollback                               # undo an update
```

An update carries JavaScript and images only. A new native library, a change to
`app.json`'s native settings or an Expo SDK upgrade needs a new build: the
runtime version follows the native fingerprint, so updates never reach a build
they do not fit.

## Before you commit

```bash
npx tsc --noEmit
npm run lint
npm run check   # the membership and training rules, and the sign-out races
```
