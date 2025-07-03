import { Request, Response } from "express";
import Attendance from "../models/Attendance";
import Event from "../models/Event";
import Student from "../models/Student";
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
      res
        .status(404)
        .json({
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
