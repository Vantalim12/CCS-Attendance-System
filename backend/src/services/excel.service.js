"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importStudentsFromExcel = importStudentsFromExcel;
exports.exportStudentsToExcel = exportStudentsToExcel;
exports.generateExcelTemplate = generateExcelTemplate;
exports.importOfficerExclusionsFromExcel = importOfficerExclusionsFromExcel;
exports.exportOfficerExclusionsToExcel = exportOfficerExclusionsToExcel;
const xlsx_1 = __importDefault(require("xlsx"));
const Student_1 = __importDefault(require("../models/Student"));
const OfficerExclusion_1 = __importDefault(require("../models/OfficerExclusion"));
const qr_service_1 = require("./qr.service");
function importStudentsFromExcel(filePath, organizationId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const workbook = xlsx_1.default.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx_1.default.utils.sheet_to_json(sheet);
        const results = {
            successful: 0,
            failed: 0,
            skipped: 0,
            errors: [],
        };
        for (const row of data) {
            try {
                // Validate required fields
                if (!row.student_id ||
                    !row.student_name ||
                    !row.year_level ||
                    !row.major ||
                    !row.department_program) {
                    results.failed++;
                    results.errors.push(`Row ${results.successful + results.failed + results.skipped + 1}: Missing required fields`);
                    continue;
                }
                // Check if student already exists
                const existingStudent = yield Student_1.default.findOne({
                    studentId: row.student_id,
                });
                if (existingStudent) {
                    results.skipped++;
                    results.errors.push(`Student ID ${row.student_id} already exists - skipped`);
                    continue;
                }
                // Generate QR code
                const qrCodeData = yield (0, qr_service_1.generateQRCode)(row.student_id, row.student_name);
                const student = yield Student_1.default.create({
                    userId,
                    studentId: row.student_id,
                    studentName: row.student_name,
                    yearLevel: row.year_level,
                    major: row.major,
                    departmentProgram: row.department_program,
                    status: row.status || "regular",
                    organizationId,
                    qrCodeData,
                });
                results.successful++;
            }
            catch (error) {
                results.failed++;
                results.errors.push(`Row ${results.successful + results.failed + results.skipped}: ${error.message}`);
            }
        }
        return results;
    });
}
function exportStudentsToExcel(organizationId, filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const students = yield Student_1.default.find({ organizationId });
        const data = students.map((s) => ({
            student_id: s.studentId,
            student_name: s.studentName,
            year_level: s.yearLevel,
            major: s.major,
            department_program: s.departmentProgram,
            status: s.status,
            created_date: s.createdAt.toISOString().split("T")[0],
        }));
        const worksheet = xlsx_1.default.utils.json_to_sheet(data);
        const workbook = xlsx_1.default.utils.book_new();
        xlsx_1.default.utils.book_append_sheet(workbook, worksheet, "Students");
        xlsx_1.default.writeFile(workbook, filePath);
        return filePath;
    });
}
function generateExcelTemplate(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        // Create template data with headers and sample rows
        const templateData = [
            {
                student_id: "SAMPLE-001",
                student_name: "Juan Dela Cruz",
                year_level: "1st Year",
                major: "Computer Science",
                department_program: "Bachelor of Science in Computer Science",
                status: "regular",
            },
            {
                student_id: "SAMPLE-002",
                student_name: "Maria Santos",
                year_level: "2nd Year",
                major: "Information Technology",
                department_program: "Bachelor of Science in Information Technology",
                status: "governor",
            },
            {
                student_id: "SAMPLE-003",
                student_name: "Jose Rizal",
                year_level: "3rd Year",
                major: "Computer Engineering",
                department_program: "Bachelor of Science in Computer Engineering",
                status: "vice-governor",
            },
        ];
        const worksheet = xlsx_1.default.utils.json_to_sheet(templateData);
        // Set column widths for better readability
        const columnWidths = [
            { wch: 15 }, // student_id
            { wch: 25 }, // student_name
            { wch: 12 }, // year_level
            { wch: 20 }, // major
            { wch: 40 }, // department_program
            { wch: 15 }, // status
        ];
        worksheet["!cols"] = columnWidths;
        // Add instructions sheet
        const instructionsData = [
            {
                Field: "student_id",
                Description: "Unique student ID (required)",
                Example: "2024-001234",
            },
            {
                Field: "student_name",
                Description: "Full name of student (required)",
                Example: "Juan Dela Cruz",
            },
            {
                Field: "year_level",
                Description: "Year level (required)",
                Example: "1st Year, 2nd Year, 3rd Year, 4th Year",
            },
            {
                Field: "major",
                Description: "Student major/course (required)",
                Example: "Computer Science",
            },
            {
                Field: "department_program",
                Description: "Full program name (required)",
                Example: "Bachelor of Science in Computer Science",
            },
            {
                Field: "status",
                Description: "Student status (optional)",
                Example: "regular, governor, vice-governor, under-secretary",
            },
        ];
        const instructionsSheet = xlsx_1.default.utils.json_to_sheet(instructionsData);
        instructionsSheet["!cols"] = [{ wch: 20 }, { wch: 40 }, { wch: 30 }];
        const workbook = xlsx_1.default.utils.book_new();
        xlsx_1.default.utils.book_append_sheet(workbook, worksheet, "Students Template");
        xlsx_1.default.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
        xlsx_1.default.writeFile(workbook, filePath);
        return filePath;
    });
}
function importOfficerExclusionsFromExcel(filePath, createdBy) {
    return __awaiter(this, void 0, void 0, function* () {
        const workbook = xlsx_1.default.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx_1.default.utils.sheet_to_json(sheet);
        const exclusions = [];
        for (const row of data) {
            const exclusion = yield OfficerExclusion_1.default.create({
                studentId: row.student_id,
                startDate: new Date(row.start_date),
                endDate: new Date(row.end_date),
                reason: row.reason,
                createdBy,
            });
            exclusions.push(exclusion);
        }
        return exclusions;
    });
}
function exportOfficerExclusionsToExcel(organizationId, filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const exclusions = yield OfficerExclusion_1.default.find({ organizationId });
        const data = exclusions.map((e) => ({
            student_id: e.studentId,
            start_date: e.startDate,
            end_date: e.endDate,
            reason: e.reason,
        }));
        const worksheet = xlsx_1.default.utils.json_to_sheet(data);
        const workbook = xlsx_1.default.utils.book_new();
        xlsx_1.default.utils.book_append_sheet(workbook, worksheet, "OfficerExclusions");
        xlsx_1.default.writeFile(workbook, filePath);
        return filePath;
    });
}
