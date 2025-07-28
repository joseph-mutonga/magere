
import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, Subject, AttendanceRecord } from '../types';
import Modal from './common/Modal';
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from './common/Icons';
import * as api from '../services/api';

interface TeacherAttendanceCalendarProps {
  records: AttendanceRecord[];
}

const TeacherAttendanceCalendar: React.FC<TeacherAttendanceCalendarProps> = ({ records }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const attendanceDates = useMemo(() => {
        return new Set(records.map(r => r.date));
    }, [records]);

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        const blanks = Array(firstDayOfMonth).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon className="w-6 h-6" /></button>
                    <h3 className="text-lg font-semibold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon className="w-6 h-6" /></button>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-text-secondary mb-2">
                    {weekdays.map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {blanks.map((_, i) => <div key={`blank-${i}`} />)}
                    {days.map(day => {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isPresent = attendanceDates.has(dateStr);
                        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                        
                        return (
                            <div key={day} className={`relative p-2 h-16 flex flex-col items-center justify-center rounded-lg border
                                ${isToday ? 'border-brand-primary' : 'border-gray-200'}
                                ${isPresent ? 'bg-green-100' : 'bg-white'}`}>
                                <span className={`font-medium ${isToday ? 'text-brand-primary font-bold' : 'text-text-primary'}`}>{day}</span>
                                {isPresent && (
                                    <div className="absolute bottom-1 right-1">
                                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return renderCalendar();
};


const TeacherManagement: React.FC = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingAttendanceFor, setViewingAttendanceFor] = useState<Teacher | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [teachersData, subjectsData, attendanceData] = await Promise.all([
                    api.get('/teachers'),
                    api.get('/subjects'),
                    api.get('/attendance')
                ]);
                setTeachers(teachersData);
                setSubjects(subjectsData);
                setAttendance(attendanceData);
            } catch (err: any) {
                setError('Failed to fetch data. ' + err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const getSubjectNames = (subjectIds: string[]): string => {
        if (!subjectIds) return 'N/A';
        return subjectIds
            .map(id => subjects.find(s => s.id === id)?.name)
            .filter(Boolean)
            .join(', ');
    };

    const filteredTeachers = useMemo(() => {
        return teachers.filter(teacher =>
            teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [teachers, searchTerm]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary mb-2 sm:mb-0">Teacher Management</h1>
                 <div className="w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search by name or employee ID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    />
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                {isLoading ? (
                    <div className="text-center py-10">Loading teachers...</div>
                ) : error ? (
                    <div className="text-center py-10 text-red-500">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="p-4 font-semibold text-text-secondary">Name</th>
                                    <th className="p-4 font-semibold text-text-secondary">Employee ID</th>
                                    <th className="p-4 font-semibold text-text-secondary">Assigned Subjects</th>
                                    <th className="p-4 font-semibold text-text-secondary text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTeachers.map(teacher => (
                                    <tr key={teacher.id} className="border-b hover:bg-brand-light transition-colors">
                                        <td className="p-4 text-text-primary font-medium">{teacher.name}</td>
                                        <td className="p-4 text-text-secondary">{teacher.employeeId}</td>
                                        <td className="p-4 text-text-secondary">{getSubjectNames(teacher.subjectIds)}</td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => setViewingAttendanceFor(teacher)}
                                                className="bg-brand-secondary text-white px-3 py-1 text-sm rounded-md hover:bg-brand-dark transition-colors"
                                            >
                                                View Attendance
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredTeachers.length === 0 && (
                            <div className="text-center py-10 text-text-secondary">
                                <p>No teachers found matching your search.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <Modal isOpen={!!viewingAttendanceFor} onClose={() => setViewingAttendanceFor(null)} title={`Attendance Report for ${viewingAttendanceFor?.name}`}>
                {viewingAttendanceFor && (
                    <TeacherAttendanceCalendar 
                        records={attendance.filter(rec => rec.userType === 'teacher' && rec.userId === viewingAttendanceFor.id)}
                    />
                )}
            </Modal>
        </div>
    );
};

export default TeacherManagement;
