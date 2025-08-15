import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, Loader, User, LogOut } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const BackendStatus: React.FC = () => {
  const { user, logout, isAuthenticated, token } = useAuth();
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [serverInfo, setServerInfo] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    checkConnection();
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    setStatus('checking');
    try {
      const health = await api.checkHealth();
      setStatus('connected');
      setServerInfo(`Backend: ${health.environment} mode`);
    } catch (error) {
      setStatus('disconnected');
      setServerInfo('Backend offline');
      console.error('Backend connection failed:', error);
    }
  };

  const testNotification = async () => {
    if (!user || !user.phoneNumber) {
      alert('Please log in and ensure your profile has a phone number to test SMS');
      return;
    }

    try {
      const result = await api.notifications.sendTest(
        token || '',
        user.phoneNumber
      );
      if (result.result && typeof result.result === 'object' && 'simulation' in result.result) {
        alert(`SMS Test ${result.result.simulation ? '(Simulated)' : ''}: ${result.message}\nCheck backend console for details.`);
      } else {
        alert(`SMS Test: ${result.message}`);
      }
    } catch (error) {
      alert(`SMS Test failed: ${error instanceof Error ? error.message : 'Backend may be offline'}`);
    }
  };

  const testSlackNotification = async () => {
    if (!user) {
      alert('Please log in to test Slack notifications');
      return;
    }

    // For testing, we'll send to the purchasing bot test channel
    const testTarget = '#purchasing-bot-test';
    
    try {
      const result = await api.slack.sendTest(
        token || '',
        testTarget
      );
      if (result.result && typeof result.result === 'object' && 'simulation' in result.result) {
        alert(`Slack Test ${result.result.simulation ? '(Simulated)' : ''}: ${result.message}\nCheck backend console for details.`);
      } else {
        alert(`Slack Test: ${result.message}`);
      }
    } catch (error) {
      alert(`Slack Test failed: ${error instanceof Error ? error.message : 'Backend may be offline'}`);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 z-40 space-y-2">
      {/* User Profile (if authenticated) */}
      {isAuthenticated && user && (
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="bg-white rounded-lg shadow-lg p-3 flex items-center space-x-2 border-2 border-blue-500 hover:bg-blue-50 transition-all duration-300"
          >
            <User className="w-5 h-5 text-blue-500" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-blue-700">{user.name}</span>
              <span className="text-xs text-gray-500 capitalize">{user.role}</span>
            </div>
          </button>
          
          {showUserMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border py-2 min-w-48">
              <div className="px-4 py-2 border-b">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Backend Status */}
      <div className={`
        bg-white rounded-lg shadow-lg p-3 flex items-center space-x-2
        ${status === 'connected' ? 'border-green-500' : status === 'disconnected' ? 'border-red-500' : 'border-gray-300'}
        border-2 transition-all duration-300
      `}>
        {status === 'checking' && (
          <>
            <Loader className="w-5 h-5 text-gray-500 animate-spin" />
            <span className="text-sm text-gray-600">Checking backend...</span>
          </>
        )}
        {status === 'connected' && (
          <>
            <Wifi className="w-5 h-5 text-green-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-green-700">Backend Connected</span>
              <span className="text-xs text-gray-500">{serverInfo}</span>
            </div>
            <div className="ml-2 flex space-x-1">
              <button
                onClick={testNotification}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Test SMS
              </button>
              <button
                onClick={testSlackNotification}
                className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              >
                Test Slack
              </button>
            </div>
          </>
        )}
        {status === 'disconnected' && (
          <>
            <WifiOff className="w-5 h-5 text-red-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-red-700">Backend Offline</span>
              <span className="text-xs text-gray-500">Start backend server</span>
            </div>
            <button
              onClick={checkConnection}
              className="ml-2 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BackendStatus;