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
exports.getEventAttendanceStats = exports.getEventAttendance = exports.deleteEvent = exports.updateEvent = exports.createEvent = exports.getEvent = exports.getEventStats = exports.getEvents = void 0;
const Event_1 = __importDefault(require("../models/Event"));
const Attendance_1 = __importDefault(require("../models/Attendance"));
// Simple version without complex validation
const getEvents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { timeFilter, search, limit = 50, page = 1, sortBy = "eventDate", sortOrder = "asc", } = req.query;
        let query = {};
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
        const events = yield Event_1.default.find(query)
            .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = yield Event_1.default.countDocuments(query);
        res.json({
            events,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Failed to fetch events" });
    }
});
exports.getEvents = getEvents;
const getEventStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [totalEvents, upcomingEvents, todayEvents, pastEvents] = yield Promise.all([
            Event_1.default.countDocuments(),
            Event_1.default.countDocuments({ eventDate: { $gte: today } }),
            Event_1.default.countDocuments({
                eventDate: { $gte: today, $lt: tomorrow },
            }),
            Event_1.default.countDocuments({ eventDate: { $lt: today } }),
        ]);
        res.json({
            totalEvents,
            upcomingEvents,
            todayEvents,
            pastEvents,
        });
    }
    catch (error) {
        console.error("Error fetching event stats:", error);
        res.status(500).json({ message: "Failed to fetch event statistics" });
    }
});
exports.getEventStats = getEventStats;
const getEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield Event_1.default.findById(req.params.id);
        if (!event) {
            res.status(404).json({ message: "Event not found" });
            return;
        }
        res.json(event);
    }
    catch (error) {
        console.error("Error fetching event:", error);
        res.status(500).json({ message: "Failed to fetch event" });
    }
});
exports.getEvent = getEvent;
const createEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        // Basic validation
        if (!req.body.title ||
            !req.body.eventDate ||
            !req.body.startTime ||
            !req.body.endTime) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }
        // Set default values
        const eventData = Object.assign(Object.assign({}, req.body), { attendanceRequiredMorning: (_a = req.body.attendanceRequiredMorning) !== null && _a !== void 0 ? _a : true, attendanceRequiredAfternoon: (_b = req.body.attendanceRequiredAfternoon) !== null && _b !== void 0 ? _b : true, scanWindowMinutes: (_c = req.body.scanWindowMinutes) !== null && _c !== void 0 ? _c : 15, gracePeriodMinutes: (_d = req.body.gracePeriodMinutes) !== null && _d !== void 0 ? _d : 60, organizationId: req.body.organizationId || "507f1f77bcf86cd799439011", createdBy: (_e = req.user) === null || _e === void 0 ? void 0 : _e.userId });
        const event = yield Event_1.default.create(eventData);
        res.status(201).json(event);
    }
    catch (error) {
        console.error("Error creating event:", error);
        res
            .status(500)
            .json({ message: "Failed to create event", error: error.message });
    }
});
exports.createEvent = createEvent;
const updateEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield Event_1.default.findByIdAndUpdate(req.params.id, Object.assign(Object.assign({}, req.body), { updatedAt: new Date() }), { new: true, runValidators: true });
        if (!event) {
            res.status(404).json({ message: "Event not found" });
            return;
        }
        res.json(event);
    }
    catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({ message: "Failed to update event" });
    }
});
exports.updateEvent = updateEvent;
const deleteEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield Event_1.default.findById(req.params.id);
        if (!event) {
            res.status(404).json({ message: "Event not found" });
            return;
        }
        // Check if there are any attendance records for this event
        const attendanceCount = yield Attendance_1.default.countDocuments({
            event: req.params.id,
        });
        if (attendanceCount > 0) {
            // Warn but allow deletion (cascade delete attendance records)
            yield Attendance_1.default.deleteMany({ event: req.params.id });
        }
        yield Event_1.default.findByIdAndDelete(req.params.id);
        res.json({
            message: "Event deleted successfully",
            deletedAttendanceRecords: attendanceCount,
        });
    }
    catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ message: "Failed to delete event" });
    }
});
exports.deleteEvent = deleteEvent;
const getEventAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield Event_1.default.findById(req.params.id);
        if (!event) {
            res.status(404).json({ message: "Event not found" });
            return;
        }
        const attendanceRecords = yield Attendance_1.default.find({ event: req.params.id })
            .populate("student", "firstName lastName studentId email")
            .sort({ createdAt: -1 });
        res.json(attendanceRecords);
    }
    catch (error) {
        console.error("Error fetching event attendance:", error);
        res.status(500).json({ message: "Failed to fetch event attendance" });
    }
});
exports.getEventAttendance = getEventAttendance;
const getEventAttendanceStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield Event_1.default.findById(req.params.id);
        if (!event) {
            res.status(404).json({ message: "Event not found" });
            return;
        }
        const attendanceRecords = yield Attendance_1.default.find({ event: req.params.id });
        const stats = {
            totalRecords: attendanceRecords.length,
            presentMorning: attendanceRecords.filter((a) => a.morningStatus === "present").length,
            presentAfternoon: attendanceRecords.filter((a) => a.afternoonStatus === "present").length,
            absentMorning: attendanceRecords.filter((a) => a.morningStatus === "absent").length,
            absentAfternoon: attendanceRecords.filter((a) => a.afternoonStatus === "absent").length,
            excusedMorning: attendanceRecords.filter((a) => a.morningStatus === "excused").length,
            excusedAfternoon: attendanceRecords.filter((a) => a.afternoonStatus === "excused").length,
        };
        res.json(stats);
    }
    catch (error) {
        console.error("Error fetching event attendance stats:", error);
        res
            .status(500)
            .json({ message: "Failed to fetch event attendance statistics" });
    }
});
exports.getEventAttendanceStats = getEventAttendanceStats;
