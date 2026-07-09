import { io, Socket } from 'socket.io-client'

export class SocketIoClient {
  private socket: Socket | null = null

  connect(url: string): Socket {
    if (this.socket?.connected) return this.socket

    this.socket = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    return this.socket
  }

  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
  }

  getCurrentSocket(): Socket | null {
    return this.socket
  }
}
