import EventEmitter from "events";
import { Socket } from "net";

export enum OPCode {
  HANDSHAKE = 0,
  FRAME = 1,
  CLOSE = 2,
  PING = 3,
  PONG = 4
}

export default class IPCClient extends EventEmitter {
  private socket!: Socket;
  private pending = Buffer.alloc(0);

  constructor() {
    super();

    this.createSocket();
  }

  private createSocket() {
    this.socket = new Socket();
    this.socket.on("connect", () => {
      this.emit("connect");
    });
    this.socket.on("close", (hadError: boolean) => {
      this.emit("close", hadError);
    });
    this.socket.on("error", error => {
      this.emit("error", error);
    });
    this.pending = Buffer.alloc(0);
    this.socket.on("data", (buffer: Buffer) => {
      this.pending = Buffer.concat([this.pending, buffer]);
      while (this.pending.length >= 8) {
        const op = this.pending.readInt32LE(0);
        const length = this.pending.readInt32LE(4);
        if (length < 0 || length > 1024 * 1024) { this.socket.destroy(); return; }
        if (this.pending.length < 8 + length) return;
        const payload = this.pending.subarray(8, 8 + length);
        this.pending = this.pending.subarray(8 + length);
        let json: unknown;
        try { json = JSON.parse(payload.toString("utf-8")); }
        catch { continue; }
        this.emit("data", op, json);
      }
    });
  }

  public connect(ipcPath: string) {
    if (this.socket.destroyed) {
      this.createSocket();
    }
    this.socket.connect(ipcPath);
  }

  public send(data: unknown, op = OPCode.FRAME) {
    const json = JSON.stringify(data);
    const length = Buffer.byteLength(json);
    const buffer = Buffer.alloc(8 + length);
    buffer.writeInt32LE(op, 0);
    buffer.writeInt32LE(length, 4);
    buffer.write(json, 8, length);

    if (!this.socket.closed && this.socket.writable) {
      this.socket.write(buffer);
    } else {
      this.socket.end();
      this.createSocket();
    }
  }

  public close() {
    if (!this.socket.closed) {
      this.send({}, OPCode.CLOSE);
      this.socket.end();
    }
  }

  public destroy() {
    this.removeAllListeners();
    this.socket.destroy();
  }
}
