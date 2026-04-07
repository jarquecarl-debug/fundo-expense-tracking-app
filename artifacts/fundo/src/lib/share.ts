import { Envelope } from "@/context/FundoContext";

export function encodeEnvelope(envelope: Envelope): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(envelope)));
  } catch {
    return "";
  }
}

export function decodeEnvelope(encoded: string): Envelope | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as Envelope;
  } catch {
    return null;
  }
}

export function buildShareUrl(envelope: Envelope): string {
  const encoded = encodeEnvelope(envelope);
  const base = window.location.origin + window.location.pathname.replace(/\/$/, "");
  return `${base}/shared?d=${encoded}`;
}

export function copyShareUrl(envelope: Envelope): boolean {
  const url = buildShareUrl(envelope);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    return true;
  }
  return false;
}
