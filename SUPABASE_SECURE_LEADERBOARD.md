# Sichere Supabase-Rangliste

Die Rangliste liest weiterhin direkt mit dem öffentlichen Publishable Key. Schreibzugriffe laufen ausschließlich über die Edge Function `submit-score`.

## Sichere Reihenfolge

1. `SUPABASE_SECURE_LEADERBOARD.sql` im Supabase SQL Editor ausführen.
2. Mit Node.js 20 oder neuer über die Supabase CLI anmelden:

   ```powershell
   npx supabase login
   ```

3. Projekt verbinden:

   ```powershell
   npx supabase link --project-ref ncishdfeznjysqswsvzq
   ```

4. Einen zufälligen geheimen Wert mit mindestens 32 Zeichen als Function Secret setzen:

   ```powershell
   npx supabase secrets set SCORE_HASH_SECRET="<ZUFÄLLIGER-WERT>"
   ```

5. Function deployen:

   ```powershell
   npx supabase functions deploy submit-score --no-verify-jwt
   ```

6. Erst danach die geänderte Website veröffentlichen.

## Kontrolle

- Öffentliche `GET`-Anfragen auf `scores` funktionieren weiterhin.
- Direkte `POST`, `PATCH` und `DELETE` auf `/rest/v1/scores` müssen mit `401`, `403` oder einem RLS-Fehler scheitern.
- `POST /functions/v1/submit-score` akzeptiert gültige Scores.
- Mehr als fünf Einsendungen derselben IP innerhalb von zehn Minuten werden mit `429` abgelehnt.

Der Publishable Key bleibt absichtlich im Browser. Niemals einen Secret- oder `service_role`-Key in das Repository eintragen.
