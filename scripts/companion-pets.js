// Umlaufende Begleiter-Wesen ("pets"), aktuell das Katzentrio.
//
// Warum eine eigene Datei: Umlaufbahn und Feuerlogik werden an ZWEI Stellen
// gebraucht — gameplay.js muss wissen, wo eine Katze steht, um von dort zu
// schiessen, und render.js muss sie an genau derselben Stelle zeichnen.
// Beide importieren deshalb getPetPositions(), statt die Rechnung zu
// duplizieren.
//
// Bewusste Nicht-Ziele:
// - Die Wesen sind KEINE Spielobjekte. Sie stehen in keiner Kollisionsliste,
//   haben keine Lebenspunkte und keinen Radius. Es gibt schlicht nichts, was
//   getroffen werden koennte — dadurch koennen sie auch nicht als Schild
//   missbraucht werden.
// - Es gibt keinen eigenen Projektiltyp. Geschossen wird ueber dieselbe
//   Kugelliste wie beim Spieler, damit Schaden, Flug und Multiplayer-
//   Abgleich unveraendert weiterlaufen.

export const PET_ORBIT_RADIUS = 54;   // Abstand zum Spielermittelpunkt (px)
export const PET_ORBIT_SPEED = 0.85;  // Bogenmass pro Sekunde (~7,4 s je Runde)
export const PET_DRAW_SIZE = 11;      // Halbe Koerperlaenge beim Zeichnen (px)

// Balance: bewusst konservativ. Drei Katzen ergeben zusammen rund 17 Schaden
// pro Sekunde — spuerbar, aber klar unter den 47–111 DPS der Helden. Die
// Staerke kommt aus der Dauerhaftigkeit und daraus, dass drei Ziele parallel
// bedient werden.
//
// Die Wirkung steckt bewusst in EINEM schweren Schuss je 3 Sekunden statt in
// vielen kleinen: viele kleine Kugeln gehen im Partikelflug der Arena unter
// und lesen sich wie Effektstaub, nicht wie ein Angriff. Schaden und
// Abklingzeit sind so gewaehlt, dass der Gesamtschaden gleich bleibt —
// 3 Katzen / 3 s ergeben einen Treffer pro Sekunde zu je 17 Schaden, also
// dieselben ~17 DPS wie zuvor bei 5 Schaden alle 0,9 s.
export const PET_DAMAGE = 17;
export const PET_COOLDOWN = 3;        // Sekunden je Katze
export const PET_RANGE = 320;         // Zielerfassung (px)
export const PET_BULLET_SPEED = 420;
export const PET_BULLET_LIFE = 0.9;   // deckt die Reichweite mit etwas Reserve
// Deutlich groesser als Spieler- (4–5) und Gegnerkugeln: die Kugel ist das
// einzige, was von einer Katze im Gefecht wirklich zu sehen ist, und sie
// kommt nur alle 3 Sekunden. Der groessere Radius zaehlt auch fuer die
// Trefferpruefung — das gleicht aus, dass ein Fehlschuss jetzt 3 Sekunden
// kostet statt 0,9.
export const PET_BULLET_RADIUS = 9;
// Abstand des Abschusspunkts vom Katzenmittelpunkt. Ohne Versatz wuerde die
// grosse Kugel die Katze im Moment des Schusses verdecken; 16 px setzen sie
// knapp davor. (addBullet nutzt 24 px, das ist fuer die kleinen Wesen zu weit.)
export const PET_MUZZLE_OFFSET = 16;

// Liefert die Definitionen der Wesen eines Begleiters, oder ein leeres Array.
export function getPetDefinitions(companion) {
  return Array.isArray(companion?.pets) ? companion.pets : [];
}

/**
 * Position aller Wesen zu einem Zeitpunkt.
 *
 * Die Wesen sind gleichmaessig auf dem Kreis verteilt (bei drei Katzen also
 * 0°, 120°, 240°). Der Winkel haengt ausschliesslich an `time` — also an
 * `state.time`, das nur waehrend eines laufenden Frames weiterlaeuft. Daraus
 * folgt dreierlei ohne Zusatzaufwand:
 *   - framerate-unabhaengig, weil `state.time` aus dt aufsummiert wird
 *   - kein Sprung nach Pause, weil `state.time` waehrend der Pause steht
 *   - stabil bei Spielerbewegung, weil die Position jeden Frame neu aus der
 *     aktuellen Spielerposition abgeleitet wird statt mitgeschleppt
 *
 * @returns {Array<{pet: object, index: number, x: number, y: number, angle: number}>}
 */
export function getPetPositions(companion, player, time) {
  const pets = getPetDefinitions(companion);
  if (!pets.length || !player) return [];
  const step = (Math.PI * 2) / pets.length;
  return pets.map((pet, index) => {
    const angle = time * PET_ORBIT_SPEED + index * step;
    return {
      pet,
      index,
      angle,
      x: player.x + Math.cos(angle) * PET_ORBIT_RADIUS,
      y: player.y + Math.sin(angle) * PET_ORBIT_RADIUS
    };
  });
}

/**
 * Feuerzeitpunkte der Wesen — absolute Werte auf `state.time`, nicht ein
 * frei laufender Countdown.
 *
 * Jede Katze bekommt eine feste Phase im Zyklus (bei drei Katzen 0 s / 1 s /
 * 2 s von 3 s), und jede spaetere Fortschreibung addiert ausschliesslich
 * GANZE Vielfache von PET_COOLDOWN. Dadurch ist der Abstand zwischen den drei
 * Katzen eine Invariante: er ueberlebt gegnerfreie Phasen, Pausen und
 * Begleiterwechsel, ohne dass es dafuer Sonderfaelle braucht.
 *
 * Das ist bei 3 s Abklingzeit der entscheidende Punkt. Mit einem gewoehnlichen
 * Countdown, der ohne Ziel auf 0 laeuft, stuenden nach jeder Kampfpause alle
 * drei gleichzeitig auf 0 — sie wuerden von da an dauerhaft im Gleichtakt
 * feuern, und aus einem Schuss pro Sekunde wuerde eine Dreifachsalve alle drei
 * Sekunden mit dem dreifachen Sofortschaden.
 */
export function createPetShotSchedule(count, time) {
  const slot = PET_COOLDOWN / Math.max(1, count);
  return Array.from({ length: count }, (_, index) => time + index * slot);
}

/**
 * Naechster Feuerzeitpunkt derselben Katze.
 *
 * Es wird immer um ganze Zyklen weitergerueckt — bei einem laengeren Ausfall
 * (kein Gegner in Reichweite) in einem Schritt bis kurz hinter die aktuelle
 * Zeit. So faellt die Katze nicht beliebig weit zurueck und ihre Phase im
 * Zyklus bleibt trotzdem exakt erhalten.
 */
export function advancePetShot(scheduledAt, time) {
  const cycles = Math.max(1, Math.ceil((time - scheduledAt) / PET_COOLDOWN));
  return scheduledAt + cycles * PET_COOLDOWN;
}
