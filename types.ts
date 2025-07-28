export enum UserRole {
  ADMIN = 'Administrator',
  TEACHER = 'Teacher',
  LIBRARIAN = 'Librarian',
  STUDENT = 'Student',
  PRINCIPAL = 'Principal',
  DEPUTY_PRINCIPAL = 'Deputy Principal',
  REGISTRAR = 'Registrar',
  SECRETARY = 'Secretary',
  ACADEMICS_DEPT = 'Academics Department',
  HOD = 'Head of Department',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  class: string;
  dateOfBirth: string;
  parentPhoneNumber: string;
}

export interface Teacher {
  id: string;
  name: string;
  employeeId: string;
  subjectIds: string[];
  classInCharge?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  quantity: number;
  available: number;
}

export interface LibraryTransaction {
  id: string;
  bookId: string;
  studentId: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
}

export enum InventoryCategory {
  UNIFORM = 'Uniform',
  LAB_EQUIPMENT = 'Lab Equipment',
  SPORTS_ITEM = 'Sports Item',
  STATIONERY = 'Stationery',
  TEACHING_MATERIAL = 'Teaching Material',
  EXERCISE_BOOKS = 'Exercise Books',
}

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  minStockLevel: number;
}

export interface Grade {
    id: string;
    studentId: string;
    subjectId: string;
    score: number;
    term: string;
    year: number;
}

export interface LeaveRequest {
  id: string;
  teacherId: string;
  requestDate: string;
  leaveStartDate: string;
  leaveEndDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  principalComment?: string;
}

export interface IssuedInventory {
    id: string;
    item_id: string;
    item_name?: string;
    teacher_id: string;
    teacher_name?: string;
    quantity: number;
    date: string;
    notes: string;
}

export interface InventoryRequest {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  item_id: string;
  item_name?: string;
  quantity: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  request_date: string;
  rejection_reason?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string; // Corresponds to Student ID or Teacher ID
  userType: 'student' | 'teacher';
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:MM
}

export interface PastPaper {
  id: string;
  subjectId: string;
  class: string;
  term: string;
  year: number;
  fileName: string;
  fileContent: string; // base64 encoded PDF
  uploadedById: string; // teacherId
  uploadDate: string;
}

export interface TimecFile {
  id: string;
  fileName: string;
  fileContent: string; // base64 encoded
  title: string;
  uploadedById: string;
  uploadedByRole: UserRole;
  uploadDate: string;
}

export interface ExerciseBookStock {
    id: string;
    subjectId: string;
    quantity: number;
    lastIssuedDate: string | null;
}

export interface ExerciseBookIssue {
    id: string;
    studentId: string;
    studentName?: string;
    subjectId: string;
    quantity: number;
    issuedById: string;
    issueDate: string;
}

export enum SuspensionStatus {
    ACTIVE = 'Active',
    COMPLETED = 'Completed',
}

export interface SuspensionRecord {
    id: string;
    studentId: string;
    suspensionStartDate: string;
    suspensionEndDate: string;
    reason: string;
    punishment: string;
    status: SuspensionStatus;
    issuedById: string;
}

export enum BlackBookStatus {
    OPEN = 'Open',
    RESOLVED = 'Resolved',
}

export interface BlackBookEntry {
    id: string;
    studentId: string;
    studentName?: string;
    studentClass?: string;
    reportedById: string; // teacher's user id
    reportedByName?: string;
    reason: string;
    reportDate: string;
    status: BlackBookStatus;
    resolvedById?: string; // DP/Principal's user id
    resolutionNotes?: string;
    resolutionDate?: string;
}