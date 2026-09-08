export type NetworkResourceType =
  | "document"
  | "stylesheet"
  | "image"
  | "media"
  | "font"
  | "script"
  | "texttrack"
  | "xhr"
  | "fetch"
  | "prefetch"
  | "eventsource"
  | "websocket"
  | "manifest"
  | "signedexchange"
  | "ping"
  | "cspviolationreport"
  | "preflight"
  | "other";

export interface NetworkEntry {
  id: string;
  url: string;
  name: string;
  method: string;
  resourceType: NetworkResourceType;
  status: number;
  statusText: string;
  mimeType?: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  postData?: string;
  responseBody?: string;
  hasResponseBody?: boolean;
  size: number;
  startTime: number;
  duration: number;
  state: "pending" | "completed" | "failed";
  error?: string;
  initiator?: string;
}
