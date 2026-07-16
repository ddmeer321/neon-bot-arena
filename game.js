import { bootGame } from "./scripts/main.js?v=chaos3";
import { unlockTestLab } from "./scripts/test-lock.js?v=testlock3";

await unlockTestLab();
bootGame();
