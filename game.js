import { bootGame } from "./scripts/main.js?v=chaos4";
import { unlockTestLab } from "./scripts/test-lock.js?v=testlock3";

await unlockTestLab();
bootGame();
