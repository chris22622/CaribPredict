'use client';

import { useState } from 'react';
import { X, Mail, Lock, User as UserIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Sign up
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username || email.split('@')[0],
            },
          },
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          // Create user record in users table
          const { error: userError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              username: username || email.split('@')[0],
              balance_satoshis: 10000, // Give new users 10k sats to start
            });

          if (userError) {
            console.error('Error creating user record:', userError);
          }

          onSuccess();
          onClose();
        }
      } else {
        // Login
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-caribbean-gray-400 hover:text-caribbean-gray-600"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold text-caribbean-navy mb-2">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-caribbean-gray-600 mb-6">
          {mode === 'login'
            ? 'Sign in to start trading'
            : 'Join CaribPredict and get 10,000 sats!'}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-caribbean-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <UserIcon
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-caribbean-gray-400"
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full pl-10 pr-4 py-2 border border-caribbean-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-caribbean-blue"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-caribbean-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-caribbean-gray-400"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-2 border border-caribbean-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-caribbean-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-caribbean-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-caribbean-gray-400"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 border border-caribbean-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-caribbean-blue"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-caribbean-blue text-white py-3 rounded-lg font-semibold hover:bg-caribbean-teal transition-colors disabled:bg-caribbean-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="mt-6 text-center text-sm text-caribbean-gray-600">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-caribbean-blue hover:underline font-semibold"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-caribbean-blue hover:underline font-semibold"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
