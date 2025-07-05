import { Request, Response } from "express";
import Attendance from "../models/Attendance";
import Event from "../models/Event";
import Student from "../models/Student";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import Organization from "../models/Organization";
import { parseQRCode, validateQRCode } from "../services/qr.service";

export const getAttendances = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.query;
    const filter: any = {};

    if (eventId) {
      filter.eventId = eventId;
    }

    const attendances = await Attendance.find(filter)
      .populate(
        "studentId",
        "studentId studentName yearLevel major departmentProgram"
      )
      .populate("eventId", "title eventDate startTime endTime")
      .sort({ createdAt: -1 });

    res.json(attendances);
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch attendances", error });
    return;
  }
};

export const getAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate(
        "studentId",
        "studentId studentName yearLevel major departmentProgram"
      )
      .populate("eventId", "title eventDate startTime endTime");

    if (!attendance) {
      res.status(404).json({ message: "Attendance not found" });
      return;
    }
    res.json(attendance);
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch attendance", error });
    return;
  }
};

export const createAttendance = async (req: Request, res: Response) => {
  try {
    const { qrCodeData, eventId, session } = req.body; // session: 'morning' | 'afternoon'
    if (!qrCodeData || !eventId || !session) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    // Parse and validate QR
    const parsed = parseQRCode(qrCodeData);
    if (!parsed) {
      res.status(400).json({ message: "Invalid QR code format" });
      return;
    }
    const student = await Student.findOne({ studentId: parsed.studentId });
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }
    const organization = await Organization.findById(student.organizationId);
    if (!organization) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }
    if (!validateQRCode(qrCodeData, organization.name)) {
      res.status(400).json({ message: "Invalid QR code" });
      return;
    }
    // Check event
    const event = await Event.findById(eventId);
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
    if (now < scanWindowStart) {
      res.status(400).json({ message: "Scan not allowed yet" });
      return;
    }
    if (now > gracePeriodEnd) {
      res.status(400).json({ message: "Scan window closed" });
      return;
    }
    // Prevent duplicate scan
    let attendance = await Attendance.findOne({
      studentId: student._id,
      eventId,
    });
    if (!attendance) {
      attendance = await Attendance.create({
        studentId: student._id,
        eventId,
        status: "present",
        signInMorning: session === "morning" ? now : undefined,
        signInAfternoon: session === "afternoon" ? now : undefined,
      });
      res.status(201).json({ message: "Attendance marked", attendance });
      return;
    } else {
      // Already signed in for this session?
      if (session === "morning" && attendance.signInMorning) {
        res.status(400).json({ message: "Already signed in (morning)" });
        return;
      }
      if (session === "afternoon" && attendance.signInAfternoon) {
        res.status(400).json({ message: "Already signed in (afternoon)" });
        return;
      }
      // Update attendance for session
      if (session === "morning") attendance.signInMorning = now;
      if (session === "afternoon") attendance.signInAfternoon = now;
      attendance.status = "present";
      await attendance.save();
      res.status(200).json({ message: "Attendance updated", attendance });
      return;
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to mark attendance", error });
    return;
  }
};

export const manualSignIn = async (req: Request, res: Response) => {
  try {
    const { studentId, eventId, session } = req.body;

    if (!studentId || !eventId || !session) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    // Validate student exists
    const student = await Student.findById(studentId);
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Validate event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const now = new Date();

    // Find or create attendance record
    let attendance = await Attendance.findOne({
      studentId,
      eventId,
    });

    if (!attendance) {
      attendance = await Attendance.create({
        studentId,
        eventId,
        status: "present",
        signInMorning: session === "morning" ? now : undefined,
        signInAfternoon: session === "afternoon" ? now : undefined,
      });
    } else {
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
      } else {
        attendance.signInAfternoon = now;
      }
      attendance.status = "present";
      await attendance.save();
    }

    res.json({
      message: `Manual sign-in successful for ${session} session`,
      attendance,
    });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to manually sign in", error });
    return;
  }
};

export const manualSignOut = async (req: Request, res: Response) => {
  try {
    const { studentId, eventId, session } = req.body;

    if (!studentId || !eventId || !session) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    // Find attendance record
    const attendance = await Attendance.findOne({
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
    } else {
      attendance.signOutAfternoon = now;
    }

    await attendance.save();

    res.json({
      message: `Manual sign-out successful for ${session} session`,
      attendance,
    });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to manually sign out", error });
    return;
  }
};

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!attendance) {
      res.status(404).json({ message: "Attendance not found" });
      return;
    }
    res.json(attendance);
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to update attendance", error });
    return;
  }
};

export const deleteAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      res.status(404).json({ message: "Attendance not found" });
      return;
    }
    res.json({ message: "Attendance deleted" });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to delete attendance", error });
    return;
  }
};

// Generate attendance report with filtering
export const generateReport = async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      eventId,
      studentId,
      yearLevel,
      major,
      status,
      session,
    } = req.query;

    // Build filter query
    const filter: any = {};
    const dateFilter: any = {};

    if (startDate) {
      dateFilter.$gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate as string);
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.createdAt = dateFilter;
    }

    if (eventId) {
      filter.event = eventId;
    }

    if (studentId) {
      filter.student = studentId;
    }

    // Fetch attendance records with populated data
    let attendanceQuery = Attendance.find(filter)
      .populate(
        "studentId",
        "firstName lastName studentId yearLevel major program status"
      )
      .populate("eventId", "title startDate endDate")
      .sort({ createdAt: -1 });

    const attendanceRecords = await attendanceQuery;

    // Apply additional filters
    let filteredRecords = attendanceRecords;

    if (yearLevel) {
      filteredRecords = filteredRecords.filter(
        (record) => (record.studentId as any).yearLevel === yearLevel
      );
    }

    if (major) {
      filteredRecords = filteredRecords.filter(
        (record) => (record.studentId as any).major === major
      );
    }

    if (status && status !== "all") {
      filteredRecords = filteredRecords.filter((record) => {
        if (session === "morning") {
          return (
            (record.signInMorning && status === "present") ||
            (!record.signInMorning && status === "absent")
          );
        } else if (session === "afternoon") {
          return (
            (record.signInAfternoon && status === "present") ||
            (!record.signInAfternoon && status === "absent")
          );
        } else {
          return record.status === status;
        }
      });
    }

    res.json({
      success: true,
      attendanceRecords: filteredRecords,
      totalRecords: filteredRecords.length,
    });
  } catch (error) {
    console.error("Generate report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate report",
    });
  }
};

