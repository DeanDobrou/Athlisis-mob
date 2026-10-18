# Athlisis mobile

The members' app for the gym: the class schedule, bookings, check-in, memberships
and profile. Every rule lives on the server, the web app in `crossfit-gym-app`;
this app calls its `/api` routes.

## Run it

1. `npm install`
2. Put the server's address in `.env.local`:

   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
   ```

   An EAS build does not read `.env.local`. Give it the https address in the
   build profile's `env` in `eas.json`, or as an EAS environment variable.
3. `npm start`

## Before you commit

```bash
npx tsc --noEmit
npm run lint
npm run check   # the membership and training rules, and the sign-out races
```
