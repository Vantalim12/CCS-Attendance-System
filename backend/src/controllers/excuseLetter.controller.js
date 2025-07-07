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
exports.deleteExcuseLetter = exports.downloadExcuseLetter = exports.updateExcuseLetter = exports.createExcuseLetter = exports.getExcuseLetter = exports.getExcuseLetters = void 0;
const ExcuseLetter_1 = __importDefault(require("../models/ExcuseLetter"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const getExcuseLetters = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const letters = yield ExcuseLetter_1.default.find()
            .populate("studentId", "studentId studentName yearLevel major departmentProgram")
            .populate("eventId", "title eventDate startTime endTime")
            .sort({ submittedAt: -1 });
        res.json(letters);
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch excuse letters", error });
        return;
    }
});
exports.getExcuseLetters = getExcuseLetters;
const getExcuseLetter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const letter = yield ExcuseLetter_1.default.findById(req.params.id)
            .populate("studentId", "studentId studentName yearLevel major departmentProgram")
            .populate("eventId", "title eventDate startTime endTime");
        if (!letter) {
            res.status(404).json({ message: "Excuse letter not found" });
            return;
        }
        res.json(letter);
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch excuse letter", error });
        return;
    }
});
exports.getExcuseLetter = getExcuseLetter;
const createExcuseLetter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId, reason } = req.body;
        const userId = req.user.userId; // Get user ID from JWT
        if (!req.file) {
            res.status(400).json({ message: "File is required" });
            return;
        }
        if (!eventId || !reason) {
            res.status(400).json({ message: "Event ID and reason are required" });
            return;
        }
        // Find the student record for this user
        const Student = require("../models/Student");
        const student = yield Student.findOne({ userId });
        if (!student) {
            res.status(404).json({ message: "Student record not found" });
            return;
        }
        const filePath = req.file.path;
        const letter = yield ExcuseLetter_1.default.create({
            studentId: student._id,
            eventId,
            reason,
            filePath,
            status: "pending",
            submittedAt: new Date(),
        });
        res
            .status(201)
            .json({ message: "Excuse letter submitted successfully", letter });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to submit excuse letter", error });
        return;
    }
});
exports.createExcuseLetter = createExcuseLetter;
const updateExcuseLetter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.body;
        const userId = req.user.userId;
        if (!status || !["approved", "rejected"].includes(status)) {
            res
                .status(400)
                .json({ message: "Valid status (approved/rejected) is required" });
            return;
        }
        const updateData = {
            status,
            approvedAt: new Date(),
            approvedBy: userId,
        };
        const letter = yield ExcuseLetter_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!letter) {
            res.status(404).json({ message: "Excuse letter not found" });
            return;
        }
        res.json({ message: `Excuse letter ${status}`, letter });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update excuse letter", error });
        return;
    }
});
exports.updateExcuseLetter = updateExcuseLetter;
const downloadExcuseLetter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const letter = yield ExcuseLetter_1.default.findById(req.params.id);
        if (!letter) {
            res.status(404).json({ message: "Excuse letter not found" });
            return;
        }
        const filePath = letter.filePath;
        // Check if file exists
        if (!fs_1.default.existsSync(filePath)) {
            res.status(404).json({ message: "File not found" });
            return;
        }
        // Get file extension for content type
        const ext = path_1.default.extname(filePath).toLowerCase();
        let contentType = "application/octet-stream";
        switch (ext) {
            case ".pdf":
                contentType = "application/pdf";
                break;
            case ".jpg":
            case ".jpeg":
                contentType = "image/jpeg";
                break;
            case ".png":
                contentType = "image/png";
                break;
        }
        // Set headers for file download
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `attachment; filename="excuse-letter-${letter._id}${ext}"`);
        // Stream the file
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.pipe(res);
        fileStream.on("error", (error) => {
            res.status(500).json({ message: "Error reading file", error });
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to download file", error });
        return;
    }
});
exports.downloadExcuseLetter = downloadExcuseLetter;
const deleteExcuseLetter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const letter = yield ExcuseLetter_1.default.findByIdAndDelete(req.params.id);
        if (!letter) {
            res.status(404).json({ message: "Excuse letter not found" });
            return;
        }
        // Delete the file as well
        if (fs_1.default.existsSync(letter.filePath)) {
            fs_1.default.unlinkSync(letter.filePath);
        }
        res.json({ message: "Excuse letter deleted" });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete excuse letter", error });
        return;
    }
});
exports.deleteExcuseLetter = deleteExcuseLetter;
