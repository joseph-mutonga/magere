import { User, UserRole, Student, Teacher, Subject, Book, LibraryTransaction, InventoryItem, InventoryCategory, Grade, LeaveRequest, IssuedInventory, InventoryRequest, AttendanceRecord, PastPaper, TimecFile, ExerciseBookStock, ExerciseBookIssue, SuspensionRecord, BlackBookEntry } from '../types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// A tiny, valid base64 PDF that just says "Past Paper"
const dummyPdfBase64 = "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlIC9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZSAvUGFnZXMvQ291bnQgMS9LaWRzIFsgMyAwIFIgXT4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUgL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94IFsgMCAwIDMwMCAzMF0vQ29udGVudHMgNCAwIFIvUmVzb3VyY2VzIDw8L0ZvbnQgPDwvRjEgNSAwIFI+Pj4+Pj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQzPj4Kc3RyZWFtCkJUCjcgMjAgVEQKLUYxIDEyIFRmCihQYXN0IFBhcGVyKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwvVHlwZSAvRm9udC9TdWJ0eXBlIC9UeXBlMS9CYXNlRm9udCAvSGVsdmV0aWNhPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1M1MiIGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2MyAwMDAwMCBuIAowMDAwMDAwMTIzIDAwMDAwIG4gCjAwMDAwMDAyNDggMDAwMDAgbiAKMDAwMDAwMDMzMyAwMDAwMCBuIAp0cmFpbGVyCjw8L1Jvb3QgMSAwIFIvU2l6ZSA2Pj4Kc3RhcnR4cmVmCjM5NQolJUVPRgo=";
// A tiny, valid base64 DOC file that just says "TIMEC Document"
const dummyDocBase64 = "UEsDBBQAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAlBvcC5kb2MAAABQSwECFAAUAAAACAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAASAAAAAAAAABgAAAAAAAABQSwUGAAAAAAEAAQBQAAAAwgAAAAAA";

export const mockSubjects: Subject[] = [
    { id: 'subj-1', name: 'Mathematics', code: 'MATH101' },
    { id: 'subj-2', name: 'English', code: 'ENG101' },
    { id: 'subj-3', name: 'Kiswahili', code: 'SWA101' },
    { id: 'subj-4', name: 'Physics', code: 'PHY201' },
    { id: 'subj-5', name: 'Chemistry', code: 'CHEM201' },
    { id: 'subj-6', name: 'Biology', code: 'BIO201' },
    { id: 'subj-7', name: 'History', code: 'HIST201' },
    { id: 'subj-8', name: 'Geography', code: 'GEO201' },
    { id: 'subj-9', name: 'Computer Studies', code: 'COMP101' },
];

export const mockTeachers: Teacher[] = [
    { id: 'teach-1', name: 'Mr. John Doe', employeeId: 'T001', subjectIds: ['subj-1', 'subj-4'], classInCharge: 'Form 4' },
    { id: 'teach-2', name: 'Mrs. Jane Smith', employeeId: 'T002', subjectIds: ['subj-2', 'subj-3'] },
    { id: 'teach-3', name: 'Mr. Peter Jones', employeeId: 'T003', subjectIds: ['subj-5', 'subj-6'], classInCharge: 'Form 3' },
    { id: 'teach-4', name: 'Mr. Muchangi', employeeId: 'T004', subjectIds: ['subj-7', 'subj-8'] },
    { id: 'teach-5', name: 'Madam Kamau', employeeId: 'T005', subjectIds: ['subj-9'] },
];

