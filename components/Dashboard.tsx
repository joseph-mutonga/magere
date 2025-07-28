


import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { User, UserRole, Grade, LeaveRequest as LeaveRequestType, Student, Teacher, Subject, AttendanceRecord, InventoryItem, IssuedInventory, InventoryRequest, Book, LibraryTransaction, InventoryCategory, TimecFile, PastPaper, ExerciseBookStock, ExerciseBookIssue, SuspensionRecord, SuspensionStatus, BlackBookEntry, BlackBookStatus } from '../types';
import { StudentsIcon, TeachersIcon, LibraryIcon, InventoryIcon, TrendingUpIcon, ClipboardListIcon, CalendarIcon, ClipboardCheckIcon, PrintIcon, PaperAirplaneIcon, CheckCircleIcon, XCircleIcon, UserAddIcon, FolderAddIcon, BookOpenIcon, ExclamationCircleIcon, TrendingDownIcon, DocumentArrowUpIcon, DownloadIcon, DocumentTextIcon, ShieldExclamationIcon, ChartBarIcon, TrophyIcon, BookmarkAltIcon } from './common/Icons';
import AIAssistant from './AIAssistant';
import { Link, useNavigate } from 'react-router-dom';
import Modal from './common/Modal';
import * as api from '../services/api';
import { schoolLogoBase64 } from '../services/logo';


// Helper Components
const DashboardCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; subtext?: string; action?: React.ReactNode; }> = ({ title, value, icon, subtext, action }) => (
  <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-between border border-gray-200 hover:shadow-lg transition-shadow">
    <div className="flex items-center">
        <div className="bg-brand-light p-3 rounded-full mr-4">{icon}</div>
        <div>
        <p className="text-sm text-text-secondary font-medium">{title}</p>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        {subtext && <p className="text-xs text-text-secondary">{subtext}</p>}
        </div>
    </div>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const DashboardStatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color?: string; }> = ({ label, value, icon, color = 'bg-gray-100' }) => (
    <div className={`p-4 rounded-lg flex items-center ${color}`}>
        <div className="mr-3">{icon}</div>
        <div>
            <p className="text-xs font-semibold uppercase text-text-secondary">{label}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
    </div>
);

