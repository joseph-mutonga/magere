import React, { useState, useMemo, useEffect } from 'react';
import { User, Teacher, Subject, Student, Grade } from '../types';
import * as api from '../services/api';

interface GradeManagementProps {
    currentUser: User;
}

const GradeManagement: React.FC<GradeManagementProps> = ({ currentUser }) => {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [selectedTerm, setSelectedTerm] = useState('Term 2 Endterm');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [currentMarks, setCurrentMarks] = useState<Record<string, number | string>>({});
    const [successMessage, setSuccessMessage] = useState('');
    
    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [gradesData, studentsData, teachersData, subjectsData] = await Promise.all([
                api.get('/grades'),
                api.get('/students'),
                api.get('/teachers'),
                api.get('/subjects')
            ]);
            setGrades(gradesData);
            setStudents(studentsData);
            setTeachers(teachersData);
            setAllSubjects(subjectsData);
        } catch(err: any) {
            setError('Failed to fetch data. ' + err.message);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    const teacher = useMemo(() => teachers.find(t => t.name === currentUser.name), [teachers, currentUser]);
    
    const teacherSubjects = useMemo(() => {
        if (!teacher) return [];
        return allSubjects.filter(s => teacher.subjectIds.includes(s.id));
    }, [teacher, allSubjects]);
    
    const availableClasses = useMemo(() => {
        return [...new Set(students.map(s => s.class))].sort();
    }, [students]);

    const availableTerms = useMemo(() => {
        const hardcodedTerms = ['Term 1 Midterm', 'Term 1 Endterm', 'Term 2 Midterm', 'Term 2 Endterm', 'Term 3 Midterm', 'Term 3 Endterm'];
        const termsFromData = new Set(grades.map(g => g.term));
        const allTerms = new Set([...hardcodedTerms, ...Array.from(termsFromData)]);
        return Array.from(allTerms).sort();
    }, [grades]);

    useEffect(() => {
        // Set default subject if not set
        if (teacherSubjects.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(teacherSubjects[0].id);
        }
        // Set default class if not set
        if (availableClasses.length > 0 && !selectedClass) {
            if (teacher?.classInCharge && availableClasses.includes(teacher.classInCharge)) {
                setSelectedClass(teacher.classInCharge);
            } else {
                setSelectedClass(availableClasses[0]);
            }
        }
    }, [teacherSubjects, selectedSubjectId, availableClasses, selectedClass, teacher]);
    
    useEffect(() => {
        if (selectedSubjectId && selectedTerm) {
            const marksForSubjectAndTerm = grades.reduce((acc, grade) => {
                if (grade.subjectId === selectedSubjectId && grade.term === selectedTerm) {
                    acc[grade.studentId] = grade.score;
                }
                return acc;
            }, {} as Record<string, number>);
            setCurrentMarks(marksForSubjectAndTerm);
        }
    }, [selectedSubjectId, selectedTerm, grades]);
    
    const filteredStudents = useMemo(() => {
        if (!selectedClass) {
            return [];
        }
        return students.filter(student => student.class === selectedClass);
    }, [students, selectedClass]);
    
    const handleMarkChange = (studentId: string, score: string) => {
        if (score === '') {
            setCurrentMarks(prev => ({ ...prev, [studentId]: '' }));
            return;
        }
        
        const numericScore = parseInt(score, 10);
        if (!isNaN(numericScore) && numericScore >= 0 && numericScore <= 100) {
            setCurrentMarks(prev => ({ ...prev, [studentId]: numericScore }));
        }
    };
    
    const handleSaveChanges = async () => {
        // Only consider students from the selected class
        const studentsInClass = new Set(filteredStudents.map(s => s.id));
        
        const gradesToUpdate: Omit<Grade, 'id'>[] = [];
        
        Object.entries(currentMarks).forEach(([studentId, score]) => {
            // Check if the student is in the current class and has a valid score
            if (studentsInClass.has(studentId) && score !== '' && score !== null && score !== undefined) {
                gradesToUpdate.push({
                    studentId: studentId,
                    subjectId: selectedSubjectId,
                    score: score as number,
                    term: selectedTerm,
                    year: new Date().getFullYear(),
                });
            }
        });
        
        if (gradesToUpdate.length === 0) {
            setSuccessMessage("No changes to save for the selected class.");
            setTimeout(() => setSuccessMessage(''), 3000);
            return;
        }

        try {
            await api.post('/grades/bulk-update', { grades: gradesToUpdate });
            setSuccessMessage('Marks saved successfully!');
            fetchData(); // Refetch grades
        } catch (err: any) {
            setSuccessMessage('');
            alert('Failed to save changes: ' + err.message);
        } finally {
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    if (isLoading) return <div>Loading...</div>
    if (error) return <div className="text-red-500">{error}</div>
    if (!teacher) return <p>Teacher profile not found.</p>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-text-primary">Grades Management</h1>
                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                     <select
                        value={selectedClass}
                        onChange={e => setSelectedClass(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    >
                         {availableClasses.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                    <select
                        value={selectedTerm}
                        onChange={e => setSelectedTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    >
                        {availableTerms.map(term => (
                            <option key={term} value={term}>{term}</option>
                        ))}
                    </select>
                    <select
                        id="subject-select"
                        value={selectedSubjectId}
                        onChange={e => setSelectedSubjectId(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                    >
                        {teacherSubjects.map(subject => (
                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="p-4 font-semibold text-text-secondary w-1/3">Student Name</th>
                                <th className="p-4 font-semibold text-text-secondary w-1/3">Admission No.</th>
                                <th className="p-4 font-semibold text-text-secondary w-1/3">Score (out of 100)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student.id} className="border-b hover:bg-brand-light transition-colors">
                                    <td className="p-4 text-text-primary font-medium">{student.name}</td>
                                    <td className="p-4 text-text-secondary">{student.admissionNumber}</td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={currentMarks[student.id] ?? ''}
                                            onChange={(e) => handleMarkChange(student.id, e.target.value)}
                                            className="px-3 py-1 border border-gray-300 rounded-md w-24 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                                            placeholder="N/A"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredStudents.length === 0 && selectedClass && (
                        <div className="text-center py-10 text-text-secondary">
                            <p>No students found for {selectedClass}.</p>
                        </div>
                    )}
                </div>
                 <div className="mt-6 flex justify-between items-center">
                    {successMessage && <p className="text-green-600 font-semibold">{successMessage}</p>}
                    <button 
                        onClick={handleSaveChanges}
                        className="bg-brand-primary text-white px-6 py-2 rounded-md font-semibold hover:bg-brand-dark transition-colors ml-auto"
                    >
                        Save Changes
                    </button>
                 </div>
            </div>
        </div>
    );
};

export default GradeManagement;