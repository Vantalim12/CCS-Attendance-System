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
exports.exportOfficerExclusions = exports.importOfficerExclusions = exports.getActiveExclusions = exports.checkExclusion = exports.deleteOfficerExclusion = exports.updateOfficerExclusion = exports.createOfficerExclusion = exports.getOfficerExclusion = exports.getOfficerExclusions = void 0;
const OfficerExclusion_1 = __importDefault(require("../models/OfficerExclusion"));
const Student_1 = __importDefault(require("../models/Student"));
const excel_service_1 = require("../services/excel.service");
const path_1 = __importDefault(require("path"));
// Get all officer exclusions
const getOfficerExclusions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const exclusions = yield OfficerExclusion_1.default.find()
            .populate("student", "firstName lastName studentId status")
            .sort({ createdAt: -1 });
        res.json(exclusions);
    }
    catch (error) {
        console.error("Get officer exclusions error:", error);
        res.status(500).json({ message: "Failed to fetch officer exclusions" });
    }
});
exports.getOfficerExclusions = getOfficerExclusions;
// Get a specific officer exclusion
const getOfficerExclusion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const exclusion = yield OfficerExclusion_1.default.findById(req.params.id).populate("student", "firstName lastName studentId status");
        if (!exclusion) {
            res.status(404).json({ message: "Officer exclusion not found" });
            return;
        }
        res.json(exclusion);
    }
    catch (error) {
        console.error("Get officer exclusion error:", error);
        res.status(500).json({ message: "Failed to fetch officer exclusion" });
    }
});
exports.getOfficerExclusion = getOfficerExclusion;
// Create new officer exclusion
const createOfficerExclusion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { studentId, startDate, endDate, reason } = req.body;
        // Validate required fields
        if (!studentId || !startDate || !endDate || !reason) {
            res.status(400).json({ message: "All fields are required" });
            return;
        }
        // Validate student exists and is an officer
        const student = yield Student_1.default.findById(studentId);
        if (!student) {
            res.status(404).json({ message: "Student not found" });
            return;
        }
        const officerStatuses = ["governor", "vice-governor", "under-secretary"];
        if (!officerStatuses.includes(student.status)) {
            res.status(400).json({ message: "Student is not an officer" });
            return;
        }
        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            res.status(400).json({ message: "End date must be after start date" });
            return;
        }
        // Check for overlapping exclusions
        const overlappingExclusion = yield OfficerExclusion_1.default.findOne({
            student: studentId,
            $or: [
                {
                    startDate: { $lte: end },
                    endDate: { $gte: start },
                },
            ],
        });
        if (overlappingExclusion) {
            res.status(400).json({
                message: "Overlapping exclusion period exists for this student",
            });
            return;
        }
        const exclusion = yield OfficerExclusion_1.default.create({
            student: studentId,
            startDate: start,
            endDate: end,
            reason,
            createdBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
        });
        const populatedExclusion = yield OfficerExclusion_1.default.findById(exclusion._id).populate("student", "firstName lastName studentId status");
        res.status(201).json({
            message: "Officer exclusion created successfully",
            exclusion: populatedExclusion,
        });
    }
    catch (error) {
        console.error("Create officer exclusion error:", error);
        res.status(500).json({ message: "Failed to create officer exclusion" });
    }
});
exports.createOfficerExclusion = createOfficerExclusion;
// Update officer exclusion
const updateOfficerExclusion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, startDate, endDate, reason } = req.body;
        const exclusionId = req.params.id;
        // Validate required fields
        if (!studentId || !startDate || !endDate || !reason) {
            res.status(400).json({ message: "All fields are required" });
            return;
        }
        // Validate student exists and is an officer
        const student = yield Student_1.default.findById(studentId);
        if (!student) {
            res.status(404).json({ message: "Student not found" });
            return;
        }
        const officerStatuses = ["governor", "vice-governor", "under-secretary"];
        if (!officerStatuses.includes(student.status)) {
            res.status(400).json({ message: "Student is not an officer" });
            return;
        }
        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            res.status(400).json({ message: "End date must be after start date" });
            return;
        }
        // Check for overlapping exclusions (excluding current one)
        const overlappingExclusion = yield OfficerExclusion_1.default.findOne({
            _id: { $ne: exclusionId },
            student: studentId,
            $or: [
                {
                    startDate: { $lte: end },
                    endDate: { $gte: start },
                },
            ],
        });
        if (overlappingExclusion) {
            res.status(400).json({
                message: "Overlapping exclusion period exists for this student",
            });
            return;
        }
        const exclusion = yield OfficerExclusion_1.default.findByIdAndUpdate(exclusionId, {
            student: studentId,
            startDate: start,
            endDate: end,
            reason,
        }, { new: true }).populate("student", "firstName lastName studentId status");
        if (!exclusion) {
            res.status(404).json({ message: "Officer exclusion not found" });
            return;
        }
        res.json({
            message: "Officer exclusion updated successfully",
            exclusion,
        });
    }
    catch (error) {
        console.error("Update officer exclusion error:", error);
        res.status(500).json({ message: "Failed to update officer exclusion" });
    }
});
exports.updateOfficerExclusion = updateOfficerExclusion;
// Delete officer exclusion
const deleteOfficerExclusion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const exclusion = yield OfficerExclusion_1.default.findByIdAndDelete(req.params.id);
        if (!exclusion) {
            res.status(404).json({ message: "Officer exclusion not found" });
            return;
        }
        res.json({ message: "Officer exclusion deleted successfully" });
    }
    catch (error) {
        console.error("Delete officer exclusion error:", error);
        res.status(500).json({ message: "Failed to delete officer exclusion" });
    }
});
exports.deleteOfficerExclusion = deleteOfficerExclusion;
// Check if a student is excluded on a specific date
const checkExclusion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, date } = req.query;
        if (!studentId || !date) {
            res.status(400).json({ message: "Student ID and date are required" });
            return;
        }
        const checkDate = new Date(date);
        const exclusion = yield OfficerExclusion_1.default.findOne({
            student: studentId,
            startDate: { $lte: checkDate },
            endDate: { $gte: checkDate },
        }).populate("student", "firstName lastName studentId status");
        res.json({
            isExcluded: !!exclusion,
            exclusion: exclusion || null,
        });
    }
    catch (error) {
        console.error("Check exclusion error:", error);
        res.status(500).json({ message: "Failed to check exclusion" });
    }
});
exports.checkExclusion = checkExclusion;
// Get active exclusions
const getActiveExclusions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const activeExclusions = yield OfficerExclusion_1.default.find({
            startDate: { $lte: now },
            endDate: { $gte: now },
        })
            .populate("student", "firstName lastName studentId status")
            .sort({ startDate: 1 });
        res.json(activeExclusions);
    }
    catch (error) {
        console.error("Get active exclusions error:", error);
        res.status(500).json({ message: "Failed to fetch active exclusions" });
    }
});
exports.getActiveExclusions = getActiveExclusions;
const importOfficerExclusions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            res.status(400).json({ message: "File is required" });
            return;
        }
        const createdBy = req.body.createdBy;
        const exclusions = yield (0, excel_service_1.importOfficerExclusionsFromExcel)(req.file.path, createdBy);
        res
            .status(201)
            .json({ message: "Officer exclusions imported", exclusions });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Failed to import officer exclusions", error });
    }
});
exports.importOfficerExclusions = importOfficerExclusions;
const exportOfficerExclusions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizationId = req.query.organizationId;
        const filePath = path_1.default.join("uploads", `officer_exclusions_export_${Date.now()}.xlsx`);
        yield (0, excel_service_1.exportOfficerExclusionsToExcel)(organizationId, filePath);
        res.download(filePath, "officer_exclusions.xlsx");
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Failed to export officer exclusions", error });
    }
});
exports.exportOfficerExclusions = exportOfficerExclusions;
