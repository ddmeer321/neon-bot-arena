import { bootGame } from "./scripts/main.js?v=testdevtools1";
import { unlockTestLab } from "./scripts/test-lock.js?v=testlock1";

await unlockTestLab();
bootGame();