// Export attendance data to Excel
export const exportToExcel = async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      eventId,
      studentId,
      yearLevel,
      major,
      status,
      session,
    } = req.query;

    // Build filter query (same as generateReport)
    const filter: any = {};
    const dateFilter: any = {};

    if (startDate) {
      dateFilter.$gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate as string);
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.createdAt = dateFilter;
    }

    if (eventId) {
      filter.event = eventId;
    }

    if (studentId) {
      filter.student = studentId;
    }

    // Fetch data
    const attendanceRecords = await Attendance.find(filter)
      .populate(
        "studentId",
        "firstName lastName studentId yearLevel major program status"
      )
      .populate("eventId", "title startDate endDate")
      .sort({ createdAt: -1 });

    // Apply additional filters
    let filteredRecords = attendanceRecords;

    if (yearLevel) {
      filteredRecords = filteredRecords.filter(
        (record) => (record.studentId as any).yearLevel === yearLevel
      );
    }

    if (major) {
      filteredRecords = filteredRecords.filter(
        (record) => (record.studentId as any).major === major
      );
    }

    if (status && status !== "all") {
      filteredRecords = filteredRecords.filter((record) => {
        if (session === "morning") {
          return (
            (record.signInMorning && status === "present") ||
            (!record.signInMorning && status === "absent")
          );
        } else if (session === "afternoon") {
          return (
            (record.signInAfternoon && status === "present") ||
            (!record.signInAfternoon && status === "absent")
          );
        } else {
          return record.status === status;
        }
      });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
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
      const student = record.studentId as any;
      const event = record.eventId as any;

      worksheet.addRow({
        studentId: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        yearLevel: student.yearLevel,
        major: student.major,
        event: event.title,
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
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance-report-${
        new Date().toISOString().split("T")[0]
      }.xlsx`
    );

    res.send(buffer);
  } catch (error) {
    console.error("Export to Excel error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export to Excel",
    });
  }
};

// Export attendance data to PDF
export const exportToPDF = async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      eventId,
      studentId,
      yearLevel,
      major,
      status,
      session,
    } = req.query;

    // Build filter query (same as generateReport)
    const filter: any = {};
    const dateFilter: any = {};

    if (startDate) {
      dateFilter.$gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate as string);
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.createdAt = dateFilter;
    }

    if (eventId) {
      filter.event = eventId;
    }

    if (studentId) {
      filter.student = studentId;
    }

    // Fetch data
    const attendanceRecords = await Attendance.find(filter)
      .populate("studentId", "firstName lastName studentId yearLevel major")
      .populate("eventId", "title startDate endDate")
      .sort({ createdAt: -1 });

    // Apply additional filters
    let filteredRecords = attendanceRecords;

    if (yearLevel) {
      filteredRecords = filteredRecords.filter(
        (record) => (record.studentId as any).yearLevel === yearLevel
      );
    }

    if (major) {
      filteredRecords = filteredRecords.filter(
        (record) => (record.studentId as any).major === major
      );
    }

    if (status && status !== "all") {
      filteredRecords = filteredRecords.filter((record) => {
        if (session === "morning") {
          return (
            (record.signInMorning && status === "present") ||
            (!record.signInMorning && status === "absent")
          );
        } else if (session === "afternoon") {
          return (
            (record.signInAfternoon && status === "present") ||
            (!record.signInAfternoon && status === "absent")
          );
        } else {
          return record.status === status;
        }
      });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance-report-${
        new Date().toISOString().split("T")[0]
      }.pdf`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text("Attendance Report", { align: "center" });
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, {
      align: "center",
    });
    doc.moveDown(2);

    // Add summary statistics
    const totalRecords = filteredRecords.length;
    const presentCount = filteredRecords.reduce((count, record) => {
      return (
        count +
        (record.signInMorning ? 1 : 0) +
        (record.signInAfternoon ? 1 : 0)
      );
    }, 0);
    const totalSessions = totalRecords * 2;
    const attendanceRate =
      totalSessions > 0
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
      const student = record.studentId as any;
      const event = record.eventId as any;

      if (index > 0 && index % 20 === 0) {
        doc.addPage();
      }

      doc.text(
        `${index + 1}. ${student.firstName} ${student.lastName} (${
          student.studentId
        })`
      );
      doc.text(`   Event: ${event.title}`);
      doc.text(`   Date: ${new Date(record.createdAt).toLocaleDateString()}`);
      doc.text(
        `   Morning: ${
          record.signInMorning ? "present" : "absent"
        } | Afternoon: ${record.signInAfternoon ? "present" : "absent"}`
      );
      doc.moveDown(0.5);
    });

    if (filteredRecords.length > 50) {
      doc.addPage();
      doc
        .fontSize(12)
        .text(
          `Note: Showing first 50 records out of ${filteredRecords.length} total records.`
        );
    }

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Export to PDF error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export to PDF",
    });
  }
};
