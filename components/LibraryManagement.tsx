


import React, { useState, useMemo, useEffect } from 'react';
import { Book, LibraryTransaction, Student, User, UserRole } from '../types';
import Modal from './common/Modal';
import * as api from '../services/api';
import { PlusIcon, PaperAirplaneIcon, ClipboardCheckIcon, BookOpenIcon, ClipboardListIcon, ExclamationCircleIcon, ChartBarIcon, FilePdfIcon, FileExcelIcon } from './common/Icons';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { schoolLogoBase64 } from '../services/logo';

interface LibraryManagementProps {
    currentUser: User;
}

const LibraryManagement: React.FC<LibraryManagementProps> = ({ currentUser }) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [activeTab, setActiveTab] = useState<'overdue' | 'books' | 'transactions' | 'reports'>('overdue');
    const [searchTerm, setSearchTerm] = useState('');
    const [reportPeriod, setReportPeriod] = useState<'monthly' | 'yearly'>('yearly');
    
    // State for Issue Book Modal
    const [isIssueModalOpen, setIssueModalOpen] = useState(false);
    const [issueData, setIssueData] = useState({ studentId: '', bookId: '' });
    const [admissionNumberSearch, setAdmissionNumberSearch] = useState('');
    const [foundStudent, setFoundStudent] = useState<Student | null>(null);
    const [findStudentError, setFindStudentError] = useState('');

    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [newBook, setNewBook] = useState({ title: '', author: '', isbn: '', quantity: 1 });
    
    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [booksData, transactionsData, studentsData] = await Promise.all([
                api.get('/books'),
                api.get('/library/transactions'),
                api.get('/students')
            ]);
            setBooks(booksData);
            setTransactions(transactionsData);
            setStudents(studentsData);
        } catch (err: any) {
            setError('Failed to fetch library data. ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const canManageBooks = useMemo(() => {
        return [UserRole.ADMIN, UserRole.LIBRARIAN, UserRole.PRINCIPAL].includes(currentUser.role);
    }, [currentUser]);

    const findBookTitle = (bookId: string) => books.find(b => b.id === bookId)?.title || 'Unknown Book';
    const findStudentName = (studentId: string) => students.find(s => s.id === studentId)?.name || 'Unknown Student';

    const overdueTransactions = useMemo(() => {
        return transactions.filter(t => !t.returnDate && new Date(t.dueDate) < new Date());
    }, [transactions]);

    const stats = useMemo(() => ({
        totalBooksCount: books.reduce((sum, b) => sum + b.quantity, 0),
        issuedBooksCount: transactions.filter(t => !t.returnDate).length,
        overdueBooksCount: overdueTransactions.length,
    }), [books, transactions, overdueTransactions]);
    
    const reportData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        const transactionsToConsider = reportPeriod === 'yearly'
            ? transactions.filter(t => new Date(t.issueDate).getFullYear() === currentYear)
            : transactions.filter(t => {
                const issueDate = new Date(t.issueDate);
                return issueDate.getFullYear() === currentYear && issueDate.getMonth() === currentMonth;
            });
        
        const bookCounts = transactionsToConsider.reduce((acc, t) => {
            acc[t.bookId] = (acc[t.bookId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostBorrowed = Object.entries(bookCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([bookId, count]) => ({
                book: books.find(b => b.id === bookId),
                count
            }));

        return {
            totalIssued: transactionsToConsider.length,
            mostBorrowed
        };
    }, [transactions, books, reportPeriod]);


    const filteredBooks = useMemo(() => {
        return books.filter(book =>
            book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.isbn.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [books, searchTerm]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => 
            findBookTitle(t.bookId).toLowerCase().includes(searchTerm.toLowerCase()) ||
            findStudentName(t.studentId).toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }, [transactions, searchTerm, books, students]);
    
    const filteredOverdueTransactions = useMemo(() => {
        return overdueTransactions.filter(t => 
            findBookTitle(t.bookId).toLowerCase().includes(searchTerm.toLowerCase()) ||
            findStudentName(t.studentId).toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [overdueTransactions, searchTerm, books, students]);

    const handleReturnBook = async (transactionId: string) => {
        try {
            await api.put(`/library/transactions/${transactionId}/return`);
            fetchData(); // Refetch all data
        } catch (err: any) {
            alert('Failed to return book: ' + err.message);
        }
    };

    const openIssueModal = () => {
        setAdmissionNumberSearch('');
        setFoundStudent(null);
        setFindStudentError('');
        setIssueData({ studentId: '', bookId: '' });
        setIssueModalOpen(true);
    };

    const closeIssueModal = () => {
        setIssueModalOpen(false);
        setAdmissionNumberSearch('');
        setFoundStudent(null);
        setFindStudentError('');
        setIssueData({ studentId: '', bookId: '' });
    };

    const handleFindStudent = () => {
        setFindStudentError('');
        if (!admissionNumberSearch.trim()) {
            setFindStudentError('Please enter an admission number to search.');
            setFoundStudent(null);
            return;
        }
        const student = students.find(s => s.admissionNumber.toLowerCase() === admissionNumberSearch.toLowerCase().trim());
        if (student) {
            setFoundStudent(student);
        } else {
            setFoundStudent(null);
            setFindStudentError('No student found with that admission number.');
        }
    };

    const handleIssueBook = async (e: React.FormEvent) => {
        e.preventDefault();
        const { bookId } = issueData;
        if (!bookId || !foundStudent) {
            alert("Please select a book and find a valid student.");
            return;
        }

        try {
            await api.post('/library/transactions', { book_id: bookId, student_id: foundStudent.id });
            closeIssueModal();
            fetchData(); // Refetch all data
        } catch (err: any) {
            alert('Failed to issue book: ' + err.message);
        }
    };

    const handleAddBook = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/books', newBook);
            setAddModalOpen(false);
            setNewBook({ title: '', author: '', isbn: '', quantity: 1 });
            fetchData();
        } catch (err: any) {
            alert('Failed to add book: ' + err.message);
        }
    };

    const handleReportExportPDF = () => {
        const doc = new jsPDF();
        
        doc.addImage(schoolLogoBase64, 'PNG', 14, 10, 60, 15);

        const title = `Library Report - ${reportPeriod === 'monthly' ? 'Monthly' : 'Yearly'} Summary`;
        doc.setFontSize(14);
        doc.text(title, 14, 35);
        doc.setFontSize(12);
        doc.text(`Total Books Issued: ${reportData.totalIssued}`, 14, 43);
        
        (doc as any).autoTable({
            startY: 50,
            head: [['Rank', 'Title', 'Author', 'Times Borrowed']],
            body: reportData.mostBorrowed.map((item, index) => [
                index + 1,
                item.book?.title || 'N/A',
                item.book?.author || 'N/A',
                item.count
            ]),
        });
        doc.save(`library_report_${reportPeriod}.pdf`);
    };

    const handleReportExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(
            reportData.mostBorrowed.map((item, index) => ({
                Rank: index + 1,
                Title: item.book?.title || 'N/A',
                Author: item.book?.author || 'N/A',
                'Times Borrowed': item.count
            }))
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Most Borrowed Books");
        XLSX.writeFile(workbook, `library_report_${reportPeriod}.xlsx`);
    };

    const availableBooksForIssue = books.filter(b => b.available > 0);

    const renderContent = () => {
        if (isLoading) return <div className="text-center py-10">Loading library data...</div>;
        if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
        
        if (activeTab === 'reports') {
            return (
                <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <button onClick={() => setReportPeriod('monthly')} className={`px-4 py-2 rounded-l-md ${reportPeriod === 'monthly' ? 'bg-brand-primary text-white' : 'bg-gray-200'}`}>Monthly</button>
                            <button onClick={() => setReportPeriod('yearly')} className={`px-4 py-2 rounded-r-md ${reportPeriod === 'yearly' ? 'bg-brand-primary text-white' : 'bg-gray-200'}`}>Yearly</button>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={handleReportExportPDF} className="bg-red-600 text-white px-3 py-1 text-sm rounded-md font-semibold hover:bg-red-700 flex items-center gap-1"><FilePdfIcon className="w-4 h-4" /> PDF</button>
                             <button onClick={handleReportExportExcel} className="bg-green-600 text-white px-3 py-1 text-sm rounded-md font-semibold hover:bg-green-700 flex items-center gap-1"><FileExcelIcon className="w-4 h-4" /> Excel</button>
                        </div>
                    </div>
                    <div className="mb-6"><p className="text-lg font-bold">Total Books Issued this {reportPeriod === 'monthly' ? 'Month' : 'Year'}: <span className="text-brand-primary">{reportData.totalIssued}</span></p></div>
                    
                    <h3 className="font-bold text-text-primary mb-2">Top 10 Most Borrowed Books ({reportPeriod === 'monthly' ? 'This Month' : 'This Year'})</h3>
                     <table className="w-full text-left">
                        <thead><tr className="bg-gray-50 border-b"><th className="p-3 font-semibold">Rank</th><th className="p-3 font-semibold">Title</th><th className="p-3 font-semibold">Author</th><th className="p-3 font-semibold text-center">Times Borrowed</th></tr></thead>
                        <tbody>
                            {reportData.mostBorrowed.map((item, index) => (
                                <tr key={item.book?.id} className="border-b"><td className="p-3">{index + 1}</td><td className="p-3 font-medium">{item.book?.title}</td><td className="p-3">{item.book?.author}</td><td className="p-3 text-center font-bold">{item.count}</td></tr>
                            ))}
                        </tbody>
                    </table>
                    {reportData.mostBorrowed.length === 0 && <p className="text-center py-6">No borrowing data for this period.</p>}
                </div>
            );
        }

        if (activeTab === 'overdue') {
            return (
                 <table className="w-full text-left">
                    <thead>
                        <tr className="bg-red-50 border-b">
                            <th className="p-4 font-semibold text-red-800">Book Title</th>
                            <th className="p-4 font-semibold text-red-800">Student</th>
                            <th className="p-4 font-semibold text-red-800">Due Date</th>
                            <th className="p-4 font-semibold text-red-800 text-center">Days Overdue</th>
                            {canManageBooks && <th className="p-4 font-semibold text-red-800 text-center">Action</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOverdueTransactions.map(t => {
                            const daysOverdue = Math.floor((new Date().getTime() - new Date(t.dueDate).getTime()) / (1000 * 3600 * 24));
                            return (
                                <tr key={t.id} className="border-b hover:bg-red-50/50 transition-colors">
                                    <td className="p-4 text-text-primary font-medium">{findBookTitle(t.bookId)}</td>
                                    <td className="p-4 text-text-secondary">{findStudentName(t.studentId)}</td>
                                    <td className="p-4 text-text-secondary">{t.dueDate}</td>
                                    <td className="p-4 font-bold text-red-600 text-center">{daysOverdue}</td>
                                    {canManageBooks && (
                                        <td className="p-4 text-center">
                                            <button onClick={() => handleReturnBook(t.id)} className="bg-brand-secondary text-white px-3 py-1 text-sm rounded-md hover:bg-brand-dark transition-colors flex items-center mx-auto">
                                                <ClipboardCheckIcon className="w-4 h-4 mr-1" />
                                                Return
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            )
                        })}
                         {filteredOverdueTransactions.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-10 text-text-secondary">No overdue books. Great job!</td></tr>
                        )}
                    </tbody>
                </table>
            );
        }


        if (activeTab === 'books') {
            return (
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-4 font-semibold text-text-secondary">Title</th>
                            <th className="p-4 font-semibold text-text-secondary">Author</th>
                            <th className="p-4 font-semibold text-text-secondary">ISBN</th>
                            <th className="p-4 font-semibold text-text-secondary text-center">Total</th>
                            <th className="p-4 font-semibold text-text-secondary text-center">Available</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBooks.map(book => (
                            <tr key={book.id} className="border-b hover:bg-brand-light transition-colors">
                                <td className="p-4 text-text-primary font-medium">{book.title}</td>
                                <td className="p-4 text-text-secondary">{book.author}</td>
                                <td className="p-4 text-text-secondary">{book.isbn}</td>
                                <td className="p-4 text-text-secondary text-center">{book.quantity}</td>
                                <td className="p-4 font-bold text-text-primary text-center">{book.available}</td>
                            </tr>
                        ))}
                         {filteredBooks.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-10 text-text-secondary">No books found.</td></tr>
                        )}
                    </tbody>
                </table>
            );
        }

        if (activeTab === 'transactions') {
            return (
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-4 font-semibold text-text-secondary">Book Title</th>
                            <th className="p-4 font-semibold text-text-secondary">Student</th>
                            <th className="p-4 font-semibold text-text-secondary">Issue Date</th>
                            <th className="p-4 font-semibold text-text-secondary">Due Date</th>
                            <th className="p-4 font-semibold text-text-secondary">Status</th>
                        </tr>
                    </thead>
                        <tbody>
                        {filteredTransactions.map(t => (
                            <tr key={t.id} className="border-b hover:bg-brand-light transition-colors">
                                <td className="p-4 text-text-primary font-medium">{findBookTitle(t.bookId)}</td>
                                <td className="p-4 text-text-secondary">{findStudentName(t.studentId)}</td>
                                <td className="p-4 text-text-secondary">{t.issueDate}</td>
                                <td className="p-4 text-text-secondary">{t.dueDate}</td>
                                <td className="p-4">
                                    {t.returnDate ? 
                                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Returned on {t.returnDate}</span> :
                                        new Date(t.dueDate) < new Date() ?
                                        <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Overdue</span> :
                                        <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">Issued</span>
                                    }
                                </td>
                            </tr>
                        ))}
                        {filteredTransactions.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-10 text-text-secondary">No transactions found.</td></tr>
                        )}
                    </tbody>
                </table>
            );
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary mb-4 sm:mb-0">Library Dashboard</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center border border-gray-200">
                    <div className="bg-blue-100 p-3 rounded-full mr-4"><BookOpenIcon className="w-8 h-8 text-blue-500" /></div>
                    <div><p className="text-sm text-text-secondary font-medium">Total Books</p><p className="text-2xl font-bold text-text-primary">{stats.totalBooksCount}</p></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center border border-gray-200">
                    <div className="bg-indigo-100 p-3 rounded-full mr-4"><PaperAirplaneIcon className="w-8 h-8 text-indigo-500" /></div>
                    <div><p className="text-sm text-text-secondary font-medium">Books Issued</p><p className="text-2xl font-bold text-text-primary">{stats.issuedBooksCount}</p></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center border border-gray-200">
                    <div className="bg-red-100 p-3 rounded-full mr-4"><ExclamationCircleIcon className="w-8 h-8 text-red-500" /></div>
                    <div><p className="text-sm text-text-secondary font-medium">Overdue Books</p><p className="text-2xl font-bold text-text-primary">{stats.overdueBooksCount}</p></div>
                </div>
                {canManageBooks && (
                    <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-center items-center gap-3 border border-gray-200">
                         <button onClick={openIssueModal} className="w-full bg-brand-primary text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-dark transition-colors flex items-center justify-center">
                            <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                            Issue Book
                        </button>
                        <button onClick={() => setAddModalOpen(true)} className="w-full bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 transition-colors flex items-center justify-center">
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Add New Book
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                 <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-xl font-bold text-text-primary">Library Data</h2>
                    { activeTab !== 'reports' && (
                        <input
                            type="text"
                            placeholder="Search in active tab..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-md w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                        />
                    )}
                </div>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                         <button onClick={() => { setActiveTab('overdue'); setSearchTerm(''); }} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overdue' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <ExclamationCircleIcon className="w-5 h-5" />
                            Overdue Books
                            {stats.overdueBooksCount > 0 && <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{stats.overdueBooksCount}</span>}
                        </button>
                        <button onClick={() => { setActiveTab('books'); setSearchTerm(''); }} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'books' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <BookOpenIcon className="w-5 h-5" />
                            Books Catalog
                        </button>
                        <button onClick={() => { setActiveTab('transactions'); setSearchTerm(''); }} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'transactions' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <ClipboardListIcon className="w-5 h-5" />
                            Lending History
                        </button>
                         <button onClick={() => { setActiveTab('reports'); setSearchTerm(''); }} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'reports' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            <ChartBarIcon className="w-5 h-5" />
                            Reports
                        </button>
                    </nav>
                </div>

                <div className="overflow-x-auto mt-4">
                    {renderContent()}
                </div>
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Add New Book to Library">
                <form onSubmit={handleAddBook} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Book Title</label>
                        <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Author</label>
                        <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ISBN</label>
                        <input type="text" value={newBook.isbn} onChange={e => setNewBook({...newBook, isbn: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input type="number" min="1" value={newBook.quantity} onChange={e => setNewBook({...newBook, quantity: Number(e.target.value)})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button type="button" onClick={() => setAddModalOpen(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold mr-2">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md font-semibold">Add Book</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isIssueModalOpen} onClose={closeIssueModal} title="Issue a Book">
                <form onSubmit={handleIssueBook} className="space-y-4">
                    <div>
                        <label htmlFor="bookId" className="block text-sm font-medium text-gray-700">Book</label>
                        <select id="bookId" value={issueData.bookId} onChange={e => setIssueData({...issueData, bookId: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" required>
                            <option value="" disabled>Select a book</option>
                            {availableBooksForIssue.map(book => (
                                <option key={book.id} value={book.id}>{book.title} (by {book.author})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="admissionNumberSearch" className="block text-sm font-medium text-gray-700">Student Admission Number</label>
                        <div className="flex gap-2 mt-1">
                            <input
                                type="text"
                                id="admissionNumberSearch"
                                value={admissionNumberSearch}
                                onChange={(e) => setAdmissionNumberSearch(e.target.value)}
                                className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                                placeholder="e.g. S001"
                            />
                            <button
                                type="button"
                                onClick={handleFindStudent}
                                className="bg-brand-secondary text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-dark transition-colors"
                            >
                                Find
                            </button>
                        </div>
                        {findStudentError && <p className="text-red-500 text-sm mt-2">{findStudentError}</p>}
                        {foundStudent && (
                            <div className="mt-3 bg-green-50 p-3 rounded-lg border border-green-200">
                                <p className="font-semibold text-green-800">Student Found: {foundStudent.name} ({foundStudent.class})</p>
                            </div>
                        )}
                    </div>
                     <div className="pt-4 flex justify-end">
                        <button type="button" onClick={closeIssueModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition-colors mr-2">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={!foundStudent || !issueData.bookId}
                            className="bg-brand-primary text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Issue Book
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LibraryManagement;
