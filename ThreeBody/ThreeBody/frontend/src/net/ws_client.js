// WebSocket telemetry client.
export class WsClient {
  constructor(onFrame, onStatus) {
    this.onFrame = onFrame;
    this.onStatus = onStatus || (() => {});
    this._connect();
  }
  _connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    this.ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws.onopen = () => this.onStatus("connected");
    this.ws.onmessage = (e) => {
      try { this.onFrame(JSON.parse(e.data)); } catch (_) {}
    };
    this.ws.onclose = () => {
      this.onStatus("disconnected — retrying…");
      setTimeout(() => this._connect(), 1500);
    };
  }
}
