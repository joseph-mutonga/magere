import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User, UserRole } from './types';
import Layout from './components/layout/Layout';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import StudentManagement from './components/StudentManagement';
import TeacherManagement from './components/TeacherManagement';
import LibraryManagement from './components/LibraryManagement';
import InventoryManagement from './components/InventoryManagement';
import ProtectedView from './components/common/ProtectedView';
import GradeManagement from './components/GradeManagement';
import ClassPerformance from './components/ClassPerformance';
import PastPapersManagement from './components/PastPapersManagement';
import DisciplineManagement from './components/DisciplineManagement';
import StudentPerformanceReport from './components/StudentPerformanceReport';

// This wrapper component handles the auth check and renders the main layout.
// The Layout component, in turn, renders an <Outlet /> for the nested child routes.
const PrivateRoutesWrapper: React.FC<{ currentUser: User | null; onLogout: () => void; }> = ({ currentUser, onLogout }) => {
    let location = useLocation();
    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <Layout currentUser={currentUser} onLogout={onLogout} />;
};

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('currentUser');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const handleLogin = (user: User, token: string) => {
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('authToken', token);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
    };

    return (
        <HashRouter>
            <Routes>
                <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />} />
                
                {/* All protected routes are now children of this route, which renders the layout */}
                <Route element={<PrivateRoutesWrapper currentUser={currentUser} onLogout={handleLogout} />}>
                    <Route path="/dashboard" element={<Dashboard currentUser={currentUser!} />} />

                    <Route path="/students" element={
                        <ProtectedView currentUser={currentUser} allowedRoles={[UserRole.ADMIN, UserRole.TEACHER, UserRole.REGISTRAR, UserRole.PRINCIPAL, UserRole.DEPUTY_PRINCIPAL]}>
                            <StudentManagement currentUser={currentUser!} />
                        </ProtectedView>
                    } />
                    
                    <Route path="/teachers" element={
                        <ProtectedView currentUser={currentUser} allowedRoles={[UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.DEPUTY_PRINCIPAL]}>
                            <TeacherManagement />
                        </ProtectedView>
                    } />

                    <Route path="/library" element={
                        <ProtectedView currentUser={currentUser} allowedRoles={[UserRole.ADMIN, UserRole.LIBRARIAN, UserRole.STUDENT, UserRole.PRINCIPAL]}>
                            <LibraryManagement currentUser={currentUser!} />
                        </ProtectedView>
                    } />
                    
                    <Route path="/inventory" element={
                        <ProtectedView currentUser={currentUser} allowedRoles={[UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.SECRETARY]}>
                            <InventoryManagement currentUser={currentUser!}/>
                        </ProtectedView>
                    } />
                    
                    <Route path="/grades" element={
                        <ProtectedView currentUser={currentUser} allowedRoles={[UserRole.TEACHER]}>
                            <GradeManagement currentUser={currentUser!} />
                        </ProtectedView>
                    } />

                    <Route path="/class-performance" element={
                        <ProtectedView currentUser={currentUser} allowedRoles={[UserRole.TEACHER]}>
                            <ClassPerformance currentUser={currentUser!} />
                        </ProtectedView>
                    } />

                    <Route path="/past-papers" element={
                        <ProtectedView currentUser={currentUser} allowedRoles={[UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.TEACHER, UserRole.STUDENT]}>
                            <PastPapersManagement currentUser={currentUser!} />
                        </ProtectedView>
                    } />
                    
                    <Route path="/discipline" element={
                        <ProtectedView currentUser={currentUser} allowedRoles={[UserRole.PRINCIPAL, UserRole.HOD, UserRole.ACADEMICS_DEPT, UserRole.DEPUTY_PRINCIPAL]}>
                            <DisciplineManagement currentUser={currentUser!} />
                        </ProtectedView>
                    } />
                    
                    <Route path="/performance-reports" element={
                        <ProtectedView currentUser={currentUser} allowedRoles={[UserRole.PRINCIPAL, UserRole.ACADEMICS_DEPT]}>
                            <StudentPerformanceReport />
                        </ProtectedView>
                    } />

                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
            </Routes>
        </HashRouter>
    );
};

export default App;