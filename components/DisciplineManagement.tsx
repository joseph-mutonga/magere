
import React, { useState, useEffect, useMemo } from 'react';
import { Student, User, SuspensionRecord, SuspensionStatus } from '../types';
import * as api from '../services/api';

interface DisciplineManagementProps {
    currentUser: User;
}

const DisciplineManagement: React.FC<DisciplineManagementProps> = ({ currentUser }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [suspensions, setSuspensions] = useState<SuspensionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [foundStudent, setFoundStudent] = useState<Student | null>(null);
    
    const [suspensionDays, setSuspensionDays] = useState(3);
    const [reason, setReason] = useState('');
    const [punishment, setPunishment] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [formError, setFormError] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [studentsData, suspensionsData] = await Promise.all([
                api.get('/students'),
                api.get('/suspensions'),
            ]);
            setStudents(studentsData);
            setSuspensions(suspensionsData);
        } catch (err: any) {
            setError('Failed to load data. ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const activeSuspensions = useMemo(() => {
        return suspensions
            .filter(s => s.status === SuspensionStatus.ACTIVE)
            .map(suspension => {
                const student = students.find(s => s.id === suspension.studentId);
                const endDate = new Date(suspension.suspensionEndDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const diffTime = endDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return {
                    ...suspension,
                    studentName: student?.name || 'Unknown Student',
                    studentClass: student?.class || 'N/A',
                    admissionNumber: student?.admissionNumber || 'N/A',
                    daysRemaining: diffDays >= 0 ? diffDays : 0,
                };
            })
            .sort((a, b) => a.daysRemaining - b.daysRemaining);
    }, [suspensions, students]);

    const handleFindStudent = () => {
        setFormError('');
        setSuccessMessage('');
        setFoundStudent(null);

        const student = students.find(s => s.admissionNumber.toLowerCase() === searchTerm.toLowerCase());
        if (student) {
            setFoundStudent(student);
        } else {
            setFormError('Student with that admission number was not found.');
        }
    };

    const handleSubmitSuspension = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!foundStudent) return;

        setIsSubmitting(true);
        setFormError('');
        setSuccessMessage('');
        
        try {
            await api.post('/suspensions', {
                studentId: foundStudent.id,
                days: suspensionDays,
                reason,
                punishment,
            });
            setSuccessMessage(`Student ${foundStudent.name} has been suspended for ${suspensionDays} days.`);
            fetchData(); // Refresh the data to show the new suspension in the list
            // Reset form
            setFoundStudent(null);
            setSearchTerm('');
            setReason('');
            setPunishment('');
            setSuspensionDays(3);
        } catch (err: any) {
            setFormError('Failed to issue suspension: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="text-center p-10">Loading student data...</div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-500">{error}</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary mb-6">Discipline Management</h1>

            <div className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-4">Active Suspensions ({activeSuspensions.length})</h2>
                {activeSuspensions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeSuspensions.map(s => (
                            <div key={s.id} className="bg-red-50 border-2 border-red-200 p-4 rounded-lg shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-lg text-red-800">{s.studentName}</p>
                                        <p className="text-sm text-red-600">{s.admissionNumber} - {s.studentClass}</p>
                                    </div>
                                    <div className="text-center bg-red-600 text-white rounded-lg px-3 py-1">
                                        <p className="font-bold text-2xl">{s.daysRemaining}</p>
                                        <p className="text-xs uppercase tracking-wider">Days Left</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-red-200 space-y-2 text-sm">
                                    <p><strong className="font-semibold text-text-secondary">Expected Return:</strong> {s.suspensionEndDate}</p>
                                    <p><strong className="font-semibold text-text-secondary">Condition for Return:</strong> {s.punishment}</p>
                                    <p className="text-xs text-gray-500 pt-2"><strong className="font-semibold">Reason:</strong> {s.reason}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-text-secondary">There are no students currently on suspension.</p>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-bold text-text-primary mb-4">Issue New Suspension</h2>

                <div className="mb-6 max-w-lg">
                    <label htmlFor="admissionNumber" className="block text-sm font-medium text-gray-700 mb-1">Student Admission Number</label>
                    <div className="flex gap-2">
                        <input
                            id="admissionNumber"
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="e.g., S001"
                            className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                        />
                        <button
                            onClick={handleFindStudent}
                            className="bg-brand-secondary text-white px-6 py-2 rounded-md font-semibold hover:bg-brand-dark transition-colors"
                        >
                            Find Student
                        </button>
                    </div>
                </div>

                {formError && <p className="text-red-600 mb-4">{formError}</p>}
                {successMessage && <p className="text-green-600 font-semibold mb-4">{successMessage}</p>}


                {foundStudent && (
                    <form onSubmit={handleSubmitSuspension} className="border-t pt-6">
                        <div className="bg-brand-light p-4 rounded-lg mb-6">
                            <p className="font-semibold text-text-primary">Student Found:</p>
                            <p><span className="font-medium">{foundStudent.name}</span> ({foundStudent.class})</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="suspensionDays" className="block text-sm font-medium text-gray-700">Suspension Duration</label>
                                <select 
                                    id="suspensionDays" 
                                    value={suspensionDays} 
                                    onChange={(e) => setSuspensionDays(Number(e.target.value))}
                                    className="mt-1 block w-full max-w-xs px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                                >
                                    <option value={3}>3 Days</option>
                                    <option value={7}>7 Days (1 Week)</option>
                                    <option value={14}>14 Days (2 Weeks)</option>
                                    <option value={21}>21 Days (3 Weeks)</option>
                                </select>
                            </div>

                             <div>
                                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason for Suspension</label>
                                <textarea
                                    id="reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                                    placeholder="e.g., Gross misconduct, fighting, etc."
                                    required
                                ></textarea>
                            </div>
                             <div>
                                <label htmlFor="punishment" className="block text-sm font-medium text-gray-700">Assigned Task/Punishment</label>
                                <textarea
                                    id="punishment"
                                    value={punishment}
                                    onChange={(e) => setPunishment(e.target.value)}
                                    rows={3}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                                    placeholder="e.g., Report back with parent, write an apology letter, etc."
                                    required
                                ></textarea>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                             <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-red-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-400 border-2 border-red-700 ring-2 ring-red-300"
                            >
                                {isSubmitting ? 'Submitting...' : 'Issue Suspension'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default DisciplineManagement;
