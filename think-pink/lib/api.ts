import { Platform } from "react-native";

const DEV_SERVER_IP = "10.136.105.29"; // your laptop IP (only works if campus allows it)
const LOCAL_WEB = "http://localhost:5000";

// If you use ngrok, paste it here instead:
const NGROK_URL = "https://extraphysical-unavid-rico.ngrok-free.dev"; // e.g. "https://xxxx.ngrok-free.dev"

export const API_BASE =
  Platform.OS === "web"
    ? LOCAL_WEB
    : (NGROK_URL || `http://${DEV_SERVER_IP}:5000`);