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
exports.downloadImportTemplate = exports.exportStudents = exports.importStudents = exports.downloadQRCodes = exports.generateQRCodes = exports.deleteStudent = exports.updateStudent = exports.createStudent = exports.getStudent = exports.getStudents = void 0;
const Student_1 = __importDefault(require("../models/Student"));
const excel_service_1 = require("../services/excel.service");
const qr_service_1 = require("../services/qr.service");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const getStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, status, yearLevel, major } = req.query;
        const filter = {};
        // Apply filters
        if (status && status !== "all") {
            filter.status = status;
        }
        if (yearLevel && yearLevel !== "all") {
            filter.yearLevel = yearLevel;
        }
        if (major && major !== "all") {
            filter.major = major;
        }
        let students = yield Student_1.default.find(filter).sort({ createdAt: -1 });
        // Search filter
        if (search && typeof search === "string") {
            const searchRegex = new RegExp(search, "i");
            students = students.filter((student) => searchRegex.test(student.studentName) ||
                searchRegex.test(student.studentId) ||
                searchRegex.test(student.major) ||
                searchRegex.test(student.departmentProgram));
        }
        // Transform student data to match frontend expectations
        const transformedStudents = students.map((student) => {
            const nameParts = student.studentName.split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            return Object.assign(Object.assign({}, student.toObject()), { firstName,
                lastName, email: "" });
        });
        res.json(transformedStudents);
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch students", error });
        return;
    }
});
exports.getStudents = getStudents;
const getStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const student = yield Student_1.default.findById(req.params.id);
        if (!student) {
            res.status(404).json({ message: "Student not found" });
            return;
        }
        // Transform student data to match frontend expectations
        const nameParts = student.studentName.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        const transformedStudent = Object.assign(Object.assign({}, student.toObject()), { firstName,
            lastName, email: "" });
        res.json(transformedStudent);
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch student", error });
        return;
    }
});
exports.getStudent = getStudent;
const createStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { studentId, firstName, lastName, yearLevel, major, departmentProgram, status, } = req.body;
        // Check if student ID already exists
        const existingStudent = yield Student_1.default.findOne({ studentId });
        if (existingStudent) {
            res.status(400).json({ message: "Student ID already exists" });
            return;
        }
        // Combine first and last name for studentName field
        const studentName = `${firstName} ${lastName}`;
        // Generate QR code data
        const orgId = req.body.organizationId || "507f1f77bcf86cd799439011";
        const qrCodeData = yield (0, qr_service_1.generateQRCode)(studentId, studentName, false, orgId);
        // Get userId from authenticated user
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const student = yield Student_1.default.create({
            userId,
            studentId,
            studentName,
            yearLevel,
            major,
            departmentProgram,
            status: status || "regular",
            qrCodeData,
            organizationId: req.body.organizationId || "507f1f77bcf86cd799439011", // Default org for now
        });
        // Transform student data to match frontend expectations
        const transformedStudent = Object.assign(Object.assign({}, student.toObject()), { firstName,
            lastName, email: "" });
        res.status(201).json({
            message: "Student created successfully",
            student: transformedStudent,
        });
        return;
    }
    catch (error) {
        console.error("Student creation error:", error);
        res.status(500).json({ message: "Failed to create student", error });
        return;
    }
});
exports.createStudent = createStudent;
const updateStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, firstName, lastName } = req.body;
        // Prepare update data
        const updateData = Object.assign({}, req.body);
        // If firstName and lastName are provided, combine them into studentName
        if (firstName && lastName) {
            updateData.studentName = `${firstName} ${lastName}`;
        }
        // If student ID is being changed, check for duplicates
        if (studentId) {
            const existingStudent = yield Student_1.default.findOne({
                studentId,
                _id: { $ne: req.params.id },
            });
            if (existingStudent) {
                res.status(400).json({ message: "Student ID already exists" });
                return;
            }
            // Regenerate QR code if student ID or name changed
            if (updateData.studentName) {
                const currentStudent = yield Student_1.default.findById(req.params.id);
                const orgId = (currentStudent === null || currentStudent === void 0 ? void 0 : currentStudent.organizationId) || "507f1f77bcf86cd799439011";
                updateData.qrCodeData = yield (0, qr_service_1.generateQRCode)(studentId, updateData.studentName, false, String(orgId));
            }
        }
        const student = yield Student_1.default.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
        });
        if (!student) {
            res.status(404).json({ message: "Student not found" });
            return;
        }
        // Transform student data to match frontend expectations
        const nameParts = student.studentName.split(" ");
        const responseFirstName = nameParts[0] || "";
        const responseLastName = nameParts.slice(1).join(" ") || "";
        const transformedStudent = Object.assign(Object.assign({}, student.toObject()), { firstName: responseFirstName, lastName: responseLastName, email: "" });
        res.json({
            message: "Student updated successfully",
            student: transformedStudent,
        });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update student", error });
        return;
    }
});
exports.updateStudent = updateStudent;
const deleteStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const student = yield Student_1.default.findByIdAndDelete(req.params.id);
        if (!student) {
            res.status(404).json({ message: "Student not found" });
            return;
        }
        res.json({ message: "Student deleted successfully" });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete student", error });
        return;
    }
});
exports.deleteStudent = deleteStudent;
const generateQRCodes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentIds } = req.body;
        if (!studentIds || !Array.isArray(studentIds)) {
            res.status(400).json({ message: "Student IDs array is required" });
            return;
        }
        const students = yield Student_1.default.find({ _id: { $in: studentIds } });
        const qrCodes = {};
        for (const student of students) {
            // Generate QR code as base64 image
            const qrCodeBase64 = yield (0, qr_service_1.generateQRCode)(student.studentId, student.studentName, true, String(student.organizationId));
            qrCodes[String(student._id)] = `data:image/png;base64,${qrCodeBase64}`;
        }
        res.json({ qrCodes });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to generate QR codes", error });
        return;
    }
});
exports.generateQRCodes = generateQRCodes;
const downloadQRCodes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentIds } = req.body;
        if (!studentIds || !Array.isArray(studentIds)) {
            res.status(400).json({ message: "Student IDs array is required" });
            return;
        }
        const students = yield Student_1.default.find({ _id: { $in: studentIds } });
        // Import PDFKit
        const PDFDocument = require("pdfkit");
        const doc = new PDFDocument();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="student-qr-codes.pdf"');
        // Pipe the PDF directly to the response
        doc.pipe(res);
        // Add title
        doc.fontSize(16).text("Student QR Codes", { align: "center" });
        doc.moveDown();
        let yPosition = 120;
        let xPosition = 50;
        const itemsPerRow = 3;
        let itemsInCurrentRow = 0;
        for (const student of students) {
            try {
                // Generate QR code as base64 image
                const qrCodeBase64 = yield (0, qr_service_1.generateQRCode)(student.studentId, student.studentName, true, String(student.organizationId));
                // Add QR code to PDF (convert base64 to buffer)
                const qrBuffer = Buffer.from(qrCodeBase64, "base64");
                // Add QR code image
                doc.image(qrBuffer, xPosition, yPosition, { width: 100, height: 100 });
                // Add student info below QR code
                doc
                    .fontSize(10)
                    .text(student.studentName, xPosition, yPosition + 110, {
                    width: 100,
                    align: "center",
                })
                    .text(student.studentId, xPosition, yPosition + 125, {
                    width: 100,
                    align: "center",
                });
                itemsInCurrentRow++;
                xPosition += 160;
                // Move to next row after 3 items
                if (itemsInCurrentRow >= itemsPerRow) {
                    itemsInCurrentRow = 0;
                    xPosition = 50;
                    yPosition += 160;
                    // Add new page if needed
                    if (yPosition > 650) {
                        doc.addPage();
                        yPosition = 50;
                    }
                }
            }
            catch (error) {
                console.error(`Error adding QR code for student ${student.studentId}:`, error);
            }
        }
        // Finalize the PDF
        doc.end();
        return;
    }
    catch (error) {
        console.error("PDF generation error:", error);
        res.status(500).json({ message: "Failed to download QR codes", error });
        return;
    }
});
exports.downloadQRCodes = downloadQRCodes;
const importStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            res.status(400).json({ message: "File is required" });
            return;
        }
        const userId = req.user.userId;
        const organizationId = req.body.organizationId || "507f1f77bcf86cd799439011"; // Default org
        const result = yield (0, excel_service_1.importStudentsFromExcel)(req.file.path, organizationId, userId);
        // Clean up uploaded file
        if (fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(201).json({
            message: "Import completed",
            successful: result.successful,
            failed: result.failed,
            skipped: result.skipped,
            errors: result.errors,
        });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to import students", error });
        return;
    }
});
exports.importStudents = importStudents;
const exportStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizationId = req.query.organizationId || "507f1f77bcf86cd799439011";
        const filePath = path_1.default.join("uploads", `students_export_${Date.now()}.xlsx`);
        yield (0, excel_service_1.exportStudentsToExcel)(organizationId, filePath);
        res.download(filePath, "students.xlsx", (err) => {
            if (err) {
                console.error("Download error:", err);
            }
            else {
                // Clean up file after download
                setTimeout(() => {
                    if (fs_1.default.existsSync(filePath)) {
                        fs_1.default.unlinkSync(filePath);
                    }
                }, 5000);
            }
        });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to export students", error });
        return;
    }
});
exports.exportStudents = exportStudents;
const downloadImportTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filePath = path_1.default.join("uploads", `student_template_${Date.now()}.xlsx`);
        yield (0, excel_service_1.generateExcelTemplate)(filePath);
        res.download(filePath, "student-import-template.xlsx", (err) => {
            if (err) {
                console.error("Download error:", err);
            }
            else {
                // Clean up file after download
                setTimeout(() => {
                    if (fs_1.default.existsSync(filePath)) {
                        fs_1.default.unlinkSync(filePath);
                    }
                }, 5000);
            }
        });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to generate template", error });
        return;
    }
});
exports.downloadImportTemplate = downloadImportTemplate;
// TODO: Implement importStudents and exportStudents for Excel