const TodaysAttendanceReport: React.FC<{ presentStudents: (Student & { timeIn: string })[]; presentTeachers: (Teacher & { timeIn: string })[]; getSubjectNames: (subjectIds: string[]) => string; }> = ({ presentStudents, presentTeachers, getSubjectNames }) => {
    const handlePrint = () => window.print();
    return (
        <div>
            <style>{`@media print { body * { visibility: hidden; } .printable-area, .printable-area * { visibility: visible; } .printable-area { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none; } @page { size: A4; margin: 20mm; } }`}</style>
             <div id="attendance-report" className="printable-area">
                <div className="text-center mb-8 hidden print:block">
                    <img src={schoolLogoBase64} alt="School Logo" className="h-20 mx-auto" />
                    <p className="font-bold mt-2">Daily Attendance Report - {new Date().toLocaleDateString()}</p>
                </div>
                <div className="mb-8">
                    <h4 className="text-xl font-bold text-text-primary mb-3">Present Students ({presentStudents.length})</h4>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-3 font-semibold text-text-secondary">Name</th><th className="p-3 font-semibold text-text-secondary">Admission No.</th><th className="p-3 font-semibold text-text-secondary">Class</th><th className="p-3 font-semibold text-text-secondary">Time In</th></tr></thead>
                            <tbody>{presentStudents.map(student => (<tr key={student.id} className="border-t"><td className="p-3">{student.name}</td><td className="p-3">{student.admissionNumber}</td><td className="p-3">{student.class}</td><td className="p-3">{student.timeIn}</td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <h4 className="text-xl font-bold text-text-primary mb-3">Present Teachers ({presentTeachers.length})</h4>
                     <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-3 font-semibold text-text-secondary">Name</th><th className="p-3 font-semibold text-text-secondary">Employee ID</th><th className="p-3 font-semibold text-text-secondary">Subjects</th><th className="p-3 font-semibold text-text-secondary">Time In</th></tr></thead>
                            <tbody>{presentTeachers.map(teacher => (<tr key={teacher.id} className="border-t"><td className="p-3">{teacher.name}</td><td className="p-3">{teacher.employeeId}</td><td className="p-3">{getSubjectNames(teacher.subjectIds)}</td><td className="p-3">{teacher.timeIn}</td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            </div>
             <button onClick={handlePrint} className="mt-6 bg-brand-secondary text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-dark transition-colors flex items-center no-print"><PrintIcon className="w-5 h-5 mr-2" />Print Report</button>
        </div>
    );
};

const LeaveRequestManager: React.FC<{ requests: (LeaveRequestType & { teacherName?: string })[]; onRespond: (id: string, status: 'Approved' | 'Rejected', comment?: string) => Promise<void>; }> = ({ requests, onRespond }) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<(LeaveRequestType & { teacherName?: string }) | null>(null);
    const pendingRequests = requests.filter(r => r.status === 'Pending');
    if (pendingRequests.length === 0) return <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200"><CheckCircleIcon className="w-10 h-10 mx-auto text-green-400" /><p className="mt-2 text-sm font-semibold text-green-700">No Pending Leave Requests</p><p className="text-xs text-green-600">All requests have been addressed.</p></div>;
    const handleApprove = (id: string) => onRespond(id, 'Approved', 'Approved');
    const handleReject = () => { if (selectedRequest) { onRespond(selectedRequest.id, 'Rejected', rejectionReason || 'Rejected without comment'); setSelectedRequest(null); setRejectionReason(''); } };
    return (
        <div className="space-y-4">
            {pendingRequests.map(req => (
                <div key={req.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-text-primary">{req.teacherName || 'Unknown Teacher'}</p>
                            <p className="text-sm text-text-secondary">Requesting leave from <span className="font-medium">{new Date(req.leaveStartDate).toLocaleDateString()}</span> to <span className="font-medium">{new Date(req.leaveEndDate).toLocaleDateString()}</span></p>
                            <p className="text-sm mt-2 p-2 bg-gray-50 rounded-md"><span className="font-semibold">Reason:</span> {req.reason}</p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                            <button onClick={() => handleApprove(req.id)} className="bg-green-500 text-white px-3 py-1 text-sm rounded-md font-semibold hover:bg-green-600 transition-colors"><CheckCircleIcon className="w-4 h-4 inline mr-1" />Approve</button>
                            <button onClick={() => setSelectedRequest(req)} className="bg-red-500 text-white px-3 py-1 text-sm rounded-md font-semibold hover:bg-red-600 transition-colors"><XCircleIcon className="w-4 h-4 inline mr-1" />Reject</button>
                        </div>
                    </div>
                </div>
            ))}
            <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title={`Reject leave for ${selectedRequest?.teacherName}`}>
                <div className="space-y-4"><p>Please provide a reason for rejecting this leave request.</p><textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} className="w-full p-2 border rounded-md" placeholder="e.g., Critical time of the semester." /><div className="flex justify-end gap-2"><button onClick={() => setSelectedRequest(null)} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button><button onClick={handleReject} className="bg-red-600 text-white px-4 py-2 rounded-md">Confirm Rejection</button></div></div>
            </Modal>
        </div>
    );
};

const InventoryRequestManager: React.FC<{ requests: InventoryRequest[]; onRespond: (id: string, action: 'approve' | 'reject', reason?: string) => Promise<void>; }> = ({ requests, onRespond }) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<InventoryRequest | null>(null);
    const pendingRequests = requests.filter(r => r.status === 'Pending');
    if (pendingRequests.length === 0) return <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200"><CheckCircleIcon className="w-10 h-10 mx-auto text-green-400" /><p className="mt-2 text-sm font-semibold text-green-700">No Pending Inventory Requests</p></div>;
    const handleApprove = (id: string) => onRespond(id, 'approve');
    const handleReject = () => { if (selectedRequest) { onRespond(selectedRequest.id, 'reject', rejectionReason); setSelectedRequest(null); setRejectionReason(''); } };
    return (
        <div className="space-y-4">
            {pendingRequests.map(req => (
                <div key={req.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                     <p className="font-bold text-text-primary">{req.teacher_name || 'Unknown'}</p><p className="text-sm text-text-secondary">Requests <span className="font-bold">{req.quantity}</span> of <span className="font-medium">{req.item_name || 'Unknown Item'}</span></p>
                    <div className="mt-4 flex justify-end gap-2"><button onClick={() => handleApprove(req.id)} className="bg-green-500 text-white px-3 py-1 text-sm rounded-md font-semibold hover:bg-green-600">Approve</button><button onClick={() => setSelectedRequest(req)} className="bg-red-500 text-white px-3 py-1 text-sm rounded-md font-semibold hover:bg-red-600">Reject</button></div>
                </div>
            ))}
             <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title={`Reject request for ${selectedRequest?.item_name}`}>
                <div className="space-y-4"><p>Please provide a reason for rejecting this inventory request.</p><textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} className="w-full p-2 border rounded-md" placeholder="e.g., Out of stock." /><div className="flex justify-end gap-2"><button onClick={() => setSelectedRequest(null)} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button><button onClick={handleReject} className="bg-red-600 text-white px-4 py-2 rounded-md">Confirm Rejection</button></div></div>
            </Modal>
        </div>
    );
};

const TimecFileViewer: React.FC<{ files: (TimecFile & { uploaderName?: string })[] }> = ({ files }) => {
    const downloadFile = (base64Content: string, fileName: string) => { const byteCharacters = atob(base64Content); const byteNumbers = new Array(byteCharacters.length); for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); } const byteArray = new Uint8Array(byteNumbers); const mimeType = fileName.endsWith('.pdf') ? 'application/pdf' : 'application/msword'; const blob = new Blob([byteArray], { type: mimeType }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
    if (files.length === 0) return <p>No TIMEC documents have been uploaded yet.</p>;
    return (
        <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 border-b"><tr><th className="p-3 font-semibold text-text-secondary">Title</th><th className="p-3 font-semibold text-text-secondary">Uploaded By</th><th className="p-3 font-semibold text-text-secondary">Date</th><th className="p-3 font-semibold text-text-secondary text-center">Action</th></tr></thead>
                <tbody>{files.map(file => (<tr key={file.id} className="border-b hover:bg-brand-light"><td className="p-3 font-medium">{file.title}</td><td className="p-3">{file.uploaderName || 'N/A'}</td><td className="p-3">{file.uploadDate}</td><td className="p-3 text-center"><button onClick={() => downloadFile(file.fileContent, file.fileName)} className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"><DownloadIcon className="w-5 h-5"/></button></td></tr>))}</tbody>
            </table>
        </div>
    );
};

const ExerciseBookStockViewer: React.FC<{ stock: (ExerciseBookStock & { subjectName?: string })[] }> = ({ stock }) => (
    <div className="overflow-y-auto max-h-96"><table className="w-full text-left"><thead className="bg-gray-50 border-b sticky top-0"><tr><th className="p-3 font-semibold text-text-secondary">Subject</th><th className="p-3 font-semibold text-text-secondary text-center">Remaining Stock</th><th className="p-3 font-semibold text-text-secondary">Last Issued</th></tr></thead>
            <tbody>{stock.sort((a,b) => a.quantity - b.quantity).map(s => (<tr key={s.id} className="border-b hover:bg-brand-light"><td className="p-3 font-medium">{s.subjectName}</td><td className={`p-3 text-center font-bold ${s.quantity < 50 ? 'text-red-600' : 'text-text-primary'}`}>{s.quantity}</td><td className="p-3">{s.lastIssuedDate || 'N/A'}</td></tr>))}</tbody>
        </table>
    </div>
);

const ExerciseBookIssueLogViewer: React.FC<{ issues: ExerciseBookIssue[], subjects: Subject[] }> = ({ issues, subjects }) => (
    <div className="overflow-y-auto max-h-96"><table className="w-full text-left"><thead className="bg-gray-50 border-b sticky top-0"><tr><th className="p-3 font-semibold text-text-secondary">Date</th><th className="p-3 font-semibold text-text-secondary">Student</th><th className="p-3 font-semibold text-text-secondary">Subject</th><th className="p-3 font-semibold text-text-secondary text-center">Quantity</th></tr></thead>
            <tbody>{issues.slice().reverse().map(issue => (<tr key={issue.id} className="border-b hover:bg-brand-light"><td className="p-3">{issue.issueDate}</td><td className="p-3 font-medium">{issue.studentName}</td><td className="p-3">{subjects.find(s => s.id === issue.subjectId)?.name || 'N/A'}</td><td className="p-3 text-center">{issue.quantity}</td></tr>))}</tbody>
        </table>
    </div>
);

const SuspensionViewer: React.FC<{ suspensions: (SuspensionRecord & { studentName?: string; studentClass?: string; })[] }> = ({ suspensions }) => {
    const [filter, setFilter] = useState<'Active' | 'Completed' | 'All'>('Active');
    const [searchTerm, setSearchTerm] = useState('');
    const filteredSuspensions = useMemo(() => suspensions.filter(s => (filter === 'All' || s.status === filter) && (searchTerm === '' || s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()))), [suspensions, filter, searchTerm]);
    return (
        <div>
            <div className="flex gap-4 mb-4 items-center"><select value={filter} onChange={e => setFilter(e.target.value as any)} className="p-2 border rounded-md"><option value="Active">Active Suspensions</option><option value="Completed">Completed</option><option value="All">All Records</option></select><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by student name..." className="p-2 border rounded-md flex-grow" /></div>
            <div className="overflow-y-auto max-h-96 border rounded-lg"><table className="w-full text-left"><thead className="bg-gray-50 border-b sticky top-0"><tr><th className="p-3 font-semibold text-text-secondary">Student</th><th className="p-3 font-semibold text-text-secondary">Reason</th><th className="p-3 font-semibold text-text-secondary">Suspended On</th><th className="p-3 font-semibold text-text-secondary">Reports Back</th><th className="p-3 font-semibold text-text-secondary">Status</th></tr></thead>
                    <tbody>{filteredSuspensions.length > 0 ? filteredSuspensions.map(s => (<tr key={s.id} className="border-b hover:bg-brand-light"><td className="p-3 font-medium">{s.studentName} ({s.studentClass})</td><td className="p-3 text-sm">{s.reason}</td><td className="p-3">{s.suspensionStartDate}</td><td className="p-3">{s.suspensionEndDate}</td><td className="p-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${s.status === 'Active' ? 'text-red-800 bg-red-100 border-2 border-red-300' : 'text-gray-800 bg-gray-200'}`}>{s.status}</span></td></tr>)) : (<tr><td colSpan={5} className="text-center p-6 text-text-secondary">No records match your filters.</td></tr>)}</tbody>
                </table>
            </div>
        </div>
    );
};

const BlackBookManager: React.FC<{
    entries: (BlackBookEntry & { reportedByName?: string; studentName?: string; studentClass?: string; resolvedByName?: string; })[];
    onResolve: (entryId: string, resolutionNotes: string) => Promise<void>;
}> = ({ entries, onResolve }) => {
    const [activeTab, setActiveTab] = useState<'Open' | 'Resolved'>('Open');
    const [selectedEntry, setSelectedEntry] = useState<BlackBookEntry | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    
    const openCases = useMemo(() => entries.filter(e => e.status === BlackBookStatus.OPEN).sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()), [entries]);
    const resolvedCases = useMemo(() => entries.filter(e => e.status === BlackBookStatus.RESOLVED).sort((a, b) => new Date(b.resolutionDate!).getTime() - new Date(a.resolutionDate!).getTime()), [entries]);

    const handleResolve = () => {
        if (selectedEntry && resolutionNotes) {
            onResolve(selectedEntry.id, resolutionNotes).then(() => {
                setSelectedEntry(null);
                setResolutionNotes('');
            });
        }
    };

    return (
        <div>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('Open')} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'Open' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Open Cases
                        {openCases.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">{openCases.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('Resolved')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'Resolved' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Resolved Cases
                    </button>
                </nav>
            </div>
            <div className="overflow-x-auto max-h-[30rem] mt-4">
                {activeTab === 'Open' ? (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 sticky top-0"><tr><th className="p-3 font-semibold">Student</th><th className="p-3 font-semibold">Reported By</th><th className="p-3 font-semibold">Reason</th><th className="p-3 font-semibold">Date</th><th className="p-3 font-semibold text-center">Action</th></tr></thead>
                        <tbody>
                            {openCases.length > 0 ? openCases.map(entry => (
                                <tr key={entry.id} className="border-b">
                                    <td className="p-3 font-medium">{entry.studentName} ({entry.studentClass})</td>
                                    <td className="p-3">{entry.reportedByName}</td>
                                    <td className="p-3 max-w-sm whitespace-pre-wrap">{entry.reason}</td>
                                    <td className="p-3">{entry.reportDate}</td>
                                    <td className="p-3 text-center"><button onClick={() => setSelectedEntry(entry)} className="bg-green-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-green-600">Resolve</button></td>
                                </tr>
                            )) : <tr><td colSpan={5} className="text-center p-6 text-text-secondary">No open cases.</td></tr>}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 sticky top-0"><tr><th className="p-3 font-semibold">Student</th><th className="p-3 font-semibold">Reason</th><th className="p-3 font-semibold">Resolution</th><th className="p-3 font-semibold">Resolved By</th><th className="p-3 font-semibold">Dates</th></tr></thead>
                        <tbody>
                            {resolvedCases.length > 0 ? resolvedCases.map(entry => (
                                <tr key={entry.id} className="border-b bg-green-50/30">
                                    <td className="p-3 font-medium">{entry.studentName} ({entry.studentClass})</td>
                                    <td className="p-3 max-w-xs whitespace-pre-wrap">{entry.reason}</td>
                                    <td className="p-3 max-w-xs whitespace-pre-wrap">{entry.resolutionNotes}</td>
                                    <td className="p-3">{entry.resolvedByName}</td>
                                    <td className="p-3">Reported: {entry.reportDate}<br/>Resolved: {entry.resolutionDate}</td>
                                </tr>
                            )) : <tr><td colSpan={5} className="text-center p-6 text-text-secondary">No resolved cases yet.</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>
            <Modal isOpen={!!selectedEntry} onClose={() => setSelectedEntry(null)} title={`Resolve Case for ${selectedEntry?.studentName}`}>
                <div className="space-y-4">
                    <div><p className="font-bold">Reason for Report:</p><p className="p-2 bg-gray-100 rounded-md text-sm mt-1">{selectedEntry?.reason}</p></div>
                    <div><label className="block text-sm font-medium">Resolution Notes</label><textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} rows={4} className="w-full p-2 border rounded-md" placeholder="Describe the action taken to resolve this case." required /></div>
                    <div className="flex justify-end gap-2"><button onClick={() => setSelectedEntry(null)} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button><button onClick={handleResolve} className="bg-green-600 text-white px-4 py-2 rounded-md">Confirm Resolution</button></div>
                </div>
            </Modal>
        </div>
    );
};

// Role-Specific Dashboard View Components
const TeacherDashboardView: React.FC<{ currentUser: User; teachers: Teacher[]; grades: Grade[]; students: Student[]; subjects: Subject[]; leaveRequests: LeaveRequestType[]; inventoryRequests: InventoryRequest[]; inventory: InventoryItem[]; onDataRefresh: () => void; }> = (props) => {
    const { currentUser, teachers, grades, students, subjects, leaveRequests, inventoryRequests, inventory, onDataRefresh } = props;
    
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'myClass' | 'subjects' | 'requests'>('myClass');
    
    // Modals state
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [newLeaveRequest, setNewLeaveRequest] = useState({ leaveStartDate: '', leaveEndDate: '', reason: '' });
    
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
    const [newInventoryRequest, setNewInventoryRequest] = useState({ item_id: '', quantity: 1 });

    const teacher = useMemo(() => teachers.find(t => t.name === currentUser.name), [teachers, currentUser]);

    // Derived data for performance views
    const teacherSubjects = useMemo(() => teacher ? subjects.filter(s => teacher.subjectIds.includes(s.id)) : [], [teacher, subjects]);
    const classPerformance = useMemo(() => {
        if (!teacher?.classInCharge) return { topPerformers: [], atRisk: [], meanScore: 0 };
        const classStudents = students.filter(s => s.class === teacher.classInCharge);
        const termGrades = grades.filter(g => g.term.includes('Term 2'));
        const studentAverages = classStudents.map(student => { const studentGrades = termGrades.filter(g => g.studentId === student.id); const total = studentGrades.reduce((sum, g) => sum + g.score, 0); return { student, average: studentGrades.length > 0 ? total / studentGrades.length : 0 }; }).sort((a, b) => b.average - a.average);
        const meanScore = studentAverages.length > 0 ? studentAverages.reduce((sum, s) => sum + s.average, 0) / studentAverages.length : 0;
        return { topPerformers: studentAverages.slice(0, 3), atRisk: studentAverages.filter(s => s.average > 0 && s.average < 50).slice(0,3), meanScore };
    }, [teacher, students, grades]);
    const subjectPerformance = useMemo(() => teacherSubjects.map(subject => {
        const subjectGrades = grades.filter(g => g.subjectId === subject.id && g.term.includes('Term 2')); const scores = subjectGrades.map(g => g.score); const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return { subject, mean: mean.toFixed(1), high: scores.length > 0 ? Math.max(...scores) : '-', low: scores.length > 0 ? Math.min(...scores) : '-', latestGrades: subjectGrades.slice(-3).reverse() };
    }), [teacherSubjects, grades]);

    // Data for request history
    const myLeaveRequests = useMemo(() => leaveRequests.filter(r => r.teacherId === teacher?.id).sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()), [leaveRequests, teacher]);
    const myInventoryRequests = useMemo(() => inventoryRequests.filter(r => r.teacher_id === teacher?.id).sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime()), [inventoryRequests, teacher]);

    // Form submission handlers
    const handleLeaveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLeaveRequest.leaveStartDate || !newLeaveRequest.leaveEndDate || !newLeaveRequest.reason) return alert('Please fill all fields.');
        try {
            await api.post('/leave-requests', newLeaveRequest);
            setIsLeaveModalOpen(false);
            setNewLeaveRequest({ leaveStartDate: '', leaveEndDate: '', reason: '' });
            onDataRefresh();
        } catch (err: any) { alert(`Error: ${err.message}`); }
    };
    const handleInventorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newInventoryRequest.item_id) return alert('Please select an item.');
        try {
            await api.post('/inventory/requests', newInventoryRequest);
            setIsInventoryModalOpen(false);
            setNewInventoryRequest({ item_id: '', quantity: 1 });
            onDataRefresh();
        } catch (err: any) { alert(`Error: ${err.message}`); }
    };

    const getStatusChip = (status: 'Pending' | 'Approved' | 'Rejected') => {
        const styles = {
            Pending: 'bg-yellow-100 text-yellow-800',
            Approved: 'bg-green-100 text-green-800',
            Rejected: 'bg-red-100 text-red-800',
        };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
    };
    
    if (!teacher) return <p>Loading teacher data...</p>;
    return (
        <div className="space-y-6">
            <div className="bg-brand-primary text-white p-6 rounded-lg shadow-lg flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Welcome, {teacher.name}</h2>
                    <p className="text-brand-light mt-1">This is your personal dashboard.</p>
                </div>
                <TeachersIcon className="w-16 h-16 text-brand-secondary opacity-75" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><DashboardStatCard label="Class Teacher" value={teacher.classInCharge || 'N/A'} icon={<ClipboardListIcon className="w-8 h-8 text-brand-secondary" />} /><DashboardStatCard label="Subjects Taught" value={teacherSubjects.length} icon={<BookOpenIcon className="w-8 h-8 text-brand-secondary" />} /></div>
            <div className="flex gap-4"><button onClick={() => navigate('/grades')} className="flex-1 text-center bg-brand-primary text-white p-4 rounded-lg font-semibold hover:bg-brand-dark transition-colors">Enter/Edit Grades</button><button onClick={() => navigate('/class-performance')} className="flex-1 text-center bg-brand-secondary text-white p-4 rounded-lg font-semibold hover:bg-brand-dark transition-colors">View Class Performance</button><button onClick={() => setIsLeaveModalOpen(true)} className="flex-1 text-center bg-gray-500 text-white p-4 rounded-lg font-semibold hover:bg-gray-600 transition-colors">Request Leave</button><button onClick={() => setIsInventoryModalOpen(true)} className="flex-1 text-center bg-gray-500 text-white p-4 rounded-lg font-semibold hover:bg-gray-600 transition-colors">Request Inventory</button></div>
             <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-8">{teacher.classInCharge && (<button onClick={() => setActiveTab('myClass')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'myClass' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>My Class ({teacher.classInCharge})</button>)}<button onClick={() => setActiveTab('subjects')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'subjects' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Subjects</button><button onClick={() => setActiveTab('requests')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'requests' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>My Requests</button></nav></div>
            
            {activeTab === 'myClass' && teacher.classInCharge && (<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200"><h3 className="text-xl font-bold text-text-primary mb-4">Class Overview: {teacher.classInCharge}</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><DashboardStatCard label="Class Mean Score" value={`${classPerformance.meanScore.toFixed(1)}%`} icon={<TrendingUpIcon className="w-8 h-8 text-green-500" />} color="bg-green-50" /><div className="bg-blue-50 p-4 rounded-lg"><h4 className="font-bold text-blue-800 mb-2">Top Performers</h4><ul className="space-y-1 text-sm">{classPerformance.topPerformers.map(p => <li key={p.student.id} className="flex justify-between"><span>{p.student.name}</span> <span className="font-semibold">{p.average.toFixed(1)}%</span></li>)}</ul></div><div className="bg-red-50 p-4 rounded-lg"><h4 className="font-bold text-red-800 mb-2">Students at Risk</h4><ul className="space-y-1 text-sm">{classPerformance.atRisk.map(p => <li key={p.student.id} className="flex justify-between"><span>{p.student.name}</span> <span className="font-semibold">{p.average.toFixed(1)}%</span></li>)}</ul></div></div></div>)}
            {activeTab === 'subjects' && (<div className="space-y-6">{subjectPerformance.map(sub => (<div key={sub.subject.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200"><h3 className="text-xl font-bold text-text-primary mb-4">{sub.subject.name}</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"><DashboardStatCard label="Mean Score" value={`${sub.mean}%`} icon={<TrendingUpIcon className="w-6 h-6 text-indigo-500" />} /><DashboardStatCard label="Highest Score" value={sub.high} icon={<TrendingUpIcon className="w-6 h-6 text-green-500" />} /><DashboardStatCard label="Lowest Score" value={sub.low} icon={<TrendingDownIcon className="w-6 h-6 text-red-500" />} /></div><h4 className="font-semibold text-text-secondary text-sm mt-4">Latest Grades Entered</h4><ul className="text-sm mt-2">{sub.latestGrades.length > 0 ? sub.latestGrades.map(g => (<li key={g.id} className="flex justify-between p-2 border-b"><span>{students.find(s => s.id === g.studentId)?.name}</span><span className="font-bold">{g.score}</span></li>)) : <li>No grades found for this term yet.</li>}</ul></div>))}</div>)}
            {activeTab === 'requests' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold text-text-primary mb-4">Leave Request History</h3><div className="space-y-3 max-h-96 overflow-y-auto">{myLeaveRequests.length > 0 ? myLeaveRequests.map(r => (<div key={r.id} className="p-3 border rounded-lg"><div className="flex justify-between items-center"><p className="font-semibold">{new Date(r.leaveStartDate).toLocaleDateString()} - {new Date(r.leaveEndDate).toLocaleDateString()}</p>{getStatusChip(r.status)}</div><p className="text-sm text-text-secondary mt-1">{r.reason}</p>{r.principalComment && <p className="text-xs text-red-600 mt-2 font-semibold">Principal's Comment: {r.principalComment}</p>}</div>)) : <p>No leave requests found.</p>}</div></div>
                    <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold text-text-primary mb-4">Inventory Request History</h3><div className="space-y-3 max-h-96 overflow-y-auto">{myInventoryRequests.length > 0 ? myInventoryRequests.map(r => (<div key={r.id} className="p-3 border rounded-lg"><div className="flex justify-between items-center"><p className="font-semibold">{r.quantity}x {r.item_name}</p>{getStatusChip(r.status)}</div><p className="text-sm text-text-secondary mt-1">Requested on: {new Date(r.request_date).toLocaleDateString()}</p>{r.rejection_reason && <p className="text-xs text-red-600 mt-2 font-semibold">Reason for Rejection: {r.rejection_reason}</p>}</div>)) : <p>No inventory requests found.</p>}</div></div>
                </div>
            )}
            
            {/* Modals */}
            <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Request Leave"><form onSubmit={handleLeaveSubmit} className="space-y-4"><div><label className="block text-sm font-medium">Start Date</label><input type="date" value={newLeaveRequest.leaveStartDate} onChange={e => setNewLeaveRequest({...newLeaveRequest, leaveStartDate: e.target.value})} className="mt-1 w-full p-2 border rounded-md" required /></div><div><label className="block text-sm font-medium">End Date</label><input type="date" value={newLeaveRequest.leaveEndDate} onChange={e => setNewLeaveRequest({...newLeaveRequest, leaveEndDate: e.target.value})} className="mt-1 w-full p-2 border rounded-md" required /></div><div><label className="block text-sm font-medium">Reason</label><textarea value={newLeaveRequest.reason} onChange={e => setNewLeaveRequest({...newLeaveRequest, reason: e.target.value})} rows={3} className="mt-1 w-full p-2 border rounded-md" required /></div><div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setIsLeaveModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button><button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md">Submit Request</button></div></form></Modal>
            <Modal isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} title="Request Inventory"><form onSubmit={handleInventorySubmit} className="space-y-4"><div><label className="block text-sm font-medium">Item</label><select value={newInventoryRequest.item_id} onChange={e => setNewInventoryRequest({...newInventoryRequest, item_id: e.target.value})} className="mt-1 w-full p-2 border rounded-md" required><option value="" disabled>Select Item</option>{inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} in stock)</option>)}</select></div><div><label className="block text-sm font-medium">Quantity</label><input type="number" min="1" value={newInventoryRequest.quantity} onChange={e => setNewInventoryRequest({...newInventoryRequest, quantity: Number(e.target.value)})} className="mt-1 w-full p-2 border rounded-md" required/></div><div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setIsInventoryModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button><button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md">Submit Request</button></div></form></Modal>
        </div>
    );
};

const HodDashboardView: React.FC<{ students: Student[]; subjects: Subject[]; exerciseBookStock: (ExerciseBookStock & { subjectName?: string })[]; suspensions: (SuspensionRecord & { studentName?: string; studentClass?: string; })[]; currentUser: User; onDataRefresh: () => void; }> = ({ students, subjects, exerciseBookStock, suspensions, currentUser, onDataRefresh }) => {
    const navigate = useNavigate();
    const [findStudentTerm, setFindStudentTerm] = useState('');
    const [foundStudent, setFoundStudent] = useState<Student | null>(null);
    const [issueSubject, setIssueSubject] = useState('');
    const [issueQuantity, setIssueQuantity] = useState(1);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleFindStudent = () => { setFormError(''); setFormSuccess(''); const student = students.find(s => s.admissionNumber.toLowerCase() === findStudentTerm.toLowerCase()); setFoundStudent(student || null); if (!student) setFormError('Student not found.'); };
    const handleIssueBooks = async (e: React.FormEvent) => { e.preventDefault(); if (!foundStudent || !issueSubject) return; setIsSubmitting(true); setFormError(''); setFormSuccess(''); try { await api.post('/exercise-book-issues', { admissionNumber: foundStudent.admissionNumber, subjectId: issueSubject, quantity: issueQuantity }); setFormSuccess(`Successfully issued ${issueQuantity} book(s) to ${foundStudent.name}.`); onDataRefresh(); setFoundStudent(null); setFindStudentTerm(''); setIssueQuantity(1); setIssueSubject(''); } catch (err: any) { setFormError(err.message); } finally { setIsSubmitting(false); } };
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold text-text-primary mb-4">Issue Exercise Book</h3><div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700">Find Student by Admission No.</label><div className="flex gap-2 mt-1"><input type="text" value={findStudentTerm} onChange={e => setFindStudentTerm(e.target.value)} className="flex-grow p-2 border rounded-md" placeholder="e.g., S001"/><button onClick={handleFindStudent} className="bg-brand-secondary text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-dark">Find</button></div></div>{formError && <p className="text-red-500 text-sm">{formError}</p>}{formSuccess && <p className="text-green-600 text-sm">{formSuccess}</p>}{foundStudent && (<form onSubmit={handleIssueBooks} className="p-4 bg-brand-light rounded-lg border border-brand-secondary space-y-3"><p><strong>Student:</strong> {foundStudent.name} ({foundStudent.class})</p><div><label className="block text-sm font-medium text-gray-700">Subject</label><select value={issueSubject} onChange={e => setIssueSubject(e.target.value)} className="w-full p-2 border rounded-md mt-1" required><option value="" disabled>Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-700">Number of Books</label><input type="number" min="1" value={issueQuantity} onChange={e => setIssueQuantity(Number(e.target.value))} className="w-full p-2 border rounded-md mt-1" /></div><button type="submit" disabled={isSubmitting} className="w-full bg-brand-primary text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-dark disabled:bg-gray-400">{isSubmitting ? 'Issuing...' : 'Issue Book(s)'}</button></form>)}</div></div>
                <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold text-text-primary mb-4">Disciplinary Actions</h3><button onClick={() => navigate('/discipline')} className="w-full bg-red-600 text-white p-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center border-2 border-red-700 ring-2 ring-red-300"><ShieldExclamationIcon className="w-6 h-6 mr-2" />Suspend a Student</button></div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold mb-4">Suspension Records</h3><SuspensionViewer suspensions={suspensions} /></div>
        </div>
    );
};

const AcademicsDeptDashboardView: React.FC<{ timecFiles: (TimecFile & { uploaderName?: string })[]; suspensionRecords: (SuspensionRecord & { studentName?: string; studentClass?: string; })[]; onDataRefresh: () => void; }> = ({ timecFiles, suspensionRecords, onDataRefresh }) => {
    const navigate = useNavigate();
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [newFile, setNewFile] = useState({ title: '', fileName: '', fileContent: '' });
    const [isUploading, setIsUploading] = useState(false);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type === 'application/pdf' || file.type.includes('word'))) { if (file.size > 20 * 1024 * 1024) { alert('File is too large. Max size is 20MB.'); return; } const reader = new FileReader(); reader.onloadend = () => { const base64String = (reader.result as string).split(',')[1]; setNewFile(prev => ({ ...prev, fileName: file.name, fileContent: base64String })); }; reader.readAsDataURL(file); } else { alert('Please select a valid PDF or DOC file.'); e.target.value = ''; }
    };
    const handleUploadSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!newFile.fileContent || !newFile.title) { alert('Please provide a title and select a file.'); return; } setIsUploading(true); try { await api.post('/timec-files', newFile); setUploadModalOpen(false); setNewFile({ title: '', fileName: '', fileContent: '' }); onDataRefresh(); } catch (err: any) { alert('Upload failed: ' + err.message); } finally { setIsUploading(false); } };
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border flex flex-col items-center justify-center"><DocumentArrowUpIcon className="w-16 h-16 text-brand-secondary mb-4"/><h3 className="text-xl font-bold text-text-primary mb-2">TIMEC Upload</h3><p className="text-sm text-text-secondary text-center mb-4">Upload important academic documents for the Principal's review.</p><button onClick={() => setUploadModalOpen(true)} className="bg-brand-primary text-white px-6 py-2 rounded-md font-semibold hover:bg-brand-dark">Upload Document</button></div>
                <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold text-text-primary mb-4">Disciplinary Actions</h3><button onClick={() => navigate('/discipline')} className="w-full bg-red-600 text-white p-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center border-2 border-red-700 ring-2 ring-red-300"><ShieldExclamationIcon className="w-6 h-6 mr-2" />Suspend a Student</button></div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold mb-4">TIMEC Documents Viewer</h3><TimecFileViewer files={timecFiles} /></div>
            <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold mb-4">Suspension Records</h3><SuspensionViewer suspensions={suspensionRecords} /></div>
            <Modal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload TIMEC Document"><form onSubmit={handleUploadSubmit} className="space-y-4"><div><label className="block text-sm font-medium">Document Title</label><input type="text" value={newFile.title} onChange={e => setNewFile(prev => ({...prev, title: e.target.value}))} className="mt-1 w-full p-2 border rounded-md" required /></div><div><label className="block text-sm font-medium">File (PDF or DOC, max 20MB)</label><input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-brand-light" required /></div><div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setUploadModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button><button type="submit" disabled={isUploading} className="bg-brand-primary text-white px-4 py-2 rounded-md disabled:bg-gray-400">{isUploading ? 'Uploading...' : 'Upload'}</button></div></form></Modal>
        </div>
    );
};

