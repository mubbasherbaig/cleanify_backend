import { io, Socket } from 'socket.io-client';
import { SocketMessage, SimulationTickMessage, SimulationEventMessage, ServerMessage } from '@/types';

type EventCallback = (data: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private url: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private eventCallbacks: Map<string, EventCallback[]> = new Map();

  constructor() {
    this.url = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000';
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      this.socket.on('connect', () => {
        console.log('Connected to Cleanify backend');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setupEventListeners();
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        this.isConnected = false;
        this.notifyCallbacks('connection_lost', { reason });
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`));
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected to server, attempt:', attemptNumber);
        this.isConnected = true;
        this.notifyCallbacks('connection_restored', { attemptNumber });
      });

      this.socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect to server');
        this.notifyCallbacks('connection_failed', {});
        reject(new Error('Failed to reconnect to server'));
      });
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Server messages
    this.socket.on('server_message', (data: ServerMessage['data']) => {
      console.log('Server message:', data.msg);
      this.notifyCallbacks('server_message', data);
    });

    // Simulation tick updates
    this.socket.on('simulation_tick', (data: SimulationTickMessage['data']) => {
      this.notifyCallbacks('simulation_tick', data);
    });

    // Simulation events
    this.socket.on('simulation_event', (data: SimulationEventMessage['data']) => {
      this.notifyCallbacks('simulation_event', data);
    });

    // Route updates
    this.socket.on('route_updated', (data: any) => {
      this.notifyCallbacks('route_updated', data);
    });

    // Truck status updates
    this.socket.on('truck_status_changed', (data: any) => {
      this.notifyCallbacks('truck_status_changed', data);
    });

    // Bin status updates
    this.socket.on('bin_status_changed', (data: any) => {
      this.notifyCallbacks('bin_status_changed', data);
    });

    // Optimization results
    this.socket.on('optimization_complete', (data: any) => {
      this.notifyCallbacks('optimization_complete', data);
    });

    // Settings updates
    this.socket.on('settings_updated', (data: any) => {
      this.notifyCallbacks('settings_updated', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventCallbacks.clear();
    }
  }

  // Event subscription methods
  on(event: string, callback: EventCallback): () => void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    
    this.eventCallbacks.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.eventCallbacks.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  off(event: string, callback?: EventCallback): void {
    if (!callback) {
      this.eventCallbacks.delete(event);
      return;
    }

    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private notifyCallbacks(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  // Emit methods
  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot emit event: socket not connected');
    }
  }

  // Status methods
  isConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getConnectionState(): {
    connected: boolean;
    reconnectAttempts: number;
    socketId?: string;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id
    };
  }

  // Specific event helpers for type safety
  onSimulationTick(callback: (data: SimulationTickMessage['data']) => void): () => void {
    return this.on('simulation_tick', callback);
  }

  onSimulationEvent(callback: (data: SimulationEventMessage['data']) => void): () => void {
    return this.on('simulation_event', callback);
  }

  onConnectionChange(callback: (data: { connected: boolean; reason?: string }) => void): () => void {
    const unsubscribeLost = this.on('connection_lost', (data) => 
      callback({ connected: false, reason: data.reason })
    );
    const unsubscribeRestored = this.on('connection_restored', () => 
      callback({ connected: true })
    );

    return () => {
      unsubscribeLost();
      unsubscribeRestored();
    };
  }

  onRouteUpdate(callback: (data: any) => void): () => void {
    return this.on('route_updated', callback);
  }

  onTruckStatusChange(callback: (data: any) => void): () => void {
    return this.on('truck_status_changed', callback);
  }

  onBinStatusChange(callback: (data: any) => void): () => void {
    return this.on('bin_status_changed', callback);
  }

  onOptimizationComplete(callback: (data: any) => void): () => void {
    return this.on('optimization_complete', callback);
  }
}

// Create and export singleton instance
const socketService = new SocketService();
export default socketService;