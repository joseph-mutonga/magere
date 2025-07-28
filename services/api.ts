import {
    mockUsers, mockStudents, mockTeachers, mockSubjects, mockBooks, mockLibraryTransactions,
    mockInventory, mockIssuedInventory, mockGrades, mockLeaveRequests, mockInventoryRequests, mockAttendance, mockPastPapers, mockTimecFiles, mockExerciseBookStock, mockExerciseBookIssues, mockSuspensionRecords, mockBlackBookEntries
} from './mockData';
import { User, UserRole, Student, InventoryRequest, IssuedInventory, LeaveRequest, LibraryTransaction, Grade, Teacher, InventoryItem, PastPaper, TimecFile, ExerciseBookStock, ExerciseBookIssue, SuspensionRecord, SuspensionStatus, Book, BlackBookEntry, BlackBookStatus } from '../types';

let data = {
    users: [...mockUsers],
    students: [...mockStudents],
    teachers: [...mockTeachers],
    subjects: [...mockSubjects],
    books: [...mockBooks],
    libraryTransactions: [...mockLibraryTransactions],
    inventory: [...mockInventory],
    issuedInventory: [...mockIssuedInventory],
    grades: [...mockGrades],
    leaveRequests: [...mockLeaveRequests],
    inventoryRequests: [...mockInventoryRequests],
    attendance: [...mockAttendance],
    pastPapers: [...mockPastPapers],
    timecFiles: [...mockTimecFiles],
    exerciseBookStock: [...mockExerciseBookStock],
    exerciseBookIssues: [...mockExerciseBookIssues],
    suspensionRecords: [...mockSuspensionRecords],
    blackBookEntries: [...mockBlackBookEntries],
};

// Function to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
const generateId = () => Math.random().toString(36).substr(2, 9);

const findUserByName = (name: string): User | undefined => {
    return data.users.find(u => u.name === name);
};

const getCurrentUser = (): User | null => {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
};


export const login = async (username: string, password?: string) => {
    await delay(500);
    const user = findUserByName(username);
    if (user) {
        const token = `mock-token-for-${user.id}-${Date.now()}`;
        console.log(`Mock login successful for ${username}.`);
        return Promise.resolve({ access_token: token, user });
    }
    console.error(`Mock login failed for ${username}.`);
    throw new Error('User not found in mock data.');
};

const clone = (d: any) => JSON.parse(JSON.stringify(d));

const checkSuspensions = () => {
    const today = new Date();
    today.setHours(0,0,0,0); // for date-only comparison
    data.suspensionRecords.forEach(rec => {
        if (rec.status === SuspensionStatus.ACTIVE && new Date(rec.suspensionEndDate) < today) {
            rec.status = SuspensionStatus.COMPLETED;
        }
    });
};

export const get = async (path: string) => {
    await delay(200);
    console.log(`Mock GET request for: ${path}`);
    checkSuspensions(); // Run this check on any GET request to simulate background updates

    const resource = path.startsWith('/') ? path.substring(1) : path;
    const key = resource.split('/')[0];

    switch (key) {
        case 'users': return clone(data.users);
        case 'students': return clone(data.students);
        case 'teachers': return clone(data.teachers);
        case 'books': return clone(data.books);
        case 'library': return clone(data.libraryTransactions);
        case 'inventory':
            const subPath = resource.split('/')[1];
            if (subPath === 'requests') return clone(data.inventoryRequests);
            if (subPath === 'issued') return clone(data.issuedInventory);
            return clone(data.inventory);
        case 'grades': return clone(data.grades);
        case 'leave-requests': return clone(data.leaveRequests);
        case 'subjects': return clone(data.subjects);
        case 'attendance': return clone(data.attendance);
        case 'past-papers': return clone(data.pastPapers);
        case 'timec-files': return clone(data.timecFiles);
        case 'exercise-book-stock': return clone(data.exerciseBookStock);
        case 'exercise-book-issues': return clone(data.exerciseBookIssues);
        case 'suspensions': return clone(data.suspensionRecords);
        case 'black-book-entries': return clone(data.blackBookEntries);
        default:
            console.error(`No mock handler for GET ${path}`);
            throw new Error(`No mock handler for GET ${path}`);
    }
};

