// Gemeinsame Cloud-Speicher-Schicht fuer Spielstaende (Tabelle game_saves,
// ein Zeilentyp pro Nutzer+Spiel). Identische Kopie von
// ddmeer321.github.io/assets/js/cloud-save.js - eigenes Repo, eigene Datei,
// gleiches Prinzip wie bei auth.js/supabase-client.js (siehe AUTH-ADMIN.md
// im Kontext-Repo: dieses Spiel teilt sich JS-Dateien nicht mit der
// Bibliothek, auch wenn es unter derselben Adresse laeuft).
(function () {
  if (window.CloudSave) return;

  var sessionPromise = null;
  var enabledPromise = null;

  function getSession() {
    if (!window.supabaseClient) return Promise.resolve(null);
    if (!sessionPromise) {
      sessionPromise = window.supabaseClient.auth
        .getSession()
        .then(function (res) {
          return res && res.data && res.data.session ? res.data.session : null;
        })
        .catch(function () {
          return null;
        });
    }
    return sessionPromise;
  }

  function isCloudEnabled(userId) {
    if (!enabledPromise) {
      enabledPromise = window.supabaseClient
        .from("profiles")
        .select("cloud_save_enabled")
        .eq("id", userId)
        .maybeSingle()
        .then(function (res) {
          return !(res && res.data && res.data.cloud_save_enabled === false);
        })
        .catch(function () {
          return false;
        });
    }
    return enabledPromise;
  }

  async function ready() {
    var session = await getSession();
    if (!session) return null;
    var enabled = await isCloudEnabled(session.user.id);
    if (!enabled) return null;
    return session.user.id;
  }

  async function load(gameId) {
    var userId = await ready();
    if (!userId) return null;
    try {
      var res = await window.supabaseClient
        .from("game_saves")
        .select("save_data")
        .eq("user_id", userId)
        .eq("game_id", gameId)
        .maybeSingle();
      if (res.error || !res.data) return null;
      return res.data.save_data;
    } catch (err) {
      console.warn("CloudSave: Laden fehlgeschlagen.", err);
      return null;
    }
  }

  async function save(gameId, data) {
    var userId = await ready();
    if (!userId) return false;
    try {
      var res = await window.supabaseClient.from("game_saves").upsert(
        {
          user_id: userId,
          game_id: gameId,
          save_data: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,game_id" }
      );
      return !res.error;
    } catch (err) {
      console.warn("CloudSave: Speichern fehlgeschlagen.", err);
      return false;
    }
  }

  async function migrateLocalOnce(gameId, getLocalData) {
    var userId = await ready();
    if (!userId) return;
    var flagKey = "cloud-save-migrated:" + gameId + ":" + userId;
    try {
      if (localStorage.getItem(flagKey)) return;
    } catch (err) {
      /* localStorage blockiert -> einfach ohne Merker weitermachen */
    }
    try {
      var res = await window.supabaseClient
        .from("game_saves")
        .select("user_id")
        .eq("user_id", userId)
        .eq("game_id", gameId)
        .maybeSingle();
      if (res.error) return;
      if (!res.data) {
        var localData = getLocalData();
        if (localData) await save(gameId, localData);
      }
      try {
        localStorage.setItem(flagKey, "1");
      } catch (err) {
        /* kein Merker moeglich -> naechstes Mal wird einfach erneut geprueft */
      }
    } catch (err) {
      console.warn("CloudSave: Migration fehlgeschlagen.", err);
    }
  }

  window.CloudSave = { load: load, save: save, migrateLocalOnce: migrateLocalOnce, ready: ready };
})();
