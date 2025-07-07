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
const mongoose_1 = __importDefault(require("mongoose"));
const Student_1 = __importDefault(require("../src/models/Student"));
const qr_service_1 = require("../src/services/qr.service");
// Connect to MongoDB
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect("mongodb://localhost:27017/attendance-system", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB connected");
    }
    catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
});
const regenerateQRCodes = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield connectDB();
        console.log("Starting QR code regeneration...");
        const students = yield Student_1.default.find({});
        console.log(`Found ${students.length} students`);
        for (const student of students) {
            try {
                console.log(`Processing student: ${student.studentId} - ${student.studentName}`);
                // Generate new QR code with correct organization ID
                const newQRCode = yield (0, qr_service_1.generateQRCode)(student.studentId, student.studentName, false, String(student.organizationId));
                // Update student with new QR code
                yield Student_1.default.findByIdAndUpdate(student._id, {
                    qrCodeData: newQRCode,
                });
                console.log(`Updated QR code for ${student.studentId}: ${newQRCode}`);
            }
            catch (error) {
                console.error(`Error processing student ${student.studentId}:`, error);
            }
        }
        console.log("QR code regeneration completed!");
    }
    catch (error) {
        console.error("Error during QR code regeneration:", error);
    }
    finally {
        yield mongoose_1.default.disconnect();
    }
});
// Run the script
regenerateQRCodes();
