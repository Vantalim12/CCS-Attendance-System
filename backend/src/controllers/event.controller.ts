import { Request, Response } from "express";
import Event from "../models/Event";
import Attendance from "../models/Attendance";

// Simple version without complex validation
export const getEvents = async (req: Request, res: Response) => {
  try {
    const {
      timeFilter,
      search,
      limit = 50,
      page = 1,
      sortBy = "eventDate",
      sortOrder = "asc",
    } = req.query;

    let query: any = {};

    // Time filter
    if (timeFilter) {
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      switch (timeFilter) {
        case "today":
          query.eventDate = {
            $gte: today,
            $lt: tomorrow,
          };
          break;
        case "upcoming":
          query.eventDate = { $gte: today };
          break;
        case "past":
          query.eventDate = { $lt: today };
          break;
      }
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    const events = await Event.find(query)
      .sort({ [sortBy as string]: sortOrder === "desc" ? -1 : 1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Event.countDocuments(query);

    res.json({
      events,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

export const getEventStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalEvents, upcomingEvents, todayEvents, pastEvents] =
      await Promise.all([
        Event.countDocuments(),
        Event.countDocuments({ eventDate: { $gte: today } }),
        Event.countDocuments({
          eventDate: { $gte: today, $lt: tomorrow },
        }),
        Event.countDocuments({ eventDate: { $lt: today } }),
      ]);

    res.json({
      totalEvents,
      upcomingEvents,
      todayEvents,
      pastEvents,
    });
  } catch (error) {
    console.error("Error fetching event stats:", error);
    res.status(500).json({ message: "Failed to fetch event statistics" });
  }
};

export const getEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    res.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ message: "Failed to fetch event" });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    // Basic validation
    if (
      !req.body.title ||
      !req.body.eventDate ||
      !req.body.startTime ||
      !req.body.endTime
    ) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    // Set default values
    const eventData = {
      ...req.body,
      attendanceRequiredMorning: req.body.attendanceRequiredMorning ?? true,
      attendanceRequiredAfternoon: req.body.attendanceRequiredAfternoon ?? true,
      scanWindowMinutes: req.body.scanWindowMinutes ?? 15,
      gracePeriodMinutes: req.body.gracePeriodMinutes ?? 60,
      organizationId: req.body.organizationId || "507f1f77bcf86cd799439011", // Default org
      createdBy: (req as any).user?.userId,
    };

    const event = await Event.create(eventData);
    res.status(201).json(event);
  } catch (error: any) {
    console.error("Error creating event:", error);
    res
      .status(500)
      .json({ message: "Failed to create event", error: error.message });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    res.json(event);
  } catch (error: any) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Failed to update event" });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    // Check if there are any attendance records for this event
    const attendanceCount = await Attendance.countDocuments({
      eventId: req.params.id,
    });

    if (attendanceCount > 0) {
      // Warn but allow deletion (cascade delete attendance records)
      await Attendance.deleteMany({ eventId: req.params.id });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({
      message: "Event deleted successfully",
      deletedAttendanceRecords: attendanceCount,
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Failed to delete event" });
  }
};

export const getEventAttendance = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const attendanceRecords = await Attendance.find({ eventId: req.params.id })
      .populate("studentId", "studentName studentId email")
      .sort({ createdAt: -1 });

    // Transform data to match frontend expectations
    const transformedRecords = attendanceRecords
      .map((record) => {
        const student = record.studentId as any;

        if (!student) {
          return null; // Skip records with missing student data
        }

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
          },
          event: req.params.id,
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
      })
      .filter((record) => record !== null); // Remove null records

    res.json(transformedRecords);
  } catch (error) {
    console.error("Error fetching event attendance:", error);
    res.status(500).json({ message: "Failed to fetch event attendance" });
  }
};

export const getEventAttendanceStats = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const attendanceRecords = await Attendance.find({ eventId: req.params.id });

    const stats = {
      totalRecords: attendanceRecords.length,
      presentMorning: attendanceRecords.filter((a: any) => a.signInMorning)
        .length,
      presentAfternoon: attendanceRecords.filter((a: any) => a.signInAfternoon)
        .length,
      absentMorning: attendanceRecords.filter((a: any) => !a.signInMorning)
        .length,
      absentAfternoon: attendanceRecords.filter((a: any) => !a.signInAfternoon)
        .length,
      excusedMorning: 0, // TODO: Implement excuse logic
      excusedAfternoon: 0, // TODO: Implement excuse logic
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching event attendance stats:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch event attendance statistics" });
  }
};