export const mockStudents: Student[] = [
    // Form 4
    { id: 'stud-1', name: 'Alice Johnson', admissionNumber: 'S001', class: 'Form 4', dateOfBirth: '2006-05-15', parentPhoneNumber: '0722123456' },
    { id: 'stud-2', name: 'Bob Williams', admissionNumber: 'S002', class: 'Form 4', dateOfBirth: '2006-03-22', parentPhoneNumber: '0723987654' },
    { id: 'stud-3', name: 'Charlie Brown', admissionNumber: 'S003', class: 'Form 4', dateOfBirth: '2006-08-10', parentPhoneNumber: '0724112233' },
    // Form 3
    { id: 'stud-4', name: 'Diana Miller', admissionNumber: 'S004', class: 'Form 3', dateOfBirth: '2007-01-30', parentPhoneNumber: '0725445566' },
    { id: 'stud-5', name: 'Ethan Davis', admissionNumber: 'S005', class: 'Form 3', dateOfBirth: '2007-07-19', parentPhoneNumber: '0726778899' },
    // Form 2
    { id: 'stud-6', name: 'Fiona Garcia', admissionNumber: 'S006', class: 'Form 2', dateOfBirth: '2008-04-05', parentPhoneNumber: '0727101112' },
    // Form 1
    { id: 'stud-7', name: 'George Rodriguez', admissionNumber: 'S007', class: 'Form 1', dateOfBirth: '2009-11-12', parentPhoneNumber: '0728131415' },
];

export const mockUsers: User[] = [
    { id: 'user-1', name: 'Joseph Maina', role: UserRole.PRINCIPAL },
    { id: 'user-dp-1', name: 'Mrs. Susan Okech', role: UserRole.DEPUTY_PRINCIPAL },
    { id: 'user-2', name: 'Mr. Admin', role: UserRole.ADMIN },
    { id: 'user-3', name: 'Mr. John Doe', role: UserRole.TEACHER },
    { id: 'user-4', name: 'Mrs. Jane Smith', role: UserRole.TEACHER },
    { id: 'user-5', name: 'Mr. Peter Jones', role: UserRole.TEACHER },
    { id: 'user-6', name: 'Mr. Muchangi', role: UserRole.TEACHER },
    { id: 'user-7', name: 'Alice Johnson', role: UserRole.STUDENT },
    { id: 'user-8', name: 'Bob Williams', role: UserRole.STUDENT },
    { id: 'user-9', name: 'Mr. David Korir', role: UserRole.LIBRARIAN },
    { id: 'user-10', name: 'Mrs. Mary Akinyi', role: UserRole.REGISTRAR },
    { id: 'user-11', name: 'Ms. Fatuma Ali', role: UserRole.SECRETARY },
    { id: 'user-12', name: 'Mr. Nzuki', role: UserRole.ACADEMICS_DEPT },
    { id: 'user-hod-1', name: 'Mr. James Maina', role: UserRole.HOD },
    { id: 'user-13', name: 'Madam Kamau', role: UserRole.TEACHER },
];

export const mockGrades: Grade[] = [
    // Form 4 Term 2 Endterm
    { id: 'grade-1', studentId: 'stud-1', subjectId: 'subj-1', score: 85, term: 'Term 2 Endterm', year: 2024 },
    { id: 'grade-2', studentId: 'stud-1', subjectId: 'subj-2', score: 92, term: 'Term 2 Endterm', year: 2024 },
    { id: 'grade-3', studentId: 'stud-2', subjectId: 'subj-1', score: 78, term: 'Term 2 Endterm', year: 2024 },
    { id: 'grade-4', studentId: 'stud-2', subjectId: 'subj-2', score: 88, term: 'Term 2 Endterm', year: 2024 },
    // Form 3 Term 2 Endterm
    { id: 'grade-5', studentId: 'stud-4', subjectId: 'subj-5', score: 75, term: 'Term 2 Endterm', year: 2024 },
    { id: 'grade-6', studentId: 'stud-4', subjectId: 'subj-6', score: 81, term: 'Term 2 Endterm', year: 2024 },
];

export const mockBooks: Book[] = [
    { id: 'book-1', title: 'A Doll\'s House', author: 'Henrik Ibsen', isbn: '978-0486270623', quantity: 10, available: 8 },
    { id: 'book-2', title: 'The River and the Source', author: 'Margaret Ogola', isbn: '978-9966882033', quantity: 15, available: 15 },
    { id: 'book-3', title: 'Physics for Secondary Schools', author: 'KIE', isbn: '978-9966100123', quantity: 20, available: 18 },
];

