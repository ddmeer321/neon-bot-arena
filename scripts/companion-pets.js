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
// bedient werden, nicht aus dem Einzelschuss.
export const PET_DAMAGE = 5;
export const PET_COOLDOWN = 0.9;      // Sekunden je Katze
export const PET_RANGE = 320;         // Zielerfassung (px)
export const PET_BULLET_SPEED = 420;
export const PET_BULLET_LIFE = 0.9;   // deckt die Reichweite mit etwas Reserve
export const PET_BULLET_RADIUS = 3;   // kleiner als Spielerkugeln (4–5)

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

// Startwerte der Feuer-Abklingzeiten. Versetzt, damit die drei Katzen nicht
// im Gleichtakt feuern, sondern gleichmaessig ueber den Zyklus verteilt.
export function createPetCooldowns(count) {
  return Array.from({ length: count }, (_, index) => (PET_COOLDOWN * index) / Math.max(1, count));
}
