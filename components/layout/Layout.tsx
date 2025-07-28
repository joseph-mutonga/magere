import React from 'react';
import { User, UserRole } from '../../types';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { DashboardIcon, StudentsIcon, TeachersIcon, LibraryIcon, InventoryIcon, LogoutIcon, ClipboardListIcon, DocumentTextIcon, ShieldExclamationIcon, ChartBarIcon } from '../common/Icons';
import ProtectedView from '../common/ProtectedView';
import { schoolLogoBase64 } from '../../services/logo';

const Sidebar: React.FC<{ currentUser: User, onLogout: () => void }> = ({ currentUser, onLogout }) => {

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon, roles: Object.values(UserRole) },
    { to: '/students', label: 'Students', icon: StudentsIcon, roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.PRINCIPAL, UserRole.REGISTRAR, UserRole.DEPUTY_PRINCIPAL] },
    { to: '/teachers', label: 'Teachers', icon: TeachersIcon, roles: [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.DEPUTY_PRINCIPAL] },
    { to: '/grades', label: 'Grades Management', icon: ClipboardListIcon, roles: [UserRole.TEACHER] },
    { to: '/library', label: 'Library', icon: LibraryIcon, roles: [UserRole.ADMIN, UserRole.LIBRARIAN, UserRole.STUDENT, UserRole.PRINCIPAL] },
    { to: '/inventory', label: 'Inventory', icon: InventoryIcon, roles: [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.SECRETARY] },
    { to: '/past-papers', label: 'Past Papers', icon: DocumentTextIcon, roles: [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER, UserRole.STUDENT] },
    { to: '/discipline', label: 'Discipline', icon: ShieldExclamationIcon, roles: [UserRole.PRINCIPAL, UserRole.DEPUTY_PRINCIPAL, UserRole.HOD, UserRole.ACADEMICS_DEPT] },
    { to: '/performance-reports', label: 'Performance Reports', icon: ChartBarIcon, roles: [UserRole.PRINCIPAL, UserRole.ACADEMICS_DEPT] },
  ];

  return (
    <aside className="w-64 bg-brand-primary text-white flex flex-col h-screen fixed z-20">
      <div className="p-4 border-b border-brand-dark flex justify-center items-center">
          <Link to="/dashboard">
              <img
                  src={schoolLogoBase64}
                  alt="School Logo"
                  className="max-h-16"
              />
          </Link>
      </div>
      <nav className="flex-grow p-4">
        <ul>
          {navLinks.map((link) => (
            <ProtectedView key={link.to} currentUser={currentUser} allowedRoles={link.roles}>
              <li>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => `flex items-center px-4 py-3 my-1 rounded-md transition-colors ${
                      isActive ? 'bg-brand-dark font-semibold' : 'hover:bg-brand-secondary'
                    }`
                  }
                >
                  <link.icon className="w-5 h-5 mr-3" />
                  {link.label}
                </NavLink>
              </li>
            </ProtectedView>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-brand-dark">
         <button
          onClick={onLogout}
          className="flex items-center w-full px-4 py-3 rounded-md text-left hover:bg-brand-secondary transition-colors"
        >
          <LogoutIcon className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </aside>
  );
};


const Header: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    return (
        <header className="bg-white shadow-sm p-4 flex justify-end items-center sticky top-0 z-10">
            <div className="text-right">
                <p className="font-semibold text-text-primary">{currentUser.name}</p>
                <p className="text-sm text-text-secondary">{currentUser.role}</p>
            </div>
        </header>
    );
};


interface LayoutProps {
  currentUser: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ currentUser, onLogout }) => {
  return (
    <div className="flex bg-bg-light min-h-screen">
      <Sidebar currentUser={currentUser} onLogout={onLogout} />
      <div className="ml-64 flex-grow flex flex-col">
        <Header currentUser={currentUser} />
        <main className="p-8 flex-grow">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
