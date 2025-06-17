import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import socketService from '@/services/socketService';
import { setSocketConnection, updatePing } from '@/store/slices/uiSlice';
import { useToast } from './useToast';

interface UseSocketOptions {
  autoConnect?: boolean;
  reconnectOnMount?: boolean;
  showConnectionToasts?: boolean;
}

interface UseSocketReturn {
  isConnected: boolean;
  latency: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: Function) => () => void;
  ping: () => Promise<number>;
  getStatus: () => any;
}

export const useSocket = (options: UseSocketOptions = {}): UseSocketReturn => {
  const {
    autoConnect = true,
    reconnectOnMount = true,
    showConnectionToasts = true,
  } = options;

  const dispatch = useDispatch();
  const { showSuccess, showError } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Connection handlers
  const handleConnect = useCallback(() => {
    if (!mountedRef.current) return;

    setIsConnected(true);
    dispatch(setSocketConnection(true));

    if (showConnectionToasts) {
      showSuccess('Connected', 'Real-time connection established');
    }

    // Clear any pending reconnect attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [dispatch, showSuccess, showConnectionToasts]);

  const handleDisconnect = useCallback((reason?: string) => {
    if (!mountedRef.current) return;

    setIsConnected(false);
    dispatch(setSocketConnection(false));

    if (showConnectionToasts) {
      showError('Disconnected', reason || 'Lost connection to server');
    }

    // Attempt to reconnect if it wasn't a manual disconnect
    if (reconnectOnMount && reason !== 'manual') {
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && !socketService.connected) {
          connect();
        }
      }, 3000);
    }
  }, [dispatch, showError, showConnectionToasts, reconnectOnMount]);

  // Socket operations
  const connect = useCallback(async () => {
    try {
      await socketService.connect();
      handleConnect();
    } catch (error) {
      console.error('Failed to connect to socket:', error);
      handleDisconnect('connection_failed');
    }
  }, [handleConnect, handleDisconnect]);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    handleDisconnect('manual');
  }, [handleDisconnect]);

  const emit = useCallback((event: string, data?: any) => {
    socketService.emitToServer(event, data);
  }, []);

  const on = useCallback((event: string, callback: Function) => {
    return socketService.on(event, callback);
  }, []);

  const ping = useCallback(async (): Promise<number> => {
    try {
      const pingTime = await socketService.ping();
      setLatency(pingTime);
      dispatch(updatePing(pingTime));
      return pingTime;
    } catch (error) {
      console.error('Ping failed:', error);
      throw error;
    }
  }, [dispatch]);

  const getStatus = useCallback(() => {
    return socketService.getStatus();
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Set up connection status listeners
    const unsubscribeConnection = socketService.onConnectionChange(({ connected, reason }) => {
      if (connected) {
        handleConnect();
      } else {
        handleDisconnect(reason);
      }
    });

    return () => {
      unsubscribeConnection();
    };
  }, [autoConnect, connect, handleConnect, handleDisconnect]);

  // Periodic ping for latency monitoring
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      ping().catch(() => {
        // Ping failed, connection might be unstable
      });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected, ping]);

  return {
    isConnected,
    latency,
    connect,
    disconnect,
    emit,
    on,
    ping,
    getStatus,
  };
};

// Specialized hooks for specific socket events
export const useSimulationSocket = () => {
  const socket = useSocket();
  
  const onSimulationTick = useCallback((callback: (data: any) => void) => {
    return socketService.onSimulationTick(callback);
  }, []);

  const onSimulationEvent = useCallback((callback: (data: any) => void) => {
    return socketService.onSimulationEvent(callback);
  }, []);

  const subscribeToSimulation = useCallback(() => {
    socketService.subscribeToSimulation();
  }, []);

  const unsubscribeFromSimulation = useCallback(() => {
    socketService.unsubscribeFromSimulation();
  }, []);

  return {
    ...socket,
    onSimulationTick,
    onSimulationEvent,
    subscribeToSimulation,
    unsubscribeFromSimulation,
  };
};

export const useTruckSocket = (truckId?: string) => {
  const socket = useSocket();

  const onTruckUpdate = useCallback((callback: (data: any) => void) => {
    return socketService.onTruckStatusChange(callback);
  }, []);

  const subscribeToTruck = useCallback((id: string) => {
    socketService.subscribeToTruck(id);
  }, []);

  const unsubscribeFromTruck = useCallback((id: string) => {
    socketService.unsubscribeFromTruck(id);
  }, []);

  // Auto-subscribe to truck if ID provided
  useEffect(() => {
    if (truckId && socket.isConnected) {
      subscribeToTruck(truckId);
      return () => unsubscribeFromTruck(truckId);
    }
  }, [truckId, socket.isConnected, subscribeToTruck, unsubscribeFromTruck]);

  return {
    ...socket,
    onTruckUpdate,
    subscribeToTruck,
    unsubscribeFromTruck,
  };
};

export const useBinSocket = (binId?: string) => {
  const socket = useSocket();

  const onBinUpdate = useCallback((callback: (data: any) => void) => {
    return socketService.onBinStatusChange(callback);
  }, []);

  const subscribeToBin = useCallback((id: string) => {
    socketService.subscribeToBin(id);
  }, []);

  const unsubscribeFromBin = useCallback((id: string) => {
    socketService.unsubscribeFromBin(id);
  }, []);

  // Auto-subscribe to bin if ID provided
  useEffect(() => {
    if (binId && socket.isConnected) {
      subscribeToBin(binId);
      return () => unsubscribeFromBin(binId);
    }
  }, [binId, socket.isConnected, subscribeToBin, unsubscribeFromBin]);

  return {
    ...socket,
    onBinUpdate,
    subscribeToBin,
    unsubscribeFromBin,
  };
};

export const useOptimizationSocket = () => {
  const socket = useSocket();

  const onOptimizationComplete = useCallback((callback: (data: any) => void) => {
    return socketService.onOptimizationComplete(callback);
  }, []);

  const onRouteUpdate = useCallback((callback: (data: any) => void) => {
    return socketService.onRouteUpdate(callback);
  }, []);

  const subscribeToOptimization = useCallback(() => {
    socketService.subscribeToOptimization();
  }, []);

  const unsubscribeFromOptimization = useCallback(() => {
    socketService.unsubscribeFromOptimization();
  }, []);

  return {
    ...socket,
    onOptimizationComplete,
    onRouteUpdate,
    subscribeToOptimization,
    unsubscribeFromOptimization,
  };
};

export default useSocket;