export const mockLibraryTransactions: LibraryTransaction[] = [
    { id: 'txn-1', bookId: 'book-1', studentId: 'stud-1', issueDate: '2024-07-10', dueDate: '2024-07-24', returnDate: null },
    { id: 'txn-2', bookId: 'book-3', studentId: 'stud-2', issueDate: '2024-07-12', dueDate: '2024-07-26', returnDate: null },
    { id: 'txn-3', bookId: 'book-1', studentId: 'stud-4', issueDate: '2024-06-01', dueDate: '2024-06-15', returnDate: '2024-06-14' },
    { id: 'txn-4', bookId: 'book-2', studentId: 'stud-5', issueDate: '2024-05-20', dueDate: '2024-06-03', returnDate: null }, // Overdue
];

export const mockInventory: InventoryItem[] = [
    { id: 'inv-1', name: 'Lab Coats', category: InventoryCategory.LAB_EQUIPMENT, quantity: 50, minStockLevel: 10 },
    { id: 'inv-2', name: 'Football', category: InventoryCategory.SPORTS_ITEM, quantity: 8, minStockLevel: 5 },
    { id: 'inv-3', name: 'Chalk Box', category: InventoryCategory.TEACHING_MATERIAL, quantity: 100, minStockLevel: 20 },
    { id: 'inv-4', name: 'Ream Papers', category: InventoryCategory.STATIONERY, quantity: 4, minStockLevel: 10 }, // Low stock
];

export const mockLeaveRequests: LeaveRequest[] = [
    { id: 'leave-1', teacherId: 'teach-2', requestDate: '2024-07-20', leaveStartDate: '2024-08-01', leaveEndDate: '2024-08-05', reason: 'Family event', status: 'Pending' },
    { id: 'leave-2', teacherId: 'teach-4', requestDate: '2024-07-15', leaveStartDate: '2024-07-22', leaveEndDate: '2024-07-23', reason: 'Medical appointment', status: 'Approved', principalComment: 'Approved' },
];

export const mockIssuedInventory: IssuedInventory[] = [
    { id: 'iss-1', item_id: 'inv-3', item_name: 'Chalk Box', teacher_id: 'teach-1', teacher_name: 'Mr. John Doe', quantity: 2, date: '2024-07-18', notes: 'For Form 4 Maths' },
    { id: 'iss-2', item_id: 'inv-1', item_name: 'Lab Coats', teacher_id: 'teach-3', teacher_name: 'Mr. Peter Jones', quantity: 10, date: '2024-07-15', notes: 'For Chem practicals' },
];

export const mockInventoryRequests: InventoryRequest[] = [
    { id: 'req-1', teacher_id: 'teach-1', teacher_name: 'Mr. John Doe', item_id: 'inv-4', item_name: 'Ream Papers', quantity: 5, status: 'Pending', request_date: '2024-07-22' },
    { id: 'req-2', teacher_id: 'teach-2', teacher_name: 'Mrs. Jane Smith', item_id: 'inv-3', item_name: 'Chalk Box', quantity: 1, status: 'Approved', request_date: '2024-07-20' },
];

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

const generateAttendanceForTeacher = (teacherId: string, year: number, month: number, presentDays: number[]) => {
    return presentDays.map(day => ({
        id: generateId(),
        userId: teacherId,
        userType: 'teacher' as 'teacher',
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        timeIn: `07:${String(Math.floor(Math.random() * 30) + 15).padStart(2, '0')}`
    }));
};

const generateStudentAttendance = (studentId: string, year: number, month: number, presentDays: number[]) => {
    return presentDays.map(day => ({
        id: generateId(),
        userId: studentId,
        userType: 'student' as 'student',
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        timeIn: `07:${String(Math.floor(Math.random() * 45) + 15).padStart(2, '0')}`
    }));
};


