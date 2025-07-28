import React, { useState, useMemo, useEffect } from 'react';
import { Student, User, UserRole, AttendanceRecord, BlackBookEntry, BlackBookStatus } from '../types';
import Modal from './common/Modal';
import { UserAddIcon, BookmarkAltIcon } from './common/Icons';
import * as api from '../services/api';

interface StudentManagementProps {
    currentUser: User;
}

const StudentManagement: React.FC<StudentManagementProps> = ({ currentUser }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [blackBookEntries, setBlackBookEntries] = useState<BlackBookEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Add Student Modal
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [newStudent, setNewStudent] = useState({ name: '', class: 'Form 1', dateOfBirth: '', parentPhoneNumber: '' });

    // Black Book Modal
    const [isBlackBookModalOpen, setBlackBookModalOpen] = useState(false);
    const [selectedStudentForBook, setSelectedStudentForBook] = useState<Student | null>(null);
    const [blackBookReason, setBlackBookReason] = useState('');


    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [studentsData, attendanceData, blackBookData] = await Promise.all([
                api.get('/students'),
                api.get('/attendance'),
                api.get('/black-book-entries')
            ]);
            setStudents(studentsData);
            setAttendance(attendanceData);
            setBlackBookEntries(blackBookData);
        } catch (err: any) {
            setError('Failed to fetch data. ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const studentTermAttendance = useMemo(() => {
        const TOTAL_TERM_DAYS = 44; // Approx school days in June & July for Term 2
        const termAttendanceMap = new Map<string, number>();
        
        // Assuming Term 2 is June (5) and July (6)
        const currentMonth = new Date().getMonth();
        const previousMonth = new Date(new Date().setMonth(currentMonth - 1)).getMonth();

        const termRecords = attendance.filter(rec => {
            const recDate = new Date(rec.date);
            const month = recDate.getMonth();
            return rec.userType === 'student' && (month === currentMonth || month === previousMonth);
        });

        students.forEach(student => {
            const studentPresentDays = new Set(termRecords.filter(rec => rec.userId === student.id).map(r => r.date)).size;
            const percentage = TOTAL_TERM_DAYS > 0 ? (studentPresentDays / TOTAL_TERM_DAYS) * 100 : 0;
            termAttendanceMap.set(student.id, percentage);
        });

        return termAttendanceMap;
    }, [attendance, students]);


    const canAddStudents = useMemo(() => {
        return [UserRole.ADMIN, UserRole.REGISTRAR, UserRole.PRINCIPAL].includes(currentUser.role);
    }, [currentUser]);

    const canUseBlackBook = useMemo(() => currentUser.role === UserRole.TEACHER, [currentUser]);

    const filteredStudents = useMemo(() => {
        return students.filter(student =>
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.class.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/students', newStudent);
            setNewStudent({ name: '', class: 'Form 1', dateOfBirth: '', parentPhoneNumber: '' });
            setAddModalOpen(false);
            fetchData(); // Refetch students to show the new one
        } catch (err: any) {
            alert('Failed to add student: ' + err.message);
        }
    };

    const handleOpenBlackBookModal = (student: Student) => {
        setSelectedStudentForBook(student);
        setBlackBookReason('');
        setBlackBookModalOpen(true);
    };

    const handleAddToBlackBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentForBook || !blackBookReason) return;
        try {
            await api.post('/black-book-entries', { studentId: selectedStudentForBook.id, reason: blackBookReason });
            setBlackBookModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert(`Failed to add to Black Book: ${err.message}`);
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-text-primary mb-2 sm:mb-0">Student Management</h1>
                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    />
                     {canAddStudents && (
                        <button onClick={() => setAddModalOpen(true)} className="bg-brand-primary text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-dark transition-colors flex items-center justify-center w-full sm:w-auto">
                            <UserAddIcon className="w-5 h-5 mr-2" />
                            Add New Student
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                {isLoading ? (
                    <div className="text-center py-10">Loading students...</div>
                ) : error ? (
                    <div className="text-center py-10 text-red-500">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="p-4 font-semibold text-text-secondary">Name</th>
                                    <th className="p-4 font-semibold text-text-secondary">Admission No.</th>
                                    <th className="p-4 font-semibold text-text-secondary">Class</th>
                                    <th className="p-4 font-semibold text-text-secondary">Term 2 Attendance</th>
                                    <th className="p-4 font-semibold text-text-secondary">Parent's Phone</th>
                                    {canUseBlackBook && <th className="p-4 font-semibold text-text-secondary text-center">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map(student => {
                                    const hasOpenCase = blackBookEntries.some(b => b.studentId === student.id && b.status === BlackBookStatus.OPEN);
                                    return (
                                        <tr key={student.id} className="border-b hover:bg-brand-light transition-colors">
                                            <td className="p-4 text-text-primary font-medium">{student.name}</td>
                                            <td className="p-4 text-text-secondary">{student.admissionNumber}</td>
                                            <td className="p-4 text-text-secondary">{student.class}</td>
                                            <td className="p-4 text-text-secondary font-semibold">
                                                {studentTermAttendance.get(student.id)?.toFixed(1) ?? 'N/A'}%
                                            </td>
                                            <td className="p-4 text-text-secondary">{student.parentPhoneNumber}</td>
                                            {canUseBlackBook && (
                                                <td className="p-4 text-center">
                                                    <button 
                                                        onClick={() => handleOpenBlackBookModal(student)} 
                                                        disabled={hasOpenCase}
                                                        className="bg-gray-700 text-white px-3 py-1 text-sm rounded-md font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center mx-auto disabled:bg-gray-400 disabled:cursor-not-allowed"
                                                        title={hasOpenCase ? 'Student has an open case' : 'Add to Black Book'}
                                                    >
                                                        <BookmarkAltIcon className="w-4 h-4 mr-2" />
                                                        Report
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredStudents.length === 0 && (
                            <div className="text-center py-10 text-text-secondary">
                                <p>No students found matching your search.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Register New Student">
                <form onSubmit={handleAddStudent} className="space-y-4">
                    <div>
                        <label htmlFor="studentName" className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" id="studentName" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" required />
                    </div>
                     <div>
                        <label htmlFor="studentClass" className="block text-sm font-medium text-gray-700">Class</label>
                        <select id="studentClass" value={newStudent.class} onChange={e => setNewStudent({...newStudent, class: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" required>
                            <option>Form 1</option>
                            <option>Form 2</option>
                            <option>Form 3</option>
                            <option>Form 4</option>
                   
                        </select>
                    </div>
                    <div>
                        <label htmlFor="studentDob" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        <input type="date" id="studentDob" value={newStudent.dateOfBirth} onChange={e => setNewStudent({...newStudent, dateOfBirth: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" required />
                    </div>
                    <div>
                        <label htmlFor="parentPhone" className="block text-sm font-medium text-gray-700">Parent's Phone Number</label>
                        <input type="tel" id="parentPhone" value={newStudent.parentPhoneNumber} onChange={e => setNewStudent({...newStudent, parentPhoneNumber: e.target.value})} placeholder="e.g. 07XXXXXXXX" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" required />
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button type="button" onClick={() => setAddModalOpen(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition-colors mr-2">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-dark transition-colors">Register Student</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isBlackBookModalOpen} onClose={() => setBlackBookModalOpen(false)} title={`Report ${selectedStudentForBook?.name}`}>
                <form onSubmit={handleAddToBlackBook} className="space-y-4">
                    <p>You are adding <span className="font-bold">{selectedStudentForBook?.name}</span> ({selectedStudentForBook?.class}) to the Black Book for follow-up by the Deputy Principal.</p>
                    <div>
                        <label htmlFor="blackBookReason" className="block text-sm font-medium text-gray-700">Reason for Report</label>
                        <textarea 
                            id="blackBookReason" 
                            value={blackBookReason} 
                            onChange={e => setBlackBookReason(e.target.value)} 
                            rows={4} 
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                            placeholder="Please provide a detailed explanation of the incident or behavior."
                            required
                        ></textarea>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button type="button" onClick={() => setBlackBookModalOpen(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold mr-2">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md font-semibold">Submit Report</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StudentManagement;