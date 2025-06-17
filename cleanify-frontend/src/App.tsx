import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import socketService from '@/services/socketService';
import { Toast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Layout Components
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

// Page Components
import { Dashboard } from '@/pages/Dashboard';
import { FleetManagement } from '@/pages/FleetManagement';
import { BinManagement } from '@/pages/BinManagement';
import { RouteOptimization } from '@/pages/RouteOptimization';
import { Analytics } from '@/pages/Analytics';
import { Settings } from '@/pages/Settings';

// Hooks
import { useToast } from '@/hooks/useToast';

import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    // Initialize socket connection
    const initializeApp = async () => {
      try {
        await socketService.connect();
        
        // Listen for connection status changes
        const unsubscribe = socketService.onConnectionChange(({ connected, reason }) => {
          if (connected) {
            showToast({
              type: 'success',
              title: 'Connected',
              message: 'Real-time connection established'
            });
          } else {
            showToast({
              type: 'error',
              title: 'Connection Lost',
              message: reason || 'Lost connection to server'
            });
          }
        });

        setIsLoading(false);

        return () => {
          unsubscribe();
          socketService.disconnect();
        };
      } catch (error) {
        console.error('Failed to initialize app:', error);
        showToast({
          type: 'error',
          title: 'Initialization Failed',
          message: 'Failed to connect to the server'
        });
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [showToast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <Provider store={store}>
      <ErrorBoundary>
        <Router>
          <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <Sidebar 
              isOpen={sidebarOpen} 
              onToggle={() => setSidebarOpen(!sidebarOpen)} 
            />

            {/* Main Content */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${
              sidebarOpen ? 'ml-64' : 'ml-20'
            }`}>
              {/* Header */}
              <Header 
                onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
                sidebarOpen={sidebarOpen}
              />

              {/* Page Content */}
              <main className="flex-1 p-6 overflow-auto">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/fleet" element={<FleetManagement />} />
                  <Route path="/bins" element={<BinManagement />} />
                  <Route path="/optimization" element={<RouteOptimization />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>

            {/* Toast Notifications */}
            <Toast />
          </div>
        </Router>
      </ErrorBoundary>
    </Provider>
  );
}

export default App;