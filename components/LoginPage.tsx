
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import * as api from '../services/api';
import { schoolLogoBase64 } from '../services/logo';

interface LoginPageProps {
  onLogin: (user: User, token: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.ADMIN);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const fetchedUsers = await api.get('/users');
            setUsers(fetchedUsers);
            const firstUserOfRole = fetchedUsers.find((u: User) => u.role === selectedRole);
            if(firstUserOfRole) {
              setSelectedUserId(firstUserOfRole.id);
            }
        } catch (err) {
            setError('Failed to load user data. Is the API server running?');
        } finally {
            setIsLoading(false);
        }
    };
    fetchUsers();
  }, []);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as UserRole;
    setSelectedRole(role);
    const firstUserOfRole = users.find(u => u.role === role);
    setSelectedUserId(firstUserOfRole?.id || '');
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUserId(e.target.value);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) {
        setError('Please select a valid user.');
        return;
    }
    
    setIsLoading(true);
    setError('');

    try {
        const response = await api.login(selectedUser.name); 
        if (response.access_token && response.user) {
            onLogin(response.user, response.access_token);
        } else {
            setError('Login failed. Please try again.');
        }
    } catch (err: any) {
        setError(err.message || 'An unknown error occurred during login.');
    } finally {
        setIsLoading(false);
    }
  };

  const usersForSelectedRole = users.filter(u => u.role === selectedRole);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white shadow-2xl rounded-lg">
        <div>
          <img 
            src={schoolLogoBase64} 
            alt="Kitengela Magereza Mixed High School Logo"
            className="mx-auto mb-4"
          />
           <p className="mt-1 text-center text-sm text-text-secondary">
            Sign in to continue
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="role" className="sr-only">Role</label>
              <select
                id="role"
                name="role"
                value={selectedRole}
                onChange={handleRoleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary focus:z-10 sm:text-sm"
              >
                {Object.values(UserRole).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
               <label htmlFor="user" className="sr-only">User</label>
               <select
                id="user"
                name="user"
                value={selectedUserId}
                onChange={handleUserChange}
                disabled={usersForSelectedRole.length === 0 || isLoading}
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary focus:z-10 sm:text-sm"
              >
                {usersForSelectedRole.length > 0 ? (
                    usersForSelectedRole.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                    ))
                ) : (
                    <option>No users for this role</option>
                )}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={!selectedUserId || isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-gray-400"
            >
              {isLoading ? 'Loading...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
