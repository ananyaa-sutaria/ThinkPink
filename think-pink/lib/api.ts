import { Platform } from "react-native";

const DEV_SERVER_IP = "10.136.237.136"; // your PC IP
const LOCAL_WEB = "http://localhost:5000";

// Optional: NGROK URL if you want external access
const NGROK_URL = ""; // leave empty for now

export const API_BASE =
  Platform.OS === "web"
    ? LOCAL_WEB
    : NGROK_URL
    ? NGROK_URL
    : `http://${DEV_SERVER_IP}:5000`;