export const post = async (path: string, body: any) => {
    await delay(300);
    console.log(`Mock POST request for: ${path} with body:`, body);
    const resource = path.startsWith('/') ? path.substring(1) : path;
    const currentUser = getCurrentUser();

    if (!currentUser) throw new Error("Authentication required.");

    switch (resource) {
        case 'students':
            const newStudent: Student = {
                id: `stud-${generateId()}`,
                admissionNumber: `S${Math.floor(100 + Math.random() * 900)}`,
                ...body
            };
            data.students.push(newStudent);
            return clone(newStudent);
        
        case 'teachers':
            const newTeacher: Teacher = {
                id: `teach-${generateId()}`,
                employeeId: `T${Math.floor(100 + Math.random() * 900)}`,
                ...body
            };
            data.teachers.push(newTeacher);
            const newUser: User = {
                id: `user-${generateId()}`,
                name: newTeacher.name,
                role: UserRole.TEACHER,
            };
            data.users.push(newUser);
            return clone(newTeacher);

        case 'books':
            if (![UserRole.ADMIN, UserRole.LIBRARIAN, UserRole.PRINCIPAL].includes(currentUser.role)) {
                throw new Error("You are not authorized to add new books.");
            }
            const newBook: Book = {
                id: `book-${generateId()}`,
                ...body,
                available: body.quantity, // New books are fully available
            };
            data.books.push(newBook);
            return clone(newBook);

        case 'inventory':
            const newInventoryItem: InventoryItem = {
                id: `inv-${generateId()}`,
                ...body
            };
            data.inventory.push(newInventoryItem);
            return clone(newInventoryItem);

        case 'library/transactions':
            const isSuspended = data.suspensionRecords.some(r => r.studentId === body.student_id && r.status === SuspensionStatus.ACTIVE);
            if (isSuspended) {
                throw new Error("Cannot issue book. Student is currently suspended.");
            }
            const book = data.books.find(b => b.id === body.book_id);
            if (book && book.available > 0) {
                book.available -= 1;
                const newTx: LibraryTransaction = {
                    id: `txn-${generateId()}`,
                    bookId: body.book_id,
                    studentId: body.student_id,
                    issueDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    returnDate: null,
                };
                data.libraryTransactions.push(newTx);
                return clone(newTx);
            }
            throw new Error('Book not available');
        
        case 'inventory/requests':
            const teacherReq = data.teachers.find(t => t.name === currentUser.name);
            if (!teacherReq) throw new Error("Logged in user is not a recognized teacher.");

            const itemReq = data.inventory.find(i => i.id === body.item_id);
            const newInvReq: InventoryRequest = {
                id: `req-${generateId()}`,
                status: 'Pending',
                request_date: new Date().toISOString().split('T')[0],
                teacher_id: teacherReq.id,
                teacher_name: teacherReq.name,
                item_id: body.item_id,
                item_name: itemReq?.name || 'Unknown Item',
                quantity: body.quantity
            };
            data.inventoryRequests.push(newInvReq);
            return clone(newInvReq);

        case 'inventory/issued':
            const itemToIssue = data.inventory.find(i => i.id === body.item_id);
            if (itemToIssue && itemToIssue.quantity >= body.quantity) {
                itemToIssue.quantity -= body.quantity;
                const teacher = data.teachers.find(t => t.id === body.teacher_id);
                const newIssued: IssuedInventory = {
                    id: `iss-${generateId()}`,
                    date: new Date().toISOString().split('T')[0],
                    item_name: itemToIssue.name,
                    teacher_name: teacher?.name || 'Unknown Teacher',
                    ...body,
                };
                data.issuedInventory.push(newIssued);
                return clone(newIssued);
            }
            throw new Error('Not enough items in stock');

        case 'leave-requests':
            const teacherLeave = data.teachers.find(t => t.name === currentUser.name);
            if (!teacherLeave) throw new Error("Logged in user is not a recognized teacher.");

            const newLeaveReq: LeaveRequest = {
                id: `leave-${generateId()}`,
                teacherId: teacherLeave.id,
                requestDate: new Date().toISOString().split('T')[0],
                leaveStartDate: body.leaveStartDate,
                leaveEndDate: body.leaveEndDate,
                reason: body.reason,
                status: 'Pending',
            };
            data.leaveRequests.push(newLeaveReq);
            return clone(newLeaveReq);

        case 'grades/bulk-update':
            body.grades.forEach((newGrade: Grade) => {
                const existingGradeIndex = data.grades.findIndex(g => 
                    g.studentId === newGrade.studentId && 
                    g.subjectId === newGrade.subjectId && 
                    g.term === newGrade.term
                );
                if (existingGradeIndex > -1) {
                    data.grades[existingGradeIndex].score = newGrade.score;
                } else {
                    data.grades.push({ id: `grade-${generateId()}`, ...newGrade });
                }
            });
            return { message: 'Grades updated successfully' };
        
        case 'past-papers':
            const teacherUploader = data.teachers.find(t => t.name === currentUser.name);
            if (!teacherUploader) throw new Error("Only teachers can upload past papers.");

            const newPastPaper: PastPaper = {
                id: `pp-${generateId()}`,
                ...body,
                uploadedById: teacherUploader.id,
                uploadDate: new Date().toISOString().split('T')[0]
            };
            data.pastPapers.push(newPastPaper);
            return clone(newPastPaper);
        
        case 'timec-files':
             if (currentUser.role !== UserRole.ACADEMICS_DEPT) {
                throw new Error("Only the Academics Department can upload TIMEC files.");
            }
            const newTimecFile: TimecFile = {
                id: `timec-${generateId()}`,
                ...body,
                uploadedById: currentUser.id,
                uploadedByRole: currentUser.role,
                uploadDate: new Date().toISOString().split('T')[0]
            };
            data.timecFiles.push(newTimecFile);
            return clone(newTimecFile);
        
        case 'exercise-book-issues':
            if (currentUser.role !== UserRole.HOD) {
                throw new Error("Only HODs can issue exercise books.");
            }
            const student = data.students.find(s => s.admissionNumber === body.admissionNumber);
            if (!student) {
                throw new Error("Student with that admission number not found.");
            }
            const stock = data.exerciseBookStock.find(s => s.subjectId === body.subjectId);
            if (!stock) {
                throw new Error("Could not find exercise book stock for that subject.");
            }
            if (stock.quantity < body.quantity) {
                throw new Error(`Not enough stock. Only ${stock.quantity} books available for ${data.subjects.find(s => s.id === body.subjectId)?.name}.`);
            }

            // All checks passed, proceed with transaction
            stock.quantity -= body.quantity;
            const issueDate = new Date().toISOString().split('T')[0];
            stock.lastIssuedDate = issueDate;
            
            const newIssue: ExerciseBookIssue = {
                id: `ex-issue-${generateId()}`,
                studentId: student.id,
                studentName: student.name,
                subjectId: body.subjectId,
                quantity: body.quantity,
                issuedById: currentUser.id,
                issueDate: issueDate,
            };
            data.exerciseBookIssues.push(newIssue);
            return clone(newIssue);

        case 'suspensions':
            const authorizedRoles = [UserRole.PRINCIPAL, UserRole.DEPUTY_PRINCIPAL, UserRole.HOD, UserRole.ACADEMICS_DEPT];
            if (!authorizedRoles.includes(currentUser.role)) {
                throw new Error("You are not authorized to suspend students.");
            }
             const targetStudent = data.students.find(s => s.id === body.studentId);
            if (!targetStudent) {
                throw new Error("Student not found.");
            }

            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + body.days);

            const newSuspension: SuspensionRecord = {
                id: `susp-${generateId()}`,
                studentId: body.studentId,
                suspensionStartDate: startDate.toISOString().split('T')[0],
                suspensionEndDate: endDate.toISOString().split('T')[0],
                reason: body.reason,
                punishment: body.punishment,
                status: SuspensionStatus.ACTIVE,
                issuedById: currentUser.id,
            };
            data.suspensionRecords.push(newSuspension);
            return clone(newSuspension);

        case 'black-book-entries':
            if (currentUser.role !== UserRole.TEACHER) {
                throw new Error("Only teachers can add students to the Black Book.");
            }
            const studentForBook = data.students.find(s => s.id === body.studentId);
            if (!studentForBook) {
                throw new Error("Student not found.");
            }
             const hasOpenCase = data.blackBookEntries.some(entry => entry.studentId === body.studentId && entry.status === BlackBookStatus.OPEN);
            if (hasOpenCase) {
                throw new Error("This student already has an open case in the Black Book.");
            }
            const newEntry: BlackBookEntry = {
                id: `bb-${generateId()}`,
                studentId: body.studentId,
                reason: body.reason,
                reportedById: currentUser.id,
                reportDate: new Date().toISOString().split('T')[0],
                status: BlackBookStatus.OPEN,
            };
            data.blackBookEntries.push(newEntry);
            return clone(newEntry);

        default:
            console.error(`No mock handler for POST ${path}`);
            throw new Error(`No mock handler for POST ${path}`);
    }
};

