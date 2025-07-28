import React, { useState, useMemo, useEffect } from 'react';
import { PastPaper, Subject, User, UserRole } from '../types';
import Modal from './common/Modal';
import { UploadIcon, DownloadIcon } from './common/Icons';
import * as api from '../services/api';

interface PastPapersManagementProps {
    currentUser: User;
}

const PastPapersManagement: React.FC<PastPapersManagementProps> = ({ currentUser }) => {
    const [pastPapers, setPastPapers] = useState<PastPaper[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [filters, setFilters] = useState({
        subjectId: '',
        class: '',
        term: '',
        year: '',
    });

    // Upload Modal
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [newPaper, setNewPaper] = useState({
        subjectId: '',
        class: 'Form 1',
        term: 'Term 1 Midterm',
        year: new Date().getFullYear(),
        fileName: '',
        fileContent: '',
    });
    const [isUploading, setIsUploading] = useState(false);

    const canUpload = useMemo(() => {
        return [UserRole.ADMIN, UserRole.TEACHER, UserRole.PRINCIPAL].includes(currentUser.role);
    }, [currentUser]);

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [papersData, subjectsData] = await Promise.all([
                api.get('/past-papers'),
                api.get('/subjects'),
            ]);
            setPastPapers(papersData);
            setSubjects(subjectsData);
        } catch (err: any) {
            setError('Failed to fetch data: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredPapers = useMemo(() => {
        return pastPapers
            .map(paper => ({
                ...paper,
                subjectName: subjects.find(s => s.id === paper.subjectId)?.name || 'Unknown Subject',
            }))
            .filter(paper => {
                return (
                    (filters.subjectId === '' || paper.subjectId === filters.subjectId) &&
                    (filters.class === '' || paper.class === filters.class) &&
                    (filters.term === '' || paper.term === filters.term) &&
                    (filters.year === '' || paper.year.toString() === filters.year)
                );
            }).sort((a,b) => b.year - a.year || a.subjectName.localeCompare(b.subjectName));
    }, [pastPapers, subjects, filters]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setNewPaper(prev => ({
                    ...prev,
                    fileName: file.name,
                    fileContent: base64String,
                }));
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select a valid PDF file.');
            e.target.value = ''; // Reset file input
        }
    };
    
    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPaper.fileContent) {
            alert('Please select a file to upload.');
            return;
        }
        setIsUploading(true);
        try {
            await api.post('/past-papers', newPaper);
            setUploadModalOpen(false);
            setNewPaper({ subjectId: '', class: 'Form 1', term: 'Term 1 Midterm', year: new Date().getFullYear(), fileName: '', fileContent: '' });
            fetchData();
        } catch (err: any) {
            alert('Upload failed: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };
    
    const downloadFile = (base64Content: string, fileName: string) => {
        const byteCharacters = atob(base64Content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const uniqueValues = (key: keyof PastPaper) => {
        return [...new Set(pastPapers.map(p => p[key]))].sort((a,b) => String(b).localeCompare(String(a)));
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-text-primary">Past Papers Repository</h1>
                {canUpload && (
                    <button onClick={() => setUploadModalOpen(true)} className="bg-brand-primary text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-dark transition-colors flex items-center justify-center w-full sm:w-auto">
                        <UploadIcon className="w-5 h-5 mr-2" />
                        Upload New Paper
                    </button>
                )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <select name="subjectId" value={filters.subjectId} onChange={handleFilterChange} className="px-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-brand-secondary">
                        <option value="">All Subjects</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select name="class" value={filters.class} onChange={handleFilterChange} className="px-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-brand-secondary">
                        <option value="">All Classes</option>
                        {['Form 1', 'Form 2', 'Form 3', 'Form 4'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select name="term" value={filters.term} onChange={handleFilterChange} className="px-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-brand-secondary">
                        <option value="">All Terms</option>
                        {uniqueValues('term').map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select name="year" value={filters.year} onChange={handleFilterChange} className="px-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-brand-secondary">
                        <option value="">All Years</option>
                        {uniqueValues('year').map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                {isLoading ? <p>Loading papers...</p> : error ? <p className="text-red-500">{error}</p> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-text-secondary">Subject</th>
                                <th className="p-4 font-semibold text-text-secondary">Class</th>
                                <th className="p-4 font-semibold text-text-secondary">Term</th>
                                <th className="p-4 font-semibold text-text-secondary">Year</th>
                                <th className="p-4 font-semibold text-text-secondary">File Name</th>
                                <th className="p-4 font-semibold text-text-secondary text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPapers.map(paper => (
                                <tr key={paper.id} className="border-b hover:bg-brand-light transition-colors">
                                    <td className="p-4 font-medium">{paper.subjectName}</td>
                                    <td className="p-4">{paper.class}</td>
                                    <td className="p-4">{paper.term}</td>
                                    <td className="p-4">{paper.year}</td>
                                    <td className="p-4 text-sm text-text-secondary">{paper.fileName}</td>
                                    <td className="p-4 text-center space-x-2">
                                        <button onClick={() => downloadFile(paper.fileContent, paper.fileName)} className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors" title="Download">
                                            <DownloadIcon className="w-5 h-5"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredPapers.length === 0 && <p className="text-center py-10 text-text-secondary">No past papers found matching your filters.</p>}
                </div>
                )}
            </div>

            <Modal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload New Past Paper">
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Subject</label>
                            <select value={newPaper.subjectId} onChange={e => setNewPaper({...newPaper, subjectId: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md" required>
                                <option value="" disabled>Select subject</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Class/Form</label>
                            <select value={newPaper.class} onChange={e => setNewPaper({...newPaper, class: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md" required>
                                {['Form 1', 'Form 2', 'Form 3', 'Form 4'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Term</label>
                            <select value={newPaper.term} onChange={e => setNewPaper({...newPaper, term: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md" required>
                                {['Term 1 Midterm', 'Term 1 Endterm', 'Term 2 Midterm', 'Term 2 Endterm', 'Term 3 Midterm', 'Term 3 Endterm'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Year</label>
                            <input type="number" value={newPaper.year} onChange={e => setNewPaper({...newPaper, year: parseInt(e.target.value)})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">PDF File</label>
                        <input type="file" accept=".pdf" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-light file:text-brand-primary hover:file:bg-brand-secondary/20" required />
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button type="button" onClick={() => setUploadModalOpen(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold mr-2">Cancel</button>
                        <button type="submit" disabled={isUploading} className="bg-brand-primary text-white px-4 py-2 rounded-md font-semibold flex items-center disabled:bg-gray-400">
                            {isUploading ? 'Uploading...' : 'Upload Paper'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default PastPapersManagement;