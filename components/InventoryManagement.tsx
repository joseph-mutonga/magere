


import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, InventoryCategory, User, IssuedInventory, Teacher } from '../types';
import Modal from './common/Modal';
import * as api from '../services/api';
import { ChartBarIcon, FileExcelIcon, FilePdfIcon } from './common/Icons';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { schoolLogoBase64 } from '../services/logo';


interface InventoryManagementProps {
    currentUser: User;
}

const InventoryManagement: React.FC<InventoryManagementProps> = ({ currentUser }) => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [issuedInventory, setIssuedInventory] = useState<IssuedInventory[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState<'inventory' | 'logs' | 'reports'>('inventory');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [reportPeriod, setReportPeriod] = useState<'monthly' | 'yearly'>('yearly');

    const [isIssueModalOpen, setIssueModalOpen] = useState(false);
    const [issueData, setIssueData] = useState({ teacher_id: '', item_id: '', quantity: 1, notes: '' });
    
    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [invData, issuedData, teachersData] = await Promise.all([
                api.get('/inventory'),
                api.get('/inventory/issued'),
                api.get('/teachers')
            ]);
            setInventory(invData);
            setIssuedInventory(issuedData);
            setTeachers(teachersData);
        } catch (err: any) {
            setError('Failed to fetch inventory data. ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);
    
    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [inventory, searchTerm, categoryFilter]);
    
    const reportData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        const issuesToConsider = reportPeriod === 'yearly'
            ? issuedInventory.filter(i => new Date(i.date).getFullYear() === currentYear)
            : issuedInventory.filter(i => {
                const issueDate = new Date(i.date);
                return issueDate.getFullYear() === currentYear && issueDate.getMonth() === currentMonth;
            });

        const totalItemsIssued = issuesToConsider.reduce((sum, item) => sum + item.quantity, 0);

        const itemConsumption = issuesToConsider.reduce((acc, issue) => {
            acc[issue.item_id] = (acc[issue.item_id] || 0) + issue.quantity;
            return acc;
        }, {} as Record<string, number>);

        const mostIssuedItems = Object.entries(itemConsumption)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([itemId, quantity]) => ({
                item: inventory.find(i => i.id === itemId),
                quantity
            }));
        
        const categoryConsumption = issuesToConsider.reduce((acc, issue) => {
            const itemDetails = inventory.find(i => i.id === issue.item_id);
            if (itemDetails) {
                acc[itemDetails.category] = (acc[itemDetails.category] || 0) + issue.quantity;
            }
            return acc;
        }, {} as Record<string, number>);

        const consumptionByCategory = Object.entries(categoryConsumption)
            .sort((a, b) => b[1] - a[1])
            .map(([category, quantity]) => ({ category, quantity }));

        return {
            totalItemsIssued,
            mostIssuedItems,
            consumptionByCategory
        };
    }, [issuedInventory, inventory, reportPeriod]);


    const handleIssueItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const { item_id, quantity } = issueData;
        const item = inventory.find(i => i.id === item_id);
        if (!item || item.quantity < quantity) {
            alert("Not enough items in stock.");
            return;
        }

        try {
            await api.post('/inventory/issued', issueData);
            setIssueModalOpen(false);
            setIssueData({ teacher_id: '', item_id: '', quantity: 1, notes: '' });
            fetchData(); // Refetch all data
        } catch(err: any) {
            alert('Failed to issue item: ' + err.message);
        }
    };
    
    const handleReportExportPDF = () => {
        const doc = new jsPDF();
        
        doc.addImage(schoolLogoBase64, 'PNG', 14, 10, 60, 15);
        
        const title = `Inventory Report - ${reportPeriod === 'monthly' ? 'Monthly' : 'Yearly'} Summary`;
        doc.setFontSize(14);
        doc.text(title, 14, 35);
        doc.setFontSize(12);
        doc.text(`Total Items Issued: ${reportData.totalItemsIssued}`, 14, 43);

        (doc as any).autoTable({
            startY: 52,
            head: [['Rank', 'Item Name', 'Category', 'Quantity Issued']],
            body: reportData.mostIssuedItems.map((item, index) => [
                index + 1,
                item.item?.name || 'N/A',
                item.item?.category || 'N/A',
                item.quantity
            ]),
            addPageContent: () => doc.text('Top 10 Most Issued Items', 14, 48)
        });
        
        (doc as any).autoTable({
            startY: (doc as any).lastAutoTable.finalY + 15,
            head: [['Category', 'Total Quantity Issued']],
            body: reportData.consumptionByCategory.map(cat => [cat.category, cat.quantity]),
            addPageContent: () => doc.text('Consumption by Category', 14, (doc as any).lastAutoTable.finalY + 10)
        });

        doc.save(`inventory_report_${reportPeriod}.pdf`);
    };

    const handleReportExportExcel = () => {
        const ws1 = XLSX.utils.json_to_sheet(
            reportData.mostIssuedItems.map((item, index) => ({
                Rank: index + 1,
                'Item Name': item.item?.name || 'N/A',
                Category: item.item?.category || 'N/A',
                'Quantity Issued': item.quantity
            }))
        );
        const ws2 = XLSX.utils.json_to_sheet(
             reportData.consumptionByCategory.map(cat => ({
                Category: cat.category,
                'Total Quantity Issued': cat.quantity
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws1, "Most Issued Items");
        XLSX.utils.book_append_sheet(wb, ws2, "Consumption By Category");
        XLSX.writeFile(wb, `inventory_report_${reportPeriod}.xlsx`);
    };

    const renderContent = () => {
        if (isLoading) return <div className="text-center py-10">Loading inventory...</div>;
        if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

        if (activeTab === 'reports') {
            return (
                <div className="p-4 bg-white rounded-lg shadow-md border">
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
                    <p className="text-lg font-bold mb-6">Total Items Issued this {reportPeriod === 'monthly' ? 'Month' : 'Year'}: <span className="text-brand-primary">{reportData.totalItemsIssued}</span></p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold text-text-primary mb-2">Top 10 Most Issued Items</h3>
                            <table className="w-full text-left">
                                <thead><tr className="bg-gray-50 border-b"><th className="p-2 font-semibold">Item</th><th className="p-2 font-semibold text-center">Qty</th></tr></thead>
                                <tbody>{reportData.mostIssuedItems.map(i => <tr key={i.item?.id} className="border-b"><td className="p-2 font-medium">{i.item?.name}</td><td className="p-2 text-center font-bold">{i.quantity}</td></tr>)}</tbody>
                            </table>
                             {reportData.mostIssuedItems.length === 0 && <p className="text-center py-6">No data for this period.</p>}
                        </div>
                         <div>
                            <h3 className="font-bold text-text-primary mb-2">Consumption by Category</h3>
                            <table className="w-full text-left">
                                <thead><tr className="bg-gray-50 border-b"><th className="p-2 font-semibold">Category</th><th className="p-2 font-semibold text-center">Qty</th></tr></thead>
                                <tbody>{reportData.consumptionByCategory.map(c => <tr key={c.category} className="border-b"><td className="p-2 font-medium">{c.category}</td><td className="p-2 text-center font-bold">{c.quantity}</td></tr>)}</tbody>
                            </table>
                            {reportData.consumptionByCategory.length === 0 && <p className="text-center py-6">No data for this period.</p>}
                        </div>
                    </div>
                </div>
            )
        }
        
        if (activeTab === 'inventory') {
            return (
                <>
                    <div className="w-full flex flex-col sm:flex-row items-center gap-2 my-4 p-4 bg-gray-50 rounded-md">
                        <input
                            type="text"
                            placeholder="Search by item name..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-md w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                        />
                        <select
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-md w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                        >
                            <option value="all">All Categories</option>
                            {Object.values(InventoryCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="p-4 font-semibold text-text-secondary">Item Name</th>
                                        <th className="p-4 font-semibold text-text-secondary">Category</th>
                                        <th className="p-4 font-semibold text-text-secondary">Quantity</th>
                                        <th className="p-4 font-semibold text-text-secondary">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInventory.map(item => (
                                        <tr key={item.id} className="border-b hover:bg-brand-light transition-colors">
                                            <td className="p-4 text-text-primary font-medium">{item.name}</td>
                                            <td className="p-4 text-text-secondary">{item.category}</td>
                                            <td className="p-4 text-text-secondary font-bold">{item.quantity}</td>
                                            <td className="p-4">
                                                {item.quantity <= item.minStockLevel ?
                                                    <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Low Stock</span> :
                                                    <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">In Stock</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredInventory.length === 0 && ( <div className="text-center py-10 text-text-secondary"><p>No items found.</p></div> )}
                    </div>
                </>
            );
        }

        if (activeTab === 'logs') {
            return (
                 <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="bg-gray-50 border-b"><th className="p-4 font-semibold">Date</th><th className="p-4 font-semibold">Item</th><th className="p-4 font-semibold">Qty</th><th className="p-4 font-semibold">Issued To</th><th className="p-4 font-semibold">Notes</th></tr></thead>
                            <tbody>
                                {issuedInventory.map(log => (
                                    <tr key={log.id} className="border-b hover:bg-brand-light">
                                        <td className="p-4 text-text-secondary">{log.date}</td>
                                        <td className="p-4 font-medium">{log.item_name}</td>
                                        <td className="p-4">{log.quantity}</td>
                                        <td className="p-4">{log.teacher_name}</td>
                                        <td className="p-4 text-sm">{log.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }
    };
    
    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-text-primary">Inventory Management</h1>
                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                     <button onClick={() => setIssueModalOpen(true)} className="bg-brand-primary text-white px-4 py-2 rounded-md font-semibold hover:bg-brand-dark transition-colors w-full sm:w-auto">Issue Item</button>
                </div>
            </div>

             <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('inventory')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'inventory' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Stock Levels
                    </button>
                    <button onClick={() => setActiveTab('logs')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'logs' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Transaction Log
                    </button>
                    <button onClick={() => setActiveTab('reports')} className={`whitespace-nowrap flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'reports' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <ChartBarIcon className="w-5 h-5"/> Reports
                    </button>
                </nav>
            </div>
            
            {renderContent()}

            <Modal isOpen={isIssueModalOpen} onClose={() => setIssueModalOpen(false)} title="Issue Inventory Item">
                 <form onSubmit={handleIssueItem} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Item</label>
                        <select value={issueData.item_id} onChange={e => setIssueData({...issueData, item_id: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" required>
                            <option value="" disabled>Select an item</option>
                            {inventory.filter(i => i.quantity > 0).map(i => <option key={i.id} value={i.id}>{i.name} (In stock: {i.quantity})</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Teacher</label>
                        <select value={issueData.teacher_id} onChange={e => setIssueData({...issueData, teacher_id: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" required>
                            <option value="" disabled>Select a teacher</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input type="number" min="1" value={issueData.quantity} onChange={e => setIssueData({...issueData, quantity: parseInt(e.target.value) || 1})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea value={issueData.notes} onChange={e => setIssueData({...issueData, notes: e.target.value})} rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary" />
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button type="button" onClick={() => setIssueModalOpen(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold mr-2">Cancel</button>
                        <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-md font-semibold">Issue Item</button>
                    </div>
                 </form>
            </Modal>
        </div>
    );
};

export default InventoryManagement;