export const put = async (path: string, body?: any) => {
    await delay(300);
    console.log(`Mock PUT request for: ${path} with body:`, body);
    const parts = path.substring(1).split('/');
    const currentUser = getCurrentUser();

    if (parts[0] === 'library' && parts[1] === 'transactions' && parts[3] === 'return') {
        const txId = parts[2];
        const tx = data.libraryTransactions.find(t => t.id === txId);
        if (tx) {
            tx.returnDate = new Date().toISOString().split('T')[0];
            const book = data.books.find(b => b.id === tx.bookId);
            if (book) book.available += 1;
            return clone(tx);
        }
        throw new Error(`Transaction ${txId} not found`);
    }

    if (parts[0] === 'leave-requests' && parts[2] === 'respond') {
        const reqId = parts[1];
        const req = data.leaveRequests.find(r => r.id === reqId);
        if (req) {
            req.status = body.status;
            req.principalComment = body.principalComment;
            return clone(req);
        }
        throw new Error(`Leave request ${reqId} not found`);
    }

    if (parts[0] === 'inventory' && parts[1] === 'requests') {
        const reqId = parts[2];
        const action = parts[3];
        const req = data.inventoryRequests.find(r => r.id === reqId);
        if (req) {
            if (action === 'approve') {
                req.status = 'Approved';
                const item = data.inventory.find(i => i.id === req.item_id);
                if (item && item.quantity >= req.quantity) {
                    item.quantity -= req.quantity;
                     const teacher = data.teachers.find(t => t.id === req.teacher_id);
                     const newIssued: IssuedInventory = {
                        id: `iss-${generateId()}`,
                        item_id: req.item_id,
                        item_name: item.name,
                        teacher_id: req.teacher_id,
                        teacher_name: teacher?.name || 'Unknown Teacher',
                        quantity: req.quantity,
                        date: new Date().toISOString().split('T')[0],
                        notes: `From approved request ${req.id}`,
                    };
                    data.issuedInventory.push(newIssued);
                } else {
                    req.status = 'Rejected';
                    req.rejection_reason = 'Not enough stock at time of approval.';
                }
            } else if (action === 'reject') {
                req.status = 'Rejected';
                req.rejection_reason = body.reason;
            }
            return clone(req);
        }
        throw new Error(`Inventory request ${reqId} not found`);
    }

    if (parts[0] === 'black-book-entries' && parts[2] === 'resolve') {
        if (!currentUser || ![UserRole.DEPUTY_PRINCIPAL, UserRole.PRINCIPAL].includes(currentUser.role)) {
            throw new Error("You are not authorized to resolve Black Book cases.");
        }
        const entryId = parts[1];
        const entry = data.blackBookEntries.find(e => e.id === entryId);
        if (entry) {
            entry.status = BlackBookStatus.RESOLVED;
            entry.resolutionNotes = body.resolutionNotes;
            entry.resolvedById = currentUser.id;
            entry.resolutionDate = new Date().toISOString().split('T')[0];
            return clone(entry);
        }
        throw new Error(`Black Book entry ${entryId} not found.`);
    }
    
    console.error(`No mock handler for PUT ${path}`);
    throw new Error(`No mock handler for PUT ${path}`);
};

export const del = async (path: string) => {
    await delay(300);
    console.log(`Mock DELETE request for: ${path}`);
    const parts = path.substring(1).split('/');
    const resource = parts[0];

    if (resource === 'past-papers') {
        throw new Error('Deleting past papers is not a supported feature.');
    }

    return { message: `DELETE on ${path} not implemented in mock API.` };
};