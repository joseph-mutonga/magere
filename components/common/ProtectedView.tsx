
import React from 'react';
import { User, UserRole } from '../../types';

interface ProtectedViewProps {
  currentUser: User | null;
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

const ProtectedView: React.FC<ProtectedViewProps> = ({ currentUser, allowedRoles, children }) => {
  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return null; // Or a fallback component e.g., <p>You do not have permission to view this.</p>
  }

  return <>{children}</>;
};

export default ProtectedView;
