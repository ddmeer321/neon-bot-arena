# Sichere Supabase-Rangliste

Die Rangliste liest weiterhin direkt mit dem öffentlichen Publishable Key. Schreib- und Löschzugriffe laufen ausschließlich über die Edge Function `submit-score`. Öffentliche Clients erhalten nur Leserechte auf die tatsächlich angezeigten Score-Spalten.

## Aktueller lokaler Stand

Die Löschfunktion ist nur lokal vorbereitet und darf erst zusammen mit `SUPABASE_SCORE_DELETION.sql`, der neuen Edge Function und dem passenden Frontend veröffentlicht werden. Bestehende Scores haben keinen Löschschlüssel und können weiterhin nur administrativ entfernt werden.

## Sichere Reihenfolge

1. Falls noch nicht erfolgt: `SUPABASE_SECURE_LEADERBOARD.sql` im Supabase SQL Editor ausführen.
2. Danach `SUPABASE_SCORE_DELETION.sql` im Supabase SQL Editor ausführen. Dieses Skript:

   - begrenzt öffentliche Leserechte auf harmlose Ranglisten-Spalten,
   - ergänzt interne UUIDs und gehashte Löschschlüssel,
   - erstellt die serverseitigen Funktionen zum Speichern und Löschen.

3. Mit Node.js 20 oder neuer über die Supabase CLI anmelden:

   ```powershell
   npx supabase login
   ```

4. Projekt verbinden:

   ```powershell
   npx supabase link --project-ref ncishdfeznjysqswsvzq
   ```

5. Einen zufälligen geheimen Wert mit mindestens 32 Zeichen als Function Secret setzen:

   ```powershell
   npx supabase secrets set SCORE_HASH_SECRET="<ZUFÄLLIGER-WERT>"
   ```

6. Function deployen:

   ```powershell
   npx supabase functions deploy submit-score --no-verify-jwt
   ```

7. Erst danach die geänderte Website veröffentlichen.

## Kontrolle

- Öffentliche `GET`-Anfragen auf `scores` funktionieren weiterhin.
- Direkte `POST`, `PATCH` und `DELETE` auf `/rest/v1/scores` müssen mit `401`, `403` oder einem RLS-Fehler scheitern.
- `POST /functions/v1/submit-score` akzeptiert gültige Scores.
- Erfolgreiche neue Einsendungen liefern einmalig eine Score-ID und einen Löschschlüssel an das jeweilige Gerät.
- `DELETE /functions/v1/submit-score` löscht nur mit passender Score-ID und passendem Löschschlüssel.
- Mehr als fünf Einsendungen derselben IP innerhalb von zehn Minuten werden mit `429` abgelehnt.

Der Publishable Key bleibt absichtlich im Browser. Niemals einen Secret- oder `service_role`-Key in das Repository eintragen.
