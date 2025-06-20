'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function Auth() {
  const { user, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">{user.email}</span>
        <button
          onClick={() => signOut()}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
      >
        {isSignUp ? 'Sign In' : 'Sign Up'}
      </button>

      <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg p-4 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors duration-200"
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
} 