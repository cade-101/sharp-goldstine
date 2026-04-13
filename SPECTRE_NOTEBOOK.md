# Spectre Notebook

## Today
- [x] Create Spectre Notebook
- [ ] Set up Tether Git repo
## Architecture Notes

### Kill Switch (Feu Follet / Tether)

Goal: be able to permanently disable the app and wipe all user data if the product is ever used for ads, data selling, or anything unsafe.

- Single server-side flag: `kill_switch_enabled` stored in Supabase (not in the app)
- App checks this flag on cold launch:
  - If `false`: app works normally
  - If `true`:
    - Wipe local data:
      - SecureStore keys
      - AsyncStorage
      - Any local SQLite / cache
    - Show a single screen: "Tether has been shut down for safety reasons."
    - Do NOT attempt to reconnect or recover
- Only Cade can toggle the flag (no in-app control, only via Supabase console)
- Flag key is never committed to GitHub

### User "Delete All Data" Button

Goal: user can completely wipe their account + data at any time.

When user taps "Delete my data":

1. Call Supabase RPC / endpoint that:
   - Deletes all rows in user tables where `user_id = current_user_id`
   - Deletes auth user account
2. On the device:
   - Clear SecureStore
   - Clear AsyncStorage
3. Sign the user out and navigate to the welcome screen.
4. This is irreversible and clearly explained in the UI.