const PrincipalDashboardView: React.FC<{ students: Student[]; teachers: Teacher[]; books: Book[]; inventory: InventoryItem[]; leaveRequests: (LeaveRequestType & { teacherName?: string })[]; timecFiles: (TimecFile & { uploaderName?: string })[]; exerciseBookStock: (ExerciseBookStock & { subjectName?: string; })[]; exerciseBookIssues: ExerciseBookIssue[]; suspensionRecords: (SuspensionRecord & { studentName?: string; studentClass?: string; })[]; presentStudents: (Student & { timeIn: string; })[]; presentTeachers: (Teacher & { timeIn: string; })[]; onLeaveRespond: (id: string, status: "Approved" | "Rejected", comment?: string) => Promise<void>; onAddTeacherClick: () => void; getSubjectNames: (subjectIds: string[]) => string; subjects: Subject[]; grades: Grade[]; }> = (props) => {
    const { students, teachers, books, inventory, leaveRequests, timecFiles, exerciseBookStock, exerciseBookIssues, suspensionRecords, presentStudents, presentTeachers, onLeaveRespond, onAddTeacherClick, getSubjectNames, subjects, grades } = props;
    const navigate = useNavigate();
    const [isAbsenteeModalOpen, setAbsenteeModalOpen] = useState(false);
    const absentTeachersCount = teachers.length - presentTeachers.length;
    const absentTeachers = teachers.filter(t => !presentTeachers.some(pt => pt.id === t.id));

    const availableTerms = useMemo(() => Array.from(new Set(grades.map(g => g.term))).sort((a,b) => b.localeCompare(a)), [grades]);
    const [performanceTerm, setPerformanceTerm] = useState(availableTerms.length > 0 ? availableTerms[0] : '');

    useEffect(() => {
        if (availableTerms.length > 0 && !performanceTerm) {
            setPerformanceTerm(availableTerms[0]);
        }
    }, [availableTerms, performanceTerm]);
    
    const topPerformingTeacher = useMemo(() => {
        if (!performanceTerm || !teachers || !students || !grades) return null;
        const classTeachers = teachers.filter(t => t.classInCharge);
        if (classTeachers.length === 0) return null;
        const termGrades = grades.filter(g => g.term === performanceTerm);
        if (termGrades.length === 0) return null;
        
        let topTeacher: { teacher: Teacher | null, classAverage: number } = { teacher: null, classAverage: -1 };

        for (const teacher of classTeachers) {
            const classStudents = students.filter(s => s.class === teacher.classInCharge);
            if (classStudents.length === 0) continue;

            const classStudentIds = new Set(classStudents.map(s => s.id));
            const gradesForClass = termGrades.filter(g => classStudentIds.has(g.studentId));
            
            const studentAverages = classStudents.map(student => {
                const studentGrades = gradesForClass.filter(g => g.studentId === student.id);
                if (studentGrades.length === 0) return null;
                const total = studentGrades.reduce((sum, g) => sum + g.score, 0);
                return total / studentGrades.length;
            }).filter(avg => avg !== null) as number[];

            if (studentAverages.length === 0) continue;
            const classMean = studentAverages.reduce((sum, avg) => sum + avg, 0) / studentAverages.length;

            if (classMean > topTeacher.classAverage) {
                topTeacher = { teacher, classAverage: classMean };
            }
        }
        return topTeacher.teacher ? topTeacher : null;
    }, [performanceTerm, teachers, students, grades]);


    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard title="Total Students" value={students.length} icon={<StudentsIcon className="w-8 h-8 text-brand-secondary" />} />
                <DashboardCard title="Total Teachers" value={teachers.length} icon={<TeachersIcon className="w-8 h-8 text-brand-secondary" />} subtext={absentTeachersCount > 0 ? `${absentTeachersCount} absent today` : 'All present'} action={absentTeachersCount > 0 ? <button onClick={() => setAbsenteeModalOpen(true)} className="w-full text-center bg-red-100 text-red-700 p-2 rounded-lg font-semibold hover:bg-red-200 transition-colors text-sm border-2 border-red-300 ring-2 ring-red-200">View Absent List</button> : null} />
                <DashboardCard title="Books in Library" value={books.reduce((sum, b) => sum + b.quantity, 0)} icon={<LibraryIcon className="w-8 h-8 text-brand-secondary" />} />
                <DashboardCard title="Inventory Items" value={inventory.length} icon={<InventoryIcon className="w-8 h-8 text-brand-secondary" />} subtext={`${inventory.filter(i=> i.quantity <= i.minStockLevel).length} items low stock`} />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <AIAssistant />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold mb-4">Exercise Book Inventory</h3><ExerciseBookStockViewer stock={exerciseBookStock} /></div><div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold mb-4">Exercise Book Issuance Log</h3><ExerciseBookIssueLogViewer issues={exerciseBookIssues} subjects={subjects}/></div></div>
                    <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold mb-4">TIMEC Documents</h3><TimecFileViewer files={timecFiles} /></div>
                    <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold mb-4">Suspension Records</h3><SuspensionViewer suspensions={suspensionRecords} /></div>
                    <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold mb-4">Today's Attendance</h3><TodaysAttendanceReport presentStudents={presentStudents} presentTeachers={presentTeachers} getSubjectNames={getSubjectNames} /></div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold mb-4">Management Actions</h3><div className="space-y-3"><button onClick={onAddTeacherClick} className="w-full bg-brand-primary text-white p-3 rounded-lg font-semibold hover:bg-brand-dark transition-colors flex items-center justify-center"><UserAddIcon className="w-6 h-6 mr-2" />Add New Teacher</button><button onClick={() => navigate('/discipline')} className="w-full bg-red-600 text-white p-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center border-2 border-red-700 ring-2 ring-red-300"><ShieldExclamationIcon className="w-6 h-6 mr-2" />Suspend a Student</button><button onClick={() => navigate('/performance-reports')} className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center"><ChartBarIcon className="w-6 h-6 mr-2" />View Performance Reports</button></div></div>
                    <div className="bg-white p-6 rounded-lg shadow-md border"><h3 className="text-xl font-bold mb-4">Leave Requests</h3><LeaveRequestManager requests={leaveRequests} onRespond={onLeaveRespond} /></div>
                    <div className="bg-white p-6 rounded-lg shadow-md border">
                        <h3 className="text-xl font-bold mb-4">Top Performing Class Teacher</h3>
                        <div className="mb-4">
                            <label className="text-sm font-medium">Select Exam Term:</label>
                            <select value={performanceTerm} onChange={e => setPerformanceTerm(e.target.value)} className="w-full mt-1 p-2 border rounded-md bg-white">
                                {availableTerms.map(term => <option key={term} value={term}>{term}</option>)}
                            </select>
                        </div>
                        {topPerformingTeacher ? (
                            <div className="flex items-center gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <TrophyIcon className="w-12 h-12 text-yellow-500 flex-shrink-0"/>
                                <div>
                                    <p className="font-bold text-lg text-yellow-900">{topPerformingTeacher.teacher.name}</p>
                                    <p className="text-sm text-yellow-800">Class: {topPerformingTeacher.teacher.classInCharge}</p>
                                    <p className="text-xl font-bold text-yellow-900 mt-1">
                                        {topPerformingTeacher.classAverage.toFixed(2)}%
                                        <span className="text-sm font-normal"> Class Mean</span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-text-secondary p-4 text-center">No performance data available for the selected term.</p>
                        )}
                    </div>
                </div>
            </div>
            <Modal isOpen={isAbsenteeModalOpen} onClose={() => setAbsenteeModalOpen(false)} title={`Teachers Absent Today (${absentTeachersCount})`}><ul className="space-y-2">{absentTeachers.map(t => <li key={t.id} className="p-2 bg-gray-100 rounded-md">{t.name} ({t.employeeId})</li>)}</ul></Modal>
        </div>
    );
};

const DeputyPrincipalDashboardView: React.FC<{
    students: Student[];
    teachers: Teacher[];
    suspensionRecords: (SuspensionRecord & { studentName?: string; studentClass?: string; })[];
    blackBookEntries: (BlackBookEntry & { reportedByName?: string; studentName?: string; studentClass?: string; resolvedByName?: string; })[];
    onAddTeacherClick: () => void;
    onResolveBlackBookEntry: (entryId: string, resolutionNotes: string) => Promise<void>;
}> = ({ students, teachers, suspensionRecords, blackBookEntries, onAddTeacherClick, onResolveBlackBookEntry }) => {
    const navigate = useNavigate();
    const activeSuspensionsCount = suspensionRecords.filter(s => s.status === 'Active').length;
    const openBlackBookCasesCount = blackBookEntries.filter(e => e.status === BlackBookStatus.OPEN).length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard title="Total Students" value={students.length} icon={<StudentsIcon className="w-8 h-8 text-brand-secondary" />} />
                <DashboardCard title="Total Teachers" value={teachers.length} icon={<TeachersIcon className="w-8 h-8 text-brand-secondary" />} />
                <DashboardCard title="Active Suspensions" value={activeSuspensionsCount} icon={<ShieldExclamationIcon className="w-8 h-8 text-red-500" />} subtext="Students currently out of school." />
                <DashboardCard title="Open Black Book Cases" value={openBlackBookCasesCount} icon={<BookmarkAltIcon className="w-8 h-8 text-gray-700" />} subtext="Cases needing follow-up." />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md border">
                        <h3 className="text-xl font-bold mb-4">Black Book Management</h3>
                        <BlackBookManager entries={blackBookEntries} onResolve={onResolveBlackBookEntry} />
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md border">
                        <h3 className="text-xl font-bold mb-4">Suspension Overview</h3>
                        <SuspensionViewer suspensions={suspensionRecords} />
                    </div>
                </div>
                 <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md border">
                        <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <button onClick={onAddTeacherClick} className="w-full bg-brand-primary text-white p-3 rounded-lg font-semibold hover:bg-brand-dark transition-colors flex items-center justify-center">
                                <UserAddIcon className="w-6 h-6 mr-2" />Add New Teacher
                            </button>
                            <button onClick={() => navigate('/discipline')} className="w-full bg-red-600 text-white p-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center">
                                <ShieldExclamationIcon className="w-6 h-6 mr-2" />New Suspension
                            </button>
                        </div>
                    </div>
                    <AIAssistant />
                </div>
            </div>
        </div>
    );
};