export const mockAttendance: AttendanceRecord[] = [
    // Today's attendance
    { id: generateId(), userId: 'stud-1', userType: 'student', date: todayStr, timeIn: '07:30' },
    { id: generateId(), userId: 'stud-2', userType: 'student', date: todayStr, timeIn: '07:35' },
    { id: generateId(), userId: 'teach-1', userType: 'teacher', date: todayStr, timeIn: '07:15' },
    { id: 'current-date-teach-2', userId: 'teach-2', userType: 'teacher', date: todayStr, timeIn: '07:20' },
    
    // Historical Teacher Attendance (Current Month)
    ...generateAttendanceForTeacher('teach-1', today.getFullYear(), today.getMonth() + 1, [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22]),
    ...generateAttendanceForTeacher('teach-2', today.getFullYear(), today.getMonth() + 1, [1, 2, 3, 5, 8, 9, 10, 11, 12, 15, 16, 18, 19, 22]),
    
    // Historical Teacher Attendance (Previous Month)
    ...generateAttendanceForTeacher('teach-1', today.getFullYear(), today.getMonth(), [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21]),
    ...generateAttendanceForTeacher('teach-2', today.getFullYear(), today.getMonth(), [3, 4, 5, 6, 7, 10, 11, 13, 14, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28]),
    ...generateAttendanceForTeacher('teach-3', today.getFullYear(), today.getMonth(), [3, 4, 6, 7, 10, 11, 12, 13, 14, 17, 18, 19, 21]),
    ...generateAttendanceForTeacher('teach-4', today.getFullYear(), today.getMonth(), [4, 5, 6, 7, 10, 11, 12, 13, 17, 18, 19, 20, 21, 24, 25, 26]),

    // Historical Student Attendance
    ...generateStudentAttendance('stud-1', today.getFullYear(), today.getMonth() + 1, [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22]),
    ...generateStudentAttendance('stud-4', today.getFullYear(), today.getMonth() + 1, [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22].filter(d => d % 3 !== 0)), // some absences
];

export const mockPastPapers: PastPaper[] = [
    {
        id: 'pp-1',
        subjectId: 'subj-1',
        class: 'Form 4',
        term: 'Term 1 Midterm',
        year: 2023,
        fileName: 'math-f4-t1-mid-2023.pdf',
        fileContent: dummyPdfBase64,
        uploadedById: 'teach-1',
        uploadDate: '2023-04-15'
    },
    {
        id: 'pp-2',
        subjectId: 'subj-4',
        class: 'Form 4',
        term: 'Term 2 Endterm',
        year: 2023,
        fileName: 'phy-f4-t2-end-2023.pdf',
        fileContent: dummyPdfBase64,
        uploadedById: 'teach-1',
        uploadDate: '2023-08-20'
    },
    {
        id: 'pp-3',
        subjectId: 'subj-2',
        class: 'Form 3',
        term: 'Term 2 Endterm',
        year: 2023,
        fileName: 'eng-f3-t2-end-2023.pdf',
        fileContent: dummyPdfBase64,
        uploadedById: 'teach-2',
        uploadDate: '2023-08-21'
    }
];

export const mockTimecFiles: TimecFile[] = [
    {
        id: 'timec-1',
        fileName: 'Curriculum_Review_2024.doc',
        fileContent: dummyDocBase64,
        title: '2024 Curriculum Review Minutes',
        uploadedById: 'user-12',
        uploadedByRole: UserRole.ACADEMICS_DEPT,
        uploadDate: '2024-07-20',
    }
];

export const mockExerciseBookStock: ExerciseBookStock[] = mockSubjects.map(subject => ({
    id: `ex-stock-${subject.id}`,
    subjectId: subject.id,
    quantity: 500, // Initial stock for all subjects
    lastIssuedDate: null,
}));

export const mockExerciseBookIssues: ExerciseBookIssue[] = [];

export const mockSuspensionRecords: SuspensionRecord[] = [];

export const mockBlackBookEntries: BlackBookEntry[] = [];