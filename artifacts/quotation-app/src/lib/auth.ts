import { setAuthTokenGetter } from "@workspace/api-client-react";

export function getAuthToken() {
  return localStorage.getItem("led_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("led_token", token);
}

export function removeAuthToken() {
  localStorage.removeItem("led_token");
}

setAuthTokenGetter(getAuthToken);
