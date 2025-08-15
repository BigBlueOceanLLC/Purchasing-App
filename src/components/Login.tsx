import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import { LogIn, Mail, Lock, Eye, EyeOff, Info } from 'lucide-react';

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [testCredentials, setTestCredentials] = useState<{email: string; password: string; role: string}[]>([]);
  const [showTestCreds, setShowTestCreds] = useState(false);

  // Load test credentials for development
  useEffect(() => {
    const loadTestCreds = async () => {
      try {
        const result = await api.auth.getTestCredentials();
        setTestCredentials(result.credentials);
      } catch (error) {
        console.log('Test credentials not available');
      }
    };
    loadTestCreds();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      await login(email, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const fillCredentials = (cred: {email: string; password: string; role: string}) => {
    setEmail(cred.email);
    setPassword(cred.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 to-ocean-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-ocean-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-ocean-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to your Seafood Purchasing account</p>
          </div>

          {/* Test Credentials Info */}
          {testCredentials.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <button
                type="button"
                onClick={() => setShowTestCreds(!showTestCreds)}
                className="flex items-center space-x-2 text-blue-700 font-medium w-full"
              >
                <Info className="w-4 h-4" />
                <span>Test Accounts Available</span>
              </button>
              
              {showTestCreds && (
                <div className="mt-3 space-y-2">
                  {testCredentials.map((cred, index) => (
                    <button
                      key={index}
                      onClick={() => fillCredentials(cred)}
                      className="text-left w-full p-2 text-sm bg-white rounded border hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium">{cred.role.toUpperCase()}</div>
                      <div className="text-gray-600">{cred.email}</div>
                    </button>
                  ))}
                  <p className="text-xs text-blue-600 mt-2">
                    Click any account above to auto-fill credentials
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-ocean-600 hover:bg-ocean-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-ocean-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-600 text-sm">
            Seafood Purchasing Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;