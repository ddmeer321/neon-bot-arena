const unlockStorageKey = "neon-bot-arena-testlabor-unlocked";
const passwordHash = "fa9f06e004dc263c57b563cc58ed85b1e571d20fc2d5a3921048e02ab51a5abb";

export async function unlockTestLab() {
  const overlay = document.querySelector("#testLockOverlay");
  const form = document.querySelector("#testLockForm");
  const input = document.querySelector("#testLockPassword");
  const status = document.querySelector("#testLockStatus");

  if (!overlay || !form || !input) {
    document.body.classList.remove("test-locked");
    return;
  }

  if (sessionStorage.getItem(unlockStorageKey) === "1") {
    document.body.classList.remove("test-locked");
    return;
  }

  input.focus();

  await new Promise((resolve) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const candidate = input.value.trim();
      const candidateHash = await sha256(candidate);

      if (candidateHash !== passwordHash) {
        if (status) status.textContent = "Falsches Passwort.";
        input.value = "";
        input.focus();
        return;
      }

      sessionStorage.setItem(unlockStorageKey, "1");
      document.body.classList.remove("test-locked");
      resolve();
    });
  });
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
