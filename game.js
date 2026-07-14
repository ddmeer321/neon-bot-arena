import { bootGame } from "./scripts/main.js?v=gamemodes2";
import { unlockTestLab } from "./scripts/test-lock.js?v=testlock3";

await unlockTestLab();
bootGame();
