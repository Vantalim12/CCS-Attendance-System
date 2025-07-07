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
const User_1 = __importDefault(require("../src/models/User"));
const Organization_1 = __importDefault(require("../src/models/Organization"));
const Event_1 = __importDefault(require("../src/models/Event"));
// Connect to MongoDB
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect("mongodb://localhost:27017/attendance-system");
        console.log("MongoDB connected successfully");
    }
    catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
});
const checkDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield connectDB();
        console.log("=== Database Status Check ===");
        // Check collections
        const students = yield Student_1.default.find({});
        const users = yield User_1.default.find({});
        const organizations = yield Organization_1.default.find({});
        const events = yield Event_1.default.find({});
        console.log(`\n📊 Collection Counts:`);
        console.log(`Students: ${students.length}`);
        console.log(`Users: ${users.length}`);
        console.log(`Organizations: ${organizations.length}`);
        console.log(`Events: ${events.length}`);
        if (students.length > 0) {
            console.log(`\n👥 Sample Students:`);
            students.slice(0, 3).forEach((student, index) => {
                console.log(`${index + 1}. ${student.studentName} (${student.studentId})`);
                console.log(`   QR Code: ${student.qrCodeData}`);
            });
        }
        else {
            console.log(`\n⚠️  No students found in database!`);
            console.log(`   This explains why QR scanning returns "Student not found"`);
        }
        if (users.length > 0) {
            console.log(`\n👤 Sample Users:`);
            users.slice(0, 3).forEach((user, index) => {
                console.log(`${index + 1}. ${user.email} - Role: ${user.role}`);
            });
        }
        if (organizations.length > 0) {
            console.log(`\n🏢 Organizations:`);
            organizations.forEach((org, index) => {
                console.log(`${index + 1}. ${org.name}`);
            });
        }
        if (events.length > 0) {
            console.log(`\n📅 Recent Events:`);
            events.slice(0, 3).forEach((event, index) => {
                console.log(`${index + 1}. ${event.title} - ${new Date(event.eventDate).toLocaleDateString()}`);
            });
        }
        console.log(`\n=== End Database Check ===`);
    }
    catch (error) {
        console.error("Error checking database:", error);
    }
    finally {
        yield mongoose_1.default.disconnect();
    }
});
// Run the script
checkDatabase();