const SecretaryDashboardView: React.FC<{
    inventoryRequests: InventoryRequest[];
    onInventoryRespond: (id: string, action: 'approve' | 'reject', reason?: string) => Promise<void>;
}> = ({ inventoryRequests, onInventoryRespond }) => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <DashboardCard 
                    title="Pending Inventory Requests" 
                    value={inventoryRequests.filter(r => r.status === 'Pending').length} 
                    icon={<ClipboardListIcon className="w-8 h-8 text-brand-secondary" />} 
                    subtext="Requests from teachers for supplies."
                />
                 <DashboardCard 
                    title="Manage Full Inventory" 
                    value="View Stock" 
                    icon={<InventoryIcon className="w-8 h-8 text-brand-secondary" />}
                    action={
                        <button onClick={() => navigate('/inventory')} className="w-full text-center bg-brand-primary text-white p-2 rounded-lg font-semibold hover:bg-brand-dark transition-colors text-sm">
                            Go to Inventory
                        </button>
                    }
                />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
                <h3 className="text-xl font-bold mb-4">Inventory Requests from Teachers</h3>
                <InventoryRequestManager requests={inventoryRequests} onRespond={onInventoryRespond} />
            </div>
             <AIAssistant />
        </div>
    );
};


// Main Dashboard Component
const Dashboard: React.FC<{ currentUser: User; }> = ({ currentUser }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [dataLoaded, setDataLoaded] = useState(false);
    
    // Global Data State
    const [allData, setAllData] = useState<any>({});

    const [isAddTeacherModalOpen, setAddTeacherModalOpen] = useState(false);
    const [newTeacher, setNewTeacher] = useState({ name: '', subjectIds: [] as string[], classInCharge: '' });
    const navigate = useNavigate();

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [ students, teachers, subjects, grades, attendance, books, libraryTransactions, inventory, issuedInventory, inventoryRequests, leaveRequests, users, pastPapers, timecFiles, exerciseBookStock, exerciseBookIssues, suspensionRecords, blackBookEntries ] = await Promise.all([
                api.get('/students'), api.get('/teachers'), api.get('/subjects'), api.get('/grades'),
                api.get('/attendance'), api.get('/books'), api.get('/library/transactions'), api.get('/inventory'),
                api.get('/inventory/issued'), api.get('/inventory/requests'), api.get('/leave-requests'),
                api.get('/users'), api.get('/past-papers'), api.get('/timec-files'), api.get('/exercise-book-stock'),
                api.get('/exercise-book-issues'), api.get('/suspensions'), api.get('/black-book-entries')
            ]);
            setAllData({ students, teachers, subjects, grades, attendance, books, libraryTransactions, inventory, issuedInventory, inventoryRequests, leaveRequests, users, pastPapers, timecFiles, exerciseBookStock, exerciseBookIssues, suspensionRecords, blackBookEntries });
            setDataLoaded(true);
        } catch (err: any) {
            setError('Failed to load dashboard data. ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const getSubjectNames = (subjectIds: string[]): string => {
        if (!subjectIds || !allData.subjects) return 'N/A';
        return subjectIds.map(id => allData.subjects.find((s: Subject) => s.id === id)?.name).filter(Boolean).join(', ');
    };
    
    const handleLeaveResponse = async (id: string, status: 'Approved' | 'Rejected', comment: string = '') => { try { await api.put(`/leave-requests/${id}/respond`, { status, principalComment: comment }); fetchData(); } catch (err) { alert('Failed to respond to leave request.'); } };
    const handleInventoryResponse = async (id: string, action: 'approve' | 'reject', reason?: string) => { try { await api.put(`/inventory/requests/${id}/${action}`, { reason }); fetchData(); } catch (err) { alert(`Failed to ${action} inventory request.`); } };
    const handleAddTeacher = async (e: React.FormEvent) => { e.preventDefault(); try { await api.post('/teachers', newTeacher); setNewTeacher({ name: '', subjectIds: [], classInCharge: '' }); setAddTeacherModalOpen(false); fetchData(); } catch (err: any) { alert('Failed to add teacher: ' + err.message); } };
    const handleSubjectSelection = (subjectId: string) => { setNewTeacher(prev => { const newSubjectIds = prev.subjectIds.includes(subjectId) ? prev.subjectIds.filter(id => id !== subjectId) : [...prev.subjectIds, subjectId]; return { ...prev, subjectIds: newSubjectIds }; }); };
    const handleResolveBlackBook = async (entryId: string, resolutionNotes: string) => { try { await api.put(`/black-book-entries/${entryId}/resolve`, { resolutionNotes }); fetchData(); } catch (err: any) { alert(`Failed to resolve case: ${err.message}`); }};

    const presentStudents = useMemo(() => {
        if (!dataLoaded) return [];
        const todayStr = new Date().toISOString().split('T')[0];
        const studentIds = new Set(allData.attendance.filter((r: AttendanceRecord) => r.date === todayStr && r.userType === 'student').map((r: AttendanceRecord) => r.userId));
        return allData.students.filter((s: Student) => studentIds.has(s.id)).map((s: Student) => ({...s, timeIn: allData.attendance.find((r: AttendanceRecord) => r.userId === s.id && r.date === todayStr)?.timeIn || '' }));
    }, [dataLoaded, allData.attendance, allData.students]);

    const presentTeachers = useMemo(() => {
        if (!dataLoaded) return [];
        const todayStr = new Date().toISOString().split('T')[0];
        const teacherIds = new Set(allData.attendance.filter((r: AttendanceRecord) => r.date === todayStr && r.userType === 'teacher').map((r: AttendanceRecord) => r.userId));
        return allData.teachers.filter((t: Teacher) => teacherIds.has(t.id)).map((t: Teacher) => ({...t, timeIn: allData.attendance.find((r: AttendanceRecord) => r.userId === t.id && r.date === todayStr)?.timeIn || '' }));
    }, [dataLoaded, allData.attendance, allData.teachers]);


    const renderContent = () => {
        if (!dataLoaded) return <div className="text-center p-10">Loading dashboard...</div>;
        
        const enrichedLeaveRequests = allData.leaveRequests.map((req: LeaveRequestType) => ({...req, teacherName: allData.teachers.find((t: Teacher) => t.id === req.teacherId)?.name }));
        const enrichedTimecFiles = allData.timecFiles.map((file: TimecFile) => ({ ...file, uploaderName: allData.users.find((u: User) => u.id === file.uploadedById)?.name }));
        const enrichedStock = allData.exerciseBookStock.map((s: ExerciseBookStock) => ({ ...s, subjectName: allData.subjects.find((sub: Subject) => sub.id === s.subjectId)?.name || 'N/A' }));
        const enrichedSuspensions = allData.suspensionRecords.map((s: SuspensionRecord) => ({ ...s, studentName: allData.students.find((stud: Student) => stud.id === s.studentId)?.name, studentClass: allData.students.find((stud: Student) => stud.id === s.studentId)?.class }));
        const enrichedBlackBook = allData.blackBookEntries.map((e: BlackBookEntry) => ({
            ...e,
            studentName: allData.students.find((s: Student) => s.id === e.studentId)?.name,
            studentClass: allData.students.find((s: Student) => s.id === e.studentId)?.class,
            reportedByName: allData.users.find((u: User) => u.id === e.reportedById)?.name,
            resolvedByName: allData.users.find((u: User) => u.id === e.resolvedById)?.name,
        }));

        switch(currentUser.role) {
            case UserRole.PRINCIPAL:
                return <PrincipalDashboardView students={allData.students} teachers={allData.teachers} books={allData.books} inventory={allData.inventory} leaveRequests={enrichedLeaveRequests} timecFiles={enrichedTimecFiles} exerciseBookStock={enrichedStock} exerciseBookIssues={allData.exerciseBookIssues} suspensionRecords={enrichedSuspensions} presentStudents={presentStudents} presentTeachers={presentTeachers} onLeaveRespond={handleLeaveResponse} onAddTeacherClick={() => setAddTeacherModalOpen(true)} getSubjectNames={getSubjectNames} subjects={allData.subjects} grades={allData.grades}/>;
            case UserRole.DEPUTY_PRINCIPAL:
                return <DeputyPrincipalDashboardView students={allData.students} teachers={allData.teachers} suspensionRecords={enrichedSuspensions} blackBookEntries={enrichedBlackBook} onAddTeacherClick={() => setAddTeacherModalOpen(true)} onResolveBlackBookEntry={handleResolveBlackBook} />;
            case UserRole.TEACHER:
                return <TeacherDashboardView currentUser={currentUser} teachers={allData.teachers} grades={allData.grades} students={allData.students} subjects={allData.subjects} leaveRequests={allData.leaveRequests} inventoryRequests={allData.inventoryRequests} inventory={allData.inventory} onDataRefresh={fetchData} />;
            case UserRole.HOD:
                return <HodDashboardView students={allData.students} subjects={allData.subjects} exerciseBookStock={enrichedStock} suspensions={enrichedSuspensions} currentUser={currentUser} onDataRefresh={fetchData} />;
            case UserRole.ACADEMICS_DEPT:
                return <AcademicsDeptDashboardView timecFiles={enrichedTimecFiles} suspensionRecords={enrichedSuspensions} onDataRefresh={fetchData} />;
            case UserRole.SECRETARY:
                return <SecretaryDashboardView 
                            inventoryRequests={allData.inventoryRequests}
                            onInventoryRespond={handleInventoryResponse}
                        />;
            case UserRole.ADMIN: case UserRole.LIBRARIAN: case UserRole.STUDENT: case UserRole.REGISTRAR:
            default:
                return (<div className="text-center p-10 bg-white rounded-lg shadow-md"><h2 className="text-2xl font-bold text-text-primary">Welcome, {currentUser.name}!</h2><p className="text-text-secondary mt-2">Your dashboard is under construction. Please use the navigation on the left.</p><AIAssistant /></div>);
        }
    };
    
    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6"><h1 className="text-3xl font-bold text-text-primary">Dashboard</h1></div>
            {isLoading ? <div className="text-center p-10">Loading...</div> : error ? <div className="text-red-500 p-10">{error}</div> : renderContent()}
            <Modal isOpen={isAddTeacherModalOpen} onClose={() => setAddTeacherModalOpen(false)} title="Add New Teacher">
                <form onSubmit={handleAddTeacher} className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" value={newTeacher.name} onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })} className="mt-1 block w-full p-2 border rounded-md" required /></div>
                     <div><label className="block text-sm font-medium text-gray-700">Class In Charge (Optional)</label><select value={newTeacher.classInCharge} onChange={e => setNewTeacher({ ...newTeacher, classInCharge: e.target.value })} className="mt-1 block w-full p-2 border rounded-md"><option value="">None</option><option>Form 1</option><option>Form 2</option><option>Form 3</option><option>Form 4</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700">Subjects Taught</label><div className="mt-2 grid grid-cols-2 gap-2">{allData.subjects?.map((subject: Subject) => (<label key={subject.id} className="flex items-center space-x-2 p-2 border rounded-md"><input type="checkbox" checked={newTeacher.subjectIds.includes(subject.id)} onChange={() => handleSubjectSelection(subject.id)} className="rounded" /><span>{subject.name}</span></label>))}</div></div>
                    <div className="pt-4 flex justify-end"><button type="button" onClick={() => setAddTeacherModalOpen(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold mr-2">Cancel</button><button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md font-semibold">Add Teacher</button></div>
                </form>
            </Modal>
        </div>
    );
};

export default Dashboard;
