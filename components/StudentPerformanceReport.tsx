import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Student, Grade, Subject } from '../types';
import Modal from './common/Modal';
import { PrintIcon, FilePdfIcon, FileExcelIcon } from './common/Icons';
import * as api from '../services/api';
import { schoolLogoBase64 } from '../services/logo';

interface StudentPerformance {
    student: Student;
    total: number;
    average: number;
    grades: Grade[];
    rank?: number;
}

// Reusable result slip component for the modal
const ResultSlip: React.FC<{ performance: StudentPerformance, subjects: Subject[] }> = ({ performance, subjects }) => {
    const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Unknown';
    return (
        <div className="p-4" id="result-slip">
            <div className="text-center mb-6 border-b pb-4">
                <img src={schoolLogoBase64} alt="School Logo" className="h-20 mx-auto mb-2" />
                <p className="text-text-secondary">Student Performance Slip</p>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
                <p><strong className="text-text-secondary">Student Name:</strong> {performance.student.name}</p>
                <p><strong className="text-text-secondary">Admission No:</strong> {performance.student.admissionNumber}</p>
                <p><strong className="text-text-secondary">Class:</strong> {performance.student.class}</p>
                <p><strong className="text-text-secondary">Overall Rank in Class:</strong> {performance.rank || 'N/A'}</p>
            </div>
            <table className="w-full text-left mb-6 text-sm">
                <thead><tr className="bg-gray-100"><th className="p-3 font-semibold">Subject</th><th className="p-3 font-semibold">Score</th><th className="p-3 font-semibold">Comment</th></tr></thead>
                <tbody>
                    {performance.grades.map(grade => (
                        <tr key={grade.id} className="border-b">
                            <td className="p-3">{getSubjectName(grade.subjectId)}</td>
                            <td className="p-3 font-semibold">{grade.score}</td>
                            <td className="p-3">{grade.score >= 80 ? 'Excellent' : grade.score >= 65 ? 'Good' : grade.score >= 50 ? 'Average' : 'Needs Improvement'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="grid grid-cols-2 gap-8 bg-brand-light p-4 rounded-lg">
                <div><p className="text-text-secondary">Total Marks</p><p className="text-2xl font-bold text-brand-dark">{performance.total}</p></div>
                <div><p className="text-text-secondary">Average Score</p><p className="text-2xl font-bold text-brand-dark">{performance.average.toFixed(2)}%</p></div>
            </div>
            <div className="mt-8 text-right"><button onClick={() => window.print()} className="bg-brand-primary text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-dark">Print Slip</button></div>
        </div>
    );
};

const StudentPerformanceReport: React.FC = () => {
    const [allGrades, setAllGrades] = useState<Grade[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedClass, setSelectedClass] = useState<string>('All');
    const [selectedTerm, setSelectedTerm] = useState('');
    const [selectedStudentSlip, setSelectedStudentSlip] = useState<StudentPerformance | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [gradesData, studentsData, subjectsData] = await Promise.all([
                    api.get('/grades'),
                    api.get('/students'),
                    api.get('/subjects'),
                ]);
                setAllGrades(gradesData);
                setAllStudents(studentsData);
                setAllSubjects(subjectsData);
                
                // Set default term if available
                const defaultTerm = Array.from(new Set((gradesData as Grade[]).map(g => g.term))).sort((a, b) => b.localeCompare(a))[0];
                if(defaultTerm) setSelectedTerm(defaultTerm);

            } catch (err: any) {
                setError('Failed to fetch performance data: ' + err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const availableClasses = useMemo(() => ['All', ...[...new Set(allStudents.map(s => s.class))].sort()], [allStudents]);
    const availableTerms = useMemo(() => Array.from(new Set(allGrades.map(g => g.term))).sort((a,b) => b.localeCompare(a)), [allGrades]);

    const performanceData = useMemo((): StudentPerformance[] => {
        const classStudents = selectedClass === 'All' ? allStudents : allStudents.filter(s => s.class === selectedClass);
        const termGrades = allGrades.filter(g => g.term === selectedTerm);

        const rankedStudents = classStudents.map(student => {
            const studentGrades = termGrades.filter(g => g.studentId === student.id);
            const total = studentGrades.reduce((sum, g) => sum + g.score, 0);
            const average = studentGrades.length > 0 ? total / studentGrades.length : 0;
            return { student, total, average, grades: studentGrades };
        }).sort((a, b) => b.total - a.total);
        
        // Add rank
        return rankedStudents.map((perf, index) => ({...perf, rank: index + 1}));

    }, [selectedClass, selectedTerm, allStudents, allGrades]);
    
    const summaryStats = useMemo(() => {
        if(performanceData.length === 0) return { mean: 0, high: 0, low: 0 };
        const averages = performanceData.map(p => p.average).filter(avg => avg > 0);
        if (averages.length === 0) return { mean: 0, high: 0, low: 0 };
        const mean = averages.reduce((a, b) => a + b, 0) / averages.length;
        const high = Math.max(...averages);
        const low = Math.min(...averages);
        return { mean, high, low };
    }, [performanceData]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        doc.addImage(schoolLogoBase64, 'PNG', 14, 10, 60, 15);
        doc.setFontSize(12);
        doc.text(`Performance Report - Class: ${selectedClass} - Term: ${selectedTerm}`, 14, 35);

        (doc as any).autoTable({
            startY: 45,
            head: [['Rank', 'Name', 'Adm No.', 'Class', 'Total Marks', 'Avg. (%)']],
            body: performanceData.map((perf) => [ perf.rank, perf.student.name, perf.student.admissionNumber, perf.student.class, perf.total, perf.average.toFixed(2) ]),
        });
        doc.save(`performance_report_${selectedClass}_${selectedTerm}.pdf`);
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(
            performanceData.map((perf) => ({
                Rank: perf.rank, Name: perf.student.name, 'Admission No.': perf.student.admissionNumber, Class: perf.student.class, 'Total Marks': perf.total, 'Average (%)': perf.average.toFixed(2)
            }))
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Performance");
        XLSX.writeFile(workbook, `performance_report_${selectedClass}_${selectedTerm}.xlsx`);
    };

    if (isLoading) return <div className="text-center p-10">Loading Performance Data...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div><h1 className="text-3xl font-bold text-text-primary">Student Performance Reports</h1><p className="text-text-secondary mt-1">Analyze performance across the school.</p></div>
                <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-2">
                    <button onClick={handleExportPDF} className="bg-red-600 text-white px-4 py-2 rounded-md font-semibold flex items-center justify-center w-full sm:w-auto"><FilePdfIcon className="w-5 h-5 mr-2" />PDF</button>
                    <button onClick={handleExportExcel} className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold flex items-center justify-center w-full sm:w-auto"><FileExcelIcon className="w-5 h-5 mr-2" />Excel</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-white px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-secondary"><option value="All">All Classes</option>{availableClasses.slice(1).map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="bg-white px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-secondary"><option value="" disabled>Select Term</option>{availableTerms.map(t => <option key={t} value={t}>{t}</option>)}</select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg"><p className="text-sm text-blue-800">Students</p><p className="text-2xl font-bold text-blue-900">{performanceData.length}</p></div>
                <div className="bg-green-50 p-4 rounded-lg"><p className="text-sm text-green-800">Class Average</p><p className="text-2xl font-bold text-green-900">{summaryStats.mean.toFixed(2)}%</p></div>
                <div className="bg-indigo-50 p-4 rounded-lg"><p className="text-sm text-indigo-800">Highest Average</p><p className="text-2xl font-bold text-indigo-900">{summaryStats.high.toFixed(2)}%</p></div>
                <div className="bg-orange-50 p-4 rounded-lg"><p className="text-sm text-orange-800">Lowest Average</p><p className="text-2xl font-bold text-orange-900">{summaryStats.low > 0 ? summaryStats.low.toFixed(2) : 'N/A'}%</p></div>
            </div>

            {performanceData.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-md border"><div className="overflow-x-auto"><table className="w-full text-left">
                    <thead><tr className="bg-gray-50 border-b"><th className="p-4 font-semibold">Rank</th><th className="p-4 font-semibold">Name</th><th className="p-4 font-semibold">Adm No.</th><th className="p-4 font-semibold">Class</th><th className="p-4 font-semibold">Avg. Score</th><th className="p-4 font-semibold text-center">Action</th></tr></thead>
                    <tbody>{performanceData.map((perf) => (<tr key={perf.student.id} className="border-b hover:bg-brand-light"><td className="p-4 font-bold text-center">{perf.rank}</td><td className="p-4 font-medium">{perf.student.name}</td><td className="p-4">{perf.student.admissionNumber}</td><td className="p-4">{perf.student.class}</td><td className="p-4 font-semibold">{perf.average.toFixed(2)}%</td><td className="p-4 text-center"><button onClick={() => setSelectedStudentSlip(perf)} className="bg-brand-secondary text-white px-3 py-1 text-sm rounded-md hover:bg-brand-dark">View Slip</button></td></tr>))}</tbody>
                </table></div></div>
            ) : ( <div className="text-center p-10 bg-white rounded-lg shadow-md"><h2 className="text-xl font-semibold">No Data Available</h2><p className="text-text-secondary mt-2">No grades found for the selected Class and Term.</p></div>)}

            <Modal isOpen={!!selectedStudentSlip} onClose={() => setSelectedStudentSlip(null)} title="Student Result Slip" size="lg">
                {selectedStudentSlip && <ResultSlip performance={selectedStudentSlip} subjects={allSubjects} />}
            </Modal>
        </div>
    );
};

export default StudentPerformanceReport;
