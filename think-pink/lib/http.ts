import { API_BASE } from "./api";

export async function postJSON<T>(path: string, body: any): Promise<T> {
  const url = `${API_BASE}${path}`;
  console.log("POSTJSON URL =", url);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log("POSTJSON STATUS =", res.status);
  console.log("POSTJSON RAW =", text.slice(0, 200));

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data as T;
}