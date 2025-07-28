import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { User, Teacher, Student, Grade, Subject } from '../types';
import Modal from './common/Modal';
import { PrintIcon, FilePdfIcon, FileExcelIcon } from './common/Icons';
import * as api from '../services/api';
import { schoolLogoBase64 } from '../services/logo';


interface ClassPerformanceProps {
    currentUser: User;
}

interface StudentPerformance {
    student: Student;
    total: number;
    average: number;
    grades: Grade[];
}

interface PrintableReportProps {
    performanceData: StudentPerformance[];
    classInCharge: string;
    term: string;
    teacherName: string;
}

// This component is only visible when printing
const PrintableClassReport: React.FC<PrintableReportProps> = ({ performanceData, classInCharge, term, teacherName }) => {
    return (
        <div className="hidden print:block">
            <style>
                {`
                    @media print {
                        body {
                           -webkit-print-color-adjust: exact;
                           print-color-adjust: exact;
                        }
                        .no-print { display: none; }
                        .printable-area, .printable-area * { visibility: visible; }
                        .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
                        @page { size: A4; margin: 20mm; }
                    }
                `}
            </style>
            <div className="printable-area p-4">
                <div className="text-center mb-8 border-b pb-4 border-gray-300">
                    <img src={schoolLogoBase64} alt="School Logo" className="h-20 mx-auto mb-2" />
                    <p className="text-md text-text-secondary mt-1">Class Performance Report</p>
                </div>
                <div className="flex justify-between text-sm mb-6">
                    <p><strong>Class:</strong> {classInCharge}</p>
                    <p><strong>Exam:</strong> {term}</p>
                    <p><strong>Class Teacher:</strong> {teacherName}</p>
                </div>
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-2 border font-semibold">Rank</th>
                            <th className="p-2 border font-semibold">Name</th>
                            <th className="p-2 border font-semibold">Adm No.</th>
                            <th className="p-2 border font-semibold">Total Marks</th>
                            <th className="p-2 border font-semibold">Avg. (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {performanceData.map((perf, index) => (
                            <tr key={perf.student.id}>
                                <td className="p-2 border text-center">{index + 1}</td>
                                <td className="p-2 border">{perf.student.name}</td>
                                <td className="p-2 border">{perf.student.admissionNumber}</td>
                                <td className="p-2 border text-center">{perf.total}</td>
                                <td className="p-2 border text-center font-semibold">{perf.average.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <div className="mt-20 text-sm text-gray-600 flex justify-between">
                    <p>Signature: ................................</p>
                    <p>Date: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
};


const ClassPerformance: React.FC<ClassPerformanceProps> = ({ currentUser }) => {
    const [allGrades, setAllGrades] = useState<Grade[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedStudentSlip, setSelectedStudentSlip] = useState<StudentPerformance | null>(null);
    const [selectedTerm, setSelectedTerm] = useState('Term 2 Endterm');
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [gradesData, studentsData, subjectsData, teachersData] = await Promise.all([
                    api.get('/grades'),
                    api.get('/students'),
                    api.get('/subjects'),
                    api.get('/teachers')
                ]);
                setAllGrades(gradesData);
                setAllStudents(studentsData);
                setAllSubjects(subjectsData);
                setTeachers(teachersData);
            } catch (err: any) {
                setError('Failed to fetch performance data: ' + err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const teacher = useMemo(() => teachers.find(t => t.name === currentUser.name), [currentUser, teachers]);

     const availableTerms = useMemo(() => {
        const terms = new Set(allGrades.map(g => g.term));
        return Array.from(terms).sort((a,b) => b.localeCompare(a));
    }, [allGrades]);

    const performanceData = useMemo((): StudentPerformance[] => {
        if (!teacher || !teacher.classInCharge || !selectedTerm) return [];
        
        const classStudents = allStudents.filter(s => s.class === teacher.classInCharge);
        const termGrades = allGrades.filter(g => g.term === selectedTerm);
        
        const rankedStudents = classStudents.map(student => {
            const studentGrades = termGrades.filter(g => g.studentId === student.id);
            const total = studentGrades.reduce((sum, g) => sum + g.score, 0);
            const average = studentGrades.length > 0 ? total / studentGrades.length : 0;
            return { student, total, average, grades: studentGrades };
        });

        return rankedStudents.sort((a, b) => b.total - a.total);
    }, [teacher, selectedTerm, allStudents, allGrades]);

    const getSubjectName = (id: string) => allSubjects.find(s => s.id === id)?.name || 'Unknown Subject';

    const handlePrint = () => window.print();

    const handleExportPDF = () => {
        if(!teacher) return;
        const doc = new jsPDF();
        
        doc.addImage(schoolLogoBase64, 'PNG', 14, 10, 60, 15);

        doc.setFontSize(12);
        doc.text(`Class Performance Report - ${teacher.classInCharge} - ${selectedTerm}`, 14, 35);

        (doc as any).autoTable({
            startY: 45,
            head: [['Rank', 'Name', 'Admission No.', 'Total Marks', 'Average (%)']],
            body: performanceData.map((perf, index) => [
                index + 1,
                perf.student.name,
                perf.student.admissionNumber,
                perf.total,
                perf.average.toFixed(2)
            ]),
        });

        doc.save(`class_performance_${teacher.classInCharge}_${selectedTerm}.pdf`);
    };

    const handleExportExcel = () => {
        if(!teacher) return;
        const worksheet = XLSX.utils.json_to_sheet(
            performanceData.map((perf, index) => ({
                Rank: index + 1,
                Name: perf.student.name,
                'Admission No.': perf.student.admissionNumber,
                'Total Marks': perf.total,
                'Average (%)': perf.average.toFixed(2)
            }))
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Class Performance");
        XLSX.writeFile(workbook, `class_performance_${teacher.classInCharge}_${selectedTerm}.xlsx`);
    };

    if (isLoading) return <div className="text-center p-10">Loading Performance Data...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    if (!teacher || !teacher.classInCharge) {
        return (
             <div className="text-center p-10 bg-white rounded-lg shadow-md no-print">
                <h2 className="text-xl font-semibold text-text-primary">No Class Assigned</h2>
                <p className="text-text-secondary mt-2">You are not currently assigned as a class teacher.</p>
            </div>
        );
    }

    return (
        <div className="no-print">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Class Performance Report</h1>
                    <p className="text-text-secondary mt-1">Ranked results for {teacher.classInCharge}</p>
                </div>
                <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-2">
                    <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="bg-white px-4 py-2 border border-gray-300 rounded-md w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-brand-secondary">
                        <option value="" disabled>Select Exam</option>
                        {availableTerms.map(term => <option key={term} value={term}>{term}</option>)}
                    </select>
                    <button onClick={handlePrint} className="bg-gray-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center w-full sm:w-auto"><PrintIcon className="w-5 h-5 mr-2" />Print</button>
                    <button onClick={handleExportPDF} className="bg-red-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors flex items-center justify-center w-full sm:w-auto"><FilePdfIcon className="w-5 h-5 mr-2" />PDF</button>
                    <button onClick={handleExportExcel} className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 transition-colors flex items-center justify-center w-full sm:w-auto"><FileExcelIcon className="w-5 h-5 mr-2" />Excel</button>
                </div>
            </div>

            {performanceData.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="p-4 font-semibold text-text-secondary">Rank</th>
                                    <th className="p-4 font-semibold text-text-secondary">Name</th>
                                    <th className="p-4 font-semibold text-text-secondary">Admission No.</th>
                                    <th className="p-4 font-semibold text-text-secondary">Total Marks</th>
                                    <th className="p-4 font-semibold text-text-secondary">Average Score</th>
                                    <th className="p-4 font-semibold text-text-secondary text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performanceData.map((perf, index) => (
                                    <tr key={perf.student.id} className="border-b hover:bg-brand-light transition-colors">
                                        <td className="p-4 text-text-primary font-bold text-center">{index + 1}</td>
                                        <td className="p-4 text-text-primary font-medium">{perf.student.name}</td>
                                        <td className="p-4 text-text-secondary">{perf.student.admissionNumber}</td>
                                        <td className="p-4 text-text-secondary text-center">{perf.total}</td>
                                        <td className="p-4 text-text-primary font-semibold">{perf.average.toFixed(2)}%</td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => setSelectedStudentSlip(perf)} className="bg-brand-secondary text-white px-3 py-1 text-sm rounded-md hover:bg-brand-dark transition-colors">View Slip</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                 <div className="text-center p-10 bg-white rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-text-primary">No Data Available</h2>
                    <p className="text-text-secondary mt-2">
                        {selectedTerm ? `No grades found for ${selectedTerm}.` : "Please select an exam to view the report."}
                    </p>
                </div>
            )}
            
            <PrintableClassReport
                performanceData={performanceData}
                classInCharge={teacher.classInCharge}
                term={selectedTerm}
                teacherName={teacher.name}
            />

            <Modal isOpen={!!selectedStudentSlip} onClose={() => setSelectedStudentSlip(null)} title="Student Result Slip">
                {selectedStudentSlip && (
                     <div className="p-4" id="result-slip">
                        <div className="text-center mb-6 border-b pb-4">
                            <img src={schoolLogoBase64} alt="School Logo" className="h-20 mx-auto mb-2" />
                            <p className="text-text-secondary">{selectedTerm} Report</p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6">
                            <p><strong className="text-text-secondary">Student Name:</strong> {selectedStudentSlip.student.name}</p>
                            <p><strong className="text-text-secondary">Admission No:</strong> {selectedStudentSlip.student.admissionNumber}</p>
                            <p><strong className="text-text-secondary">Class:</strong> {selectedStudentSlip.student.class}</p>
                            <p><strong className="text-text-secondary">Class Teacher:</strong> {teacher.name}</p>
                        </div>
                        <table className="w-full text-left mb-6">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-3 font-semibold text-text-primary">Subject</th>
                                    <th className="p-3 font-semibold text-text-primary">Score</th>
                                    <th className="p-3 font-semibold text-text-primary">Comment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedStudentSlip.grades.map(grade => (
                                    <tr key={grade.id} className="border-b">
                                        <td className="p-3">{getSubjectName(grade.subjectId)}</td>
                                        <td className="p-3">{grade.score}</td>
                                        <td className="p-3 text-sm">{grade.score >= 80 ? 'Excellent' : grade.score >= 65 ? 'Good' : grade.score >= 50 ? 'Average' : 'Needs Improvement'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="grid grid-cols-2 gap-8 bg-brand-light p-4 rounded-lg">
                             <div>
                                <p className="text-text-secondary">Total Marks</p>
                                <p className="text-2xl font-bold text-brand-dark">{selectedStudentSlip.total}</p>
                            </div>
                             <div>
                                <p className="text-text-secondary">Average Score</p>
                                <p className="text-2xl font-bold text-brand-dark">{selectedStudentSlip.average.toFixed(2)}%</p>
                            </div>
                        </div>
                        <div className="mt-8 text-right">
                           <button onClick={() => window.print()} className="bg-brand-primary text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-dark transition-colors">Print Slip</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ClassPerformance;
