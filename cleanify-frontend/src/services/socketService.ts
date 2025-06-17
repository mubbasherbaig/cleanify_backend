import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/utils/constants';

// Socket message types
export interface SimulationTickMessage {
  type: 'simulation_tick';
  data: {
    sim_time: string;
    tick_count: number;
    active_trucks: number;
    bins_needing_collection: number;
    traffic_multiplier: number;
  };
}

export interface SimulationEventMessage {
  type: 'simulation_event';
  data: {
    event_type: string;
    timestamp: string;
    data: Record<string, any>;
  };
}

export interface TruckUpdateMessage {
  type: 'truck_updated';
  data: {
    truck_id: string;
    status: string;
    location: [number, number];
    load: number;
    route: string[];
  };
}

export interface BinUpdateMessage {
  type: 'bin_updated';
  data: {
    bin_id: string;
    fill_level: number;
    status: string;
    last_collection: string;
  };
}

export interface RouteUpdateMessage {
  type: 'route_updated';
  data: {
    truck_id: string;
    route: any;
    estimated_completion: string;
  };
}

export interface OptimizationCompleteMessage {
  type: 'optimization_complete';
  data: {
    trucks_optimized: number;
    bins_assigned: number;
    total_distance: number;
    optimization_time: number;
  };
}

export interface ConnectionLostMessage {
  type: 'connection_lost';
  data: {
    reason: string;
    timestamp: string;
  };
}

export interface ConnectionRestoredMessage {
  type: 'connection_restored';
  data: {
    timestamp: string;
  };
}

type SocketMessage = 
  | SimulationTickMessage
  | SimulationEventMessage
  | TruckUpdateMessage
  | BinUpdateMessage
  | RouteUpdateMessage
  | OptimizationCompleteMessage
  | ConnectionLostMessage
  | ConnectionRestoredMessage;

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleReconnect = this.handleReconnect.bind(this);
    this.handleReconnectError = this.handleReconnectError.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
  }

  async connect(): Promise<void> {
    if (this.socket && this.socket.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(API_CONFIG.SOCKET_URL, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          forceNew: true
        });

        this.socket.on('connect', () => {
          this.handleConnect();
          resolve();
        });

        this.socket.on('disconnect', this.handleDisconnect);
        this.socket.on('reconnect', this.handleReconnect);
        this.socket.on('reconnect_error', this.handleReconnectError);
        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          reject(error);
        });

        // Register event listeners
        this.socket.on('simulation_tick', (data) => this.handleMessage({ type: 'simulation_tick', data }));
        this.socket.on('simulation_event', (data) => this.handleMessage({ type: 'simulation_event', data }));
        this.socket.on('truck_updated', (data) => this.handleMessage({ type: 'truck_updated', data }));
        this.socket.on('bin_updated', (data) => this.handleMessage({ type: 'bin_updated', data }));
        this.socket.on('route_updated', (data) => this.handleMessage({ type: 'route_updated', data }));
        this.socket.on('optimization_complete', (data) => this.handleMessage({ type: 'optimization_complete', data }));

      } catch (error) {
        console.error('Failed to create socket connection:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.eventListeners.clear();
  }

  private handleConnect(): void {
    console.log('Socket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.emit('connection_restored', { timestamp: new Date().toISOString() });
  }

  private handleDisconnect(reason: string): void {
    console.log('Socket disconnected:', reason);
    this.isConnected = false;

    this.emit('connection_lost', { 
      reason, 
      timestamp: new Date().toISOString() 
    });

    // Attempt to reconnect if it wasn't a manual disconnect
    if (reason !== 'io client disconnect' && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  private handleReconnect(): void {
    console.log('Socket reconnected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emit('connection_restored', { timestamp: new Date().toISOString() });
  }

  private handleReconnectError(error: Error): void {
    console.error('Socket reconnection error:', error);
    this.reconnectAttempts++;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connection_lost', { 
        reason: 'Max reconnection attempts reached', 
        timestamp: new Date().toISOString() 
      });
    } else {
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected && this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }

  private handleMessage(message: SocketMessage): void {
    const listeners = this.eventListeners.get(message.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(message.data);
        } catch (error) {
          console.error(`Error in ${message.type} listener:`, error);
        }
      });
    }

    // Also emit to generic message listeners
    const genericListeners = this.eventListeners.get('message');
    if (genericListeners) {
      genericListeners.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in generic message listener:', error);
        }
      });
    }
  }

  // Event listener management
  on(event: string, callback: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.eventListeners.delete(event);
      return;
    }

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  private emit(event: string, data: any): void {
    this.handleMessage({ type: event as any, data });
  }

  // Socket status
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getStatus(): {
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

  onRouteUpdate(callback: (data: RouteUpdateMessage['data']) => void): () => void {
    return this.on('route_updated', callback);
  }

  onTruckStatusChange(callback: (data: TruckUpdateMessage['data']) => void): () => void {
    return this.on('truck_updated', callback);
  }

  onBinStatusChange(callback: (data: BinUpdateMessage['data']) => void): () => void {
    return this.on('bin_updated', callback);
  }

  onOptimizationComplete(callback: (data: OptimizationCompleteMessage['data']) => void): () => void {
    return this.on('optimization_complete', callback);
  }

  // Emit events to server
  emitToServer(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot emit event: socket not connected');
    }
  }

  // Server communication methods
  joinRoom(roomId: string): void {
    this.emitToServer('join_room', { room: roomId });
  }

  leaveRoom(roomId: string): void {
    this.emitToServer('leave_room', { room: roomId });
  }

  subscribeToTruck(truckId: string): void {
    this.emitToServer('subscribe_truck', { truck_id: truckId });
  }

  unsubscribeFromTruck(truckId: string): void {
    this.emitToServer('unsubscribe_truck', { truck_id: truckId });
  }

  subscribeToBin(binId: string): void {
    this.emitToServer('subscribe_bin', { bin_id: binId });
  }

  unsubscribeFromBin(binId: string): void {
    this.emitToServer('unsubscribe_bin', { bin_id: binId });
  }

  subscribeToSimulation(): void {
    this.emitToServer('subscribe_simulation');
  }

  unsubscribeFromSimulation(): void {
    this.emitToServer('unsubscribe_simulation');
  }

  subscribeToOptimization(): void {
    this.emitToServer('subscribe_optimization');
  }

  unsubscribeFromOptimization(): void {
    this.emitToServer('unsubscribe_optimization');
  }

  // Ping/pong for connection health
  ping(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const start = Date.now();
      
      this.socket.emit('ping', start, (response: number) => {
        const latency = Date.now() - start;
        resolve(latency);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);
    });
  }

  // Connection diagnostics
  async getDiagnostics(): Promise<{
    connected: boolean;
    latency?: number;
    reconnectAttempts: number;
    socketId?: string;
    transport?: string;
    error?: string;
  }> {
    const status = this.getStatus();
    
    try {
      const latency = await this.ping();
      
      return {
        ...status,
        latency,
        transport: this.socket?.io.engine.transport.name
      };
    } catch (error) {
      return {
        ...status,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Event history for debugging
  private eventHistory: Array<{ event: string; timestamp: number; data: any }> = [];
  private maxHistorySize = 100;

  private logEvent(event: string, data: any): void {
    this.eventHistory.push({
      event,
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(data)) // Deep clone
    });

    // Keep only the last N events
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  getEventHistory(eventType?: string): Array<{ event: string; timestamp: number; data: any }> {
    if (eventType) {
      return this.eventHistory.filter(entry => entry.event === eventType);
    }
    return [...this.eventHistory];
  }

  clearEventHistory(): void {
    this.eventHistory = [];
  }

  // Real-time data subscriptions with automatic cleanup
  createSubscription(events: string[], callback: (data: any) => void): () => void {
    const unsubscribeFns = events.map(event => this.on(event, callback));
    
    return () => {
      unsubscribeFns.forEach(fn => fn());
    };
  }

  // Batch event handling
  onMultiple(eventCallbacks: Record<string, Function>): () => void {
    const unsubscribeFns = Object.entries(eventCallbacks).map(([event, callback]) => 
      this.on(event, callback)
    );

    return () => {
      unsubscribeFns.forEach(fn => fn());
    };
  }
}

// Create and export singleton instance
const socketService = new SocketService();
export default socketService;