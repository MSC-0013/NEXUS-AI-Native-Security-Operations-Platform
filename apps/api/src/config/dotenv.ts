import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env from the workspace root (three levels up: src/config -> src -> api -> workspace root)
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
// Fallback to load .env from the current working directory
dotenv.config();
