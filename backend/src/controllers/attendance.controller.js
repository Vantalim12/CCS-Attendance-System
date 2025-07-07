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
exports.exportToPDF = exports.exportToExcel = exports.generateReport = exports.deleteAttendance = exports.updateAttendance = exports.manualSignOut = exports.manualSignIn = exports.createAttendance = exports.getAttendance = exports.getAttendances = void 0;
const Attendance_1 = __importDefault(require("../models/Attendance"));
const Event_1 = __importDefault(require("../models/Event"));
const Student_1 = __importDefault(require("../models/Student"));
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const Organization_1 = __importDefault(require("../models/Organization"));
const qr_service_1 = require("../services/qr.service");
const getAttendances = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.query;
        const filter = {};
        if (eventId) {
            filter.eventId = eventId;
        }
        const attendances = yield Attendance_1.default.find(filter)
            .populate("studentId", "studentId studentName yearLevel major departmentProgram")
            .populate("eventId", "title eventDate startTime endTime")
            .sort({ createdAt: -1 });
        res.json(attendances);
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch attendances", error });
        return;
    }
});
exports.getAttendances = getAttendances;
const getAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const attendance = yield Attendance_1.default.findById(req.params.id)
            .populate("studentId", "studentId studentName yearLevel major departmentProgram")
            .populate("eventId", "title eventDate startTime endTime");
        if (!attendance) {
            res.status(404).json({ message: "Attendance not found" });
            return;
        }
        res.json(attendance);
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch attendance", error });
        return;
    }
});
exports.getAttendance = getAttendance;
const createAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { qrCodeData, eventId, session } = req.body; // session: 'morning' | 'afternoon'
        console.log("QR Attendance Request:", { qrCodeData, eventId, session });
        if (!qrCodeData || !eventId || !session) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }
        // Parse and validate QR
        const parsed = (0, qr_service_1.parseQRCode)(qrCodeData);
        console.log("Parsed QR Code:", parsed);
        if (!parsed) {
            console.log("QR Code parsing failed for data:", qrCodeData);
            res.status(400).json({ message: "Invalid QR code format" });
            return;
        }
        // First try to find by studentId
        console.log("Looking for student with ID:", parsed.studentId);
        let student = yield Student_1.default.findOne({ studentId: parsed.studentId });
        console.log("Student found by ID:", student ? "Yes" : "No");
        // If not found, try to find by QR code data directly
        if (!student) {
            console.log("Trying exact QR code match:", qrCodeData);
            student = yield Student_1.default.findOne({ qrCodeData: qrCodeData });
            console.log("Student found by exact QR match:", student ? "Yes" : "No");
        }
        // If still not found, try to find by partial QR code match
        if (!student) {
            console.log("Trying partial QR code match for studentId:", parsed.studentId);
            student = yield Student_1.default.findOne({
                qrCodeData: { $regex: `^${parsed.studentId}-`, $options: "i" },
            });
            console.log("Student found by partial QR match:", student ? "Yes" : "No");
        }
        if (!student) {
            console.log("No student found for QR code:", qrCodeData);
            res.status(404).json({ message: "Student not found" });
            return;
        }
        console.log("Found student:", {
            id: student._id,
            studentId: student.studentId,
            name: student.studentName,
        });
        const organization = yield Organization_1.default.findById(student.organizationId);
        console.log("Organization lookup for ID:", student.organizationId, "Found:", organization ? "Yes" : "No");
        if (!organization) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        console.log("Validating QR code with organization:", organization.name);
        const isValidQR = (0, qr_service_1.validateQRCode)(qrCodeData, organization.name);
        console.log("QR validation result:", isValidQR);
        if (!isValidQR) {
            res.status(400).json({ message: "Invalid QR code" });
            return;
        }
        // Check event
        const event = yield Event_1.default.findById(eventId);
        console.log("Event lookup:", event ? "Found" : "Not found");
        if (!event) {
            res.status(404).json({ message: "Event not found" });
            return;
        }
        const now = new Date();
        const eventDate = new Date(event.eventDate);
        const [startHour, startMinute] = event.startTime.split(":").map(Number);
        const [endHour, endMinute] = event.endTime.split(":").map(Number);
        const eventStart = new Date(eventDate);
        eventStart.setHours(startHour, startMinute, 0, 0);
        const eventEnd = new Date(eventDate);
        eventEnd.setHours(endHour, endMinute, 0, 0);
        // Allow scan 15 min before event start
        const scanWindowStart = new Date(eventStart.getTime() - 15 * 60 * 1000);
        // Grace period: 1 hour after event start
        const gracePeriodEnd = new Date(eventStart.getTime() + 60 * 60 * 1000);
        console.log("Time validation:", {
            now: now.toISOString(),
            eventDate: eventDate.toISOString(),
            eventStart: eventStart.toISOString(),
            eventEnd: eventEnd.toISOString(),
            scanWindowStart: scanWindowStart.toISOString(),
            gracePeriodEnd: gracePeriodEnd.toISOString(),
            canScanNow: now >= scanWindowStart && now <= gracePeriodEnd,
        });
        if (now < scanWindowStart) {
            console.log("Scan rejected: Too early");
            res.status(400).json({ message: "Scan not allowed yet" });
            return;
        }
        if (now > gracePeriodEnd) {
            console.log("Scan rejected: Too late");
            res.status(400).json({ message: "Scan window closed" });
            return;
        }
        // Prevent duplicate scan
        let attendance = yield Attendance_1.default.findOne({
            studentId: student._id,
            eventId,
        });
        console.log("Existing attendance record:", attendance ? "Found" : "Not found");
        if (!attendance) {
            console.log("Creating new attendance record for session:", session);
            attendance = yield Attendance_1.default.create({
                studentId: student._id,
                eventId,
                status: "present",
                signInMorning: session === "morning" ? now : undefined,
                signInAfternoon: session === "afternoon" ? now : undefined,
            });
            console.log("Attendance created successfully:", attendance._id);
            res.status(201).json({ message: "Attendance marked", attendance });
            return;
        }
        else {
            // Already signed in for this session?
            console.log("Checking existing attendance for session:", session, {
                morningSignIn: attendance.signInMorning,
                afternoonSignIn: attendance.signInAfternoon,
            });
            if (session === "morning" && attendance.signInMorning) {
                console.log("Already signed in for morning session");
                res.status(400).json({ message: "Already signed in (morning)" });
                return;
            }
            if (session === "afternoon" && attendance.signInAfternoon) {
                console.log("Already signed in for afternoon session");
                res.status(400).json({ message: "Already signed in (afternoon)" });
                return;
            }
            // Update attendance for session
            console.log("Updating attendance for session:", session);
            if (session === "morning")
                attendance.signInMorning = now;
            if (session === "afternoon")
                attendance.signInAfternoon = now;
            attendance.status = "present";
            yield attendance.save();
            console.log("Attendance updated successfully");
            res.status(200).json({ message: "Attendance updated", attendance });
            return;
        }
    }
    catch (error) {
        res.status(500).json({ message: "Failed to mark attendance", error });
        return;
    }
});
exports.createAttendance = createAttendance;
const manualSignIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, eventId, session } = req.body;
        if (!studentId || !eventId || !session) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }
        // Validate student exists
        const student = yield Student_1.default.findById(studentId);
        if (!student) {
            res.status(404).json({ message: "Student not found" });
            return;
        }
        // Validate event exists
        const event = yield Event_1.default.findById(eventId);
        if (!event) {
            res.status(404).json({ message: "Event not found" });
            return;
        }
        const now = new Date();
        // Find or create attendance record
        let attendance = yield Attendance_1.default.findOne({
            studentId,
            eventId,
        });
        if (!attendance) {
            attendance = yield Attendance_1.default.create({
                studentId,
                eventId,
                status: "present",
                signInMorning: session === "morning" ? now : undefined,
                signInAfternoon: session === "afternoon" ? now : undefined,
            });
        }
        else {
            // Check if already signed in for this session
            if (session === "morning" && attendance.signInMorning) {
                res
                    .status(400)
                    .json({ message: "Student already signed in for morning session" });
                return;
            }
            if (session === "afternoon" && attendance.signInAfternoon) {
                res
                    .status(400)
                    .json({ message: "Student already signed in for afternoon session" });
                return;
            }
            // Update sign-in time for the session
            if (session === "morning") {
                attendance.signInMorning = now;
            }
            else {
                attendance.signInAfternoon = now;
            }
            attendance.status = "present";
            yield attendance.save();
        }
        res.json({
            message: `Manual sign-in successful for ${session} session`,
            attendance,
        });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to manually sign in", error });
        return;
    }
});
exports.manualSignIn = manualSignIn;
const manualSignOut = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, eventId, session } = req.body;
        if (!studentId || !eventId || !session) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }
        // Find attendance record
        const attendance = yield Attendance_1.default.findOne({
            studentId,
            eventId,
        });
        if (!attendance) {
            res.status(404).json({
                message: "No attendance record found. Student must sign in first.",
            });
            return;
        }
        // Check if student signed in for this session
        if (session === "morning" && !attendance.signInMorning) {
            res
                .status(400)
                .json({ message: "Student has not signed in for morning session" });
            return;
        }
        if (session === "afternoon" && !attendance.signInAfternoon) {
            res
                .status(400)
                .json({ message: "Student has not signed in for afternoon session" });
            return;
        }
        // Check if already signed out
        if (session === "morning" && attendance.signOutMorning) {
            res
                .status(400)
                .json({ message: "Student already signed out for morning session" });
            return;
        }
        if (session === "afternoon" && attendance.signOutAfternoon) {
            res
                .status(400)
                .json({ message: "Student already signed out for afternoon session" });
            return;
        }
        const now = new Date();
        // Update sign-out time for the session
        if (session === "morning") {
            attendance.signOutMorning = now;
        }
        else {
            attendance.signOutAfternoon = now;
        }
        yield attendance.save();
        res.json({
            message: `Manual sign-out successful for ${session} session`,
            attendance,
        });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to manually sign out", error });
        return;
    }
});
exports.manualSignOut = manualSignOut;
const updateAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const attendance = yield Attendance_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!attendance) {
            res.status(404).json({ message: "Attendance not found" });
            return;
        }
        res.json(attendance);
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update attendance", error });
        return;
    }
});
exports.updateAttendance = updateAttendance;
const deleteAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const attendance = yield Attendance_1.default.findByIdAndDelete(req.params.id);
        if (!attendance) {
            res.status(404).json({ message: "Attendance not found" });
            return;
        }
        res.json({ message: "Attendance deleted" });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete attendance", error });
        return;
    }
});
exports.deleteAttendance = deleteAttendance;
// Generate attendance report with filtering
const generateReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, eventId, studentId, yearLevel, major, status, session, } = req.query;
        // Build filter query
        const filter = {};
        const dateFilter = {};
        if (startDate) {
            dateFilter.$gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.$lte = new Date(endDate);
        }
        if (Object.keys(dateFilter).length > 0) {
            filter.createdAt = dateFilter;
        }
        if (eventId) {
            filter.eventId = eventId;
        }
        if (studentId) {
            filter.studentId = studentId;
        }
        // Fetch attendance records with populated data
        let attendanceQuery = Attendance_1.default.find(filter)
            .populate("studentId", "studentName studentId yearLevel major departmentProgram status")
            .populate("eventId", "title eventDate startTime endTime")
            .sort({ createdAt: -1 });
        const attendanceRecords = yield attendanceQuery;
        // Apply additional filters
        let filteredRecords = attendanceRecords;
        if (yearLevel) {
            filteredRecords = filteredRecords.filter((record) => {
                const student = record.studentId;
                return student && student.yearLevel === yearLevel;
            });
        }
        if (major) {
            filteredRecords = filteredRecords.filter((record) => {
                const student = record.studentId;
                return student && student.major === major;
            });
        }
        if (status && status !== "all") {
            filteredRecords = filteredRecords.filter((record) => {
                if (session === "morning") {
                    return ((record.signInMorning && status === "present") ||
                        (!record.signInMorning && status === "absent"));
                }
                else if (session === "afternoon") {
                    return ((record.signInAfternoon && status === "present") ||
                        (!record.signInAfternoon && status === "absent"));
                }
                else {
                    return record.status === status;
                }
            });
        }
        // Transform data to match frontend expectations
        const transformedRecords = filteredRecords
            .filter((record) => {
            // Filter out records with missing data or null populated objects
            const student = record.studentId;
            const event = record.eventId;
            return (record.studentId &&
                record.eventId &&
                student &&
                event &&
                student._id &&
                event._id);
        })
            .map((record) => {
            const student = record.studentId;
            const event = record.eventId;
            // Split studentName into firstName and lastName
            const nameParts = (student.studentName || "").split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            return {
                _id: record._id,
                student: {
                    _id: student._id,
                    firstName: firstName,
                    lastName: lastName,
                    studentId: student.studentId || "",
                    email: student.email || "",
                    yearLevel: student.yearLevel || "",
                    major: student.major || "",
                },
                event: event._id,
                eventTitle: event.title || "Unknown Event",
                morningStatus: record.signInMorning ? "present" : "absent",
                afternoonStatus: record.signInAfternoon ? "present" : "absent",
                morningCheckIn: record.signInMorning
                    ? record.signInMorning.toISOString()
                    : undefined,
                afternoonCheckIn: record.signInAfternoon
                    ? record.signInAfternoon.toISOString()
                    : undefined,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
            };
        });
        res.json({
            success: true,
            attendanceRecords: transformedRecords,
            totalRecords: transformedRecords.length,
        });
    }
    catch (error) {
        console.error("Generate report error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate report",
        });
    }
});
exports.generateReport = generateReport;
// Export attendance data to Excel
const exportToExcel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, eventId, studentId, yearLevel, major, status, session, } = req.query;
        // Build filter query (same as generateReport)
        const filter = {};
        const dateFilter = {};
        if (startDate) {
            dateFilter.$gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.$lte = new Date(endDate);
        }
        if (Object.keys(dateFilter).length > 0) {
            filter.createdAt = dateFilter;
        }
        if (eventId) {
            filter.eventId = eventId;
        }
        if (studentId) {
            filter.studentId = studentId;
        }
        // Fetch data
        const attendanceRecords = yield Attendance_1.default.find(filter)
            .populate("studentId", "studentName studentId yearLevel major departmentProgram status")
            .populate("eventId", "title eventDate startTime endTime")
            .sort({ createdAt: -1 });
        // Apply additional filters
        let filteredRecords = attendanceRecords;
        if (yearLevel) {
            filteredRecords = filteredRecords.filter((record) => {
                const student = record.studentId;
                return student && student.yearLevel === yearLevel;
            });
        }
        if (major) {
            filteredRecords = filteredRecords.filter((record) => {
                const student = record.studentId;
                return student && student.major === major;
            });
        }
        if (status && status !== "all") {
            filteredRecords = filteredRecords.filter((record) => {
                if (session === "morning") {
                    return ((record.signInMorning && status === "present") ||
                        (!record.signInMorning && status === "absent"));
                }
                else if (session === "afternoon") {
                    return ((record.signInAfternoon && status === "present") ||
                        (!record.signInAfternoon && status === "absent"));
                }
                else {
                    return record.status === status;
                }
            });
        }
        // Create Excel workbook
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet("Attendance Report");
        // Add headers
        worksheet.columns = [
            { header: "Student ID", key: "studentId", width: 15 },
            { header: "Student Name", key: "studentName", width: 25 },
            { header: "Year Level", key: "yearLevel", width: 12 },
            { header: "Major", key: "major", width: 20 },
            { header: "Event", key: "event", width: 30 },
            { header: "Date", key: "date", width: 15 },
            { header: "Morning Status", key: "morningStatus", width: 15 },
            { header: "Morning Check-in", key: "morningCheckIn", width: 20 },
            { header: "Afternoon Status", key: "afternoonStatus", width: 15 },
            { header: "Afternoon Check-in", key: "afternoonCheckIn", width: 20 },
        ];
        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF366092" },
        };
        worksheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
        // Add data rows
        filteredRecords.forEach((record) => {
            const student = record.studentId;
            const event = record.eventId;
            // Skip records with null populated objects
            if (!student || !event)
                return;
            worksheet.addRow({
                studentId: student.studentId || "",
                studentName: student.studentName || "",
                yearLevel: student.yearLevel || "",
                major: student.major || "",
                event: event.title || "",
                date: new Date(record.createdAt).toLocaleDateString(),
                morningStatus: record.signInMorning ? "present" : "absent",
                morningCheckIn: record.signInMorning
                    ? new Date(record.signInMorning).toLocaleString()
                    : "",
                afternoonStatus: record.signInAfternoon ? "present" : "absent",
                afternoonCheckIn: record.signInAfternoon
                    ? new Date(record.signInAfternoon).toLocaleString()
                    : "",
            });
        });
        // Generate buffer
        const buffer = yield workbook.xlsx.writeBuffer();
        // Set response headers
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=attendance-report-${new Date().toISOString().split("T")[0]}.xlsx`);
        res.send(buffer);
    }
    catch (error) {
        console.error("Export to Excel error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to export to Excel",
        });
    }
});
exports.exportToExcel = exportToExcel;
// Export attendance data to PDF
const exportToPDF = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, eventId, studentId, yearLevel, major, status, session, } = req.query;
        // Build filter query (same as generateReport)
        const filter = {};
        const dateFilter = {};
        if (startDate) {
            dateFilter.$gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.$lte = new Date(endDate);
        }
        if (Object.keys(dateFilter).length > 0) {
            filter.createdAt = dateFilter;
        }
        if (eventId) {
            filter.eventId = eventId;
        }
        if (studentId) {
            filter.studentId = studentId;
        }
        // Fetch data
        const attendanceRecords = yield Attendance_1.default.find(filter)
            .populate("studentId", "studentName studentId yearLevel major")
            .populate("eventId", "title eventDate startTime endTime")
            .sort({ createdAt: -1 });
        // Apply additional filters
        let filteredRecords = attendanceRecords;
        if (yearLevel) {
            filteredRecords = filteredRecords.filter((record) => {
                const student = record.studentId;
                return student && student.yearLevel === yearLevel;
            });
        }
        if (major) {
            filteredRecords = filteredRecords.filter((record) => {
                const student = record.studentId;
                return student && student.major === major;
            });
        }
        if (status && status !== "all") {
            filteredRecords = filteredRecords.filter((record) => {
                if (session === "morning") {
                    return ((record.signInMorning && status === "present") ||
                        (!record.signInMorning && status === "absent"));
                }
                else if (session === "afternoon") {
                    return ((record.signInAfternoon && status === "present") ||
                        (!record.signInAfternoon && status === "absent"));
                }
                else {
                    return record.status === status;
                }
            });
        }
        // Create PDF
        const doc = new pdfkit_1.default({ margin: 50 });
        // Set response headers
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=attendance-report-${new Date().toISOString().split("T")[0]}.pdf`);
        // Pipe PDF to response
        doc.pipe(res);
        // Handle pipe errors
        doc.on("error", (err) => {
            console.error("PDF generation error:", err);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Failed to generate PDF",
                });
            }
        });
        // Add title
        doc.fontSize(20).text("Attendance Report", { align: "center" });
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, {
            align: "center",
        });
        doc.moveDown(2);
        // Add summary statistics
        const totalRecords = filteredRecords.length;
        const presentCount = filteredRecords.reduce((count, record) => {
            return (count +
                (record.signInMorning ? 1 : 0) +
                (record.signInAfternoon ? 1 : 0));
        }, 0);
        const totalSessions = totalRecords * 2;
        const attendanceRate = totalSessions > 0
            ? ((presentCount / totalSessions) * 100).toFixed(1)
            : "0";
        doc.fontSize(14).text("Summary Statistics", { underline: true });
        doc
            .fontSize(12)
            .text(`Total Records: ${totalRecords}`)
            .text(`Overall Attendance Rate: ${attendanceRate}%`)
            .text(`Total Present Sessions: ${presentCount}`)
            .moveDown();
        // Add detailed records (limit to first 50 for PDF)
        doc.fontSize(14).text("Detailed Records", { underline: true });
        doc.fontSize(10);
        const recordsToShow = filteredRecords.slice(0, 50);
        recordsToShow.forEach((record, index) => {
            const student = record.studentId;
            const event = record.eventId;
            // Skip records with null populated objects
            if (!student || !event)
                return;
            if (index > 0 && index % 20 === 0) {
                doc.addPage();
            }
            doc.text(`${index + 1}. ${student.studentName || "Unknown Student"} (${student.studentId || "N/A"})`);
            doc.text(`   Event: ${event.title || "Unknown Event"}`);
            doc.text(`   Date: ${new Date(record.createdAt).toLocaleDateString()}`);
            doc.text(`   Morning: ${record.signInMorning ? "present" : "absent"} | Afternoon: ${record.signInAfternoon ? "present" : "absent"}`);
            doc.moveDown(0.5);
        });
        if (filteredRecords.length > 50) {
            doc.addPage();
            doc
                .fontSize(12)
                .text(`Note: Showing first 50 records out of ${filteredRecords.length} total records.`);
        }
        // Finalize PDF
        doc.end();
    }
    catch (error) {
        console.error("Export to PDF error:", error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Failed to export to PDF",
            });
        }
    }
});
exports.exportToPDF = exportToPDF;
