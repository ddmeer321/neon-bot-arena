// Konto-Anzeige oben rechts.
//
// Abgemeldet: ein Login-Link.
// Angemeldet: nur das Profilbild. Ein Klick öffnet ein kleines Menü mit Bild,
// Name, „Profil ansehen" und „Abmelden".
//
// BEWUSST OHNE HOCHLADEN
//
// In der Spielebibliothek kann man im selben Menü ein Bild hochladen. Hier
// nicht — und zwar nicht aus Vergesslichkeit: Der Upload bringt das
// Umzeichnen des Bildes mit (Zuschnitt, WebP, Entfernen der EXIF-Daten samt
// GPS-Koordinaten). Diese knapp hundert Zeilen ein zweites Mal in ein
// zweites Repo zu legen hieße, sie ab dem nächsten Fehler doppelt pflegen zu
// müssen. Das Bild wird dort gewählt, wo das Profil wohnt.
//
// Das Menü selbst ist dieselbe Bauweise wie in der Bibliothek — gleiche
// Klassennamen, gleiche Bedienung —, nur in den Farben dieses Spiels.

(function () {
  var el = document.getElementById("auth-status");
  if (!el || !window.supabaseClient) return;

  var sb = window.supabaseClient;
  var BUCKET = "avatars";

  var state = { username: "", avatar: null, open: false };

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  // Der Dateiname bleibt beim Ersetzen gleich, damit im Speicher nichts
  // verwaist. Ohne den Zeitstempel zeigt der Browser deshalb weiter das alte
  // Bild.
  function avatarUrl(path, updatedAt) {
    if (!path) return null;
    var res = sb.storage.from(BUCKET).getPublicUrl(path);
    var url = res && res.data && res.data.publicUrl;
    return url ? url + "?v=" + encodeURIComponent(updatedAt || "1") : null;
  }

  function renderLoggedOut() {
    state.open = false;
    el.innerHTML = '<a class="auth-login-btn" href="/login.html">Login</a>';
  }

  function avatarMarkup(cls, url) {
    // Ohne Bild bleibt der Kreis leer — die Auswahl fertiger Bilder kommt erst.
    if (!url) return '<span class="' + cls + ' is-empty" aria-hidden="true"></span>';
    return '<img class="' + cls + '" src="' + escapeHtml(url) + '" alt="" width="64" height="64" />';
  }

  function renderLoggedIn() {
    var url = avatarUrl(state.avatar && state.avatar.path, state.avatar && state.avatar.updatedAt);
    var name = state.username || "Spieler";

    el.innerHTML =
      '<div class="auth-menu-wrap">' +
        '<button class="auth-avatar-btn" id="auth-avatar-btn" type="button" ' +
                'aria-haspopup="menu" aria-expanded="false" aria-controls="auth-menu" ' +
                'aria-label="Konto von ' + escapeHtml(name) + '">' +
          avatarMarkup("auth-avatar", url) +
        '</button>' +
        '<div class="auth-menu" id="auth-menu" role="menu" hidden>' +
          '<div class="auth-menu-head">' +
            avatarMarkup("auth-avatar auth-avatar-lg", url) +
            '<p class="auth-menu-name">' + escapeHtml(name) + '</p>' +
          '</div>' +
          '<p class="auth-menu-msg" id="auth-menu-msg" role="status" aria-live="polite" hidden></p>' +
          '<div class="auth-menu-actions">' +
            '<button class="auth-menu-btn" id="auth-profile-btn" type="button" role="menuitem">Profil ansehen</button>' +
            '<button class="auth-menu-btn auth-menu-btn-quiet" id="auth-logout-btn" type="button" role="menuitem">Abmelden</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    wireUp();
  }

  function setOpen(open) {
    var btn = document.getElementById("auth-avatar-btn");
    var menu = document.getElementById("auth-menu");
    if (!btn || !menu) return;
    state.open = open;
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      var first = document.getElementById("auth-profile-btn");
      if (first) first.focus();
    }
  }

  function wireUp() {
    var btn = document.getElementById("auth-avatar-btn");
    var logout = document.getElementById("auth-logout-btn");
    var profile = document.getElementById("auth-profile-btn");

    if (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        setOpen(!state.open);
      });
    }

    if (profile) {
      profile.addEventListener("click", function () {
        var msg = document.getElementById("auth-menu-msg");
        if (!msg) return;
        msg.textContent = "Die Profilseite kommt bald.";
        msg.hidden = false;
      });
    }

    if (logout) {
      logout.addEventListener("click", async function () {
        await sb.auth.signOut();
        renderLoggedOut();
      });
    }
  }

  document.addEventListener("click", function (e) {
    if (!state.open) return;
    var wrap = e.target.closest && e.target.closest(".auth-menu-wrap");
    if (!wrap) setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (!state.open || e.key !== "Escape") return;
    setOpen(false);
    var btn = document.getElementById("auth-avatar-btn");
    if (btn) btn.focus(); // sonst landet der Fokus am Seitenanfang
  });

  async function render() {
    var res = await sb.auth.getSession();
    var session = res && res.data && res.data.session;
    if (!session) {
      renderLoggedOut();
      return;
    }

    var pr = await sb
      .from("profiles")
      .select("username, avatar_path, avatar_updated_at")
      .eq("id", session.user.id)
      .maybeSingle();

    var profile = pr && pr.data;
    state.username = (profile && profile.username) || "Spieler";
    state.avatar = profile && profile.avatar_path
      ? { path: profile.avatar_path, updatedAt: profile.avatar_updated_at }
      : null;

    renderLoggedIn();
  }

  render();
})();
