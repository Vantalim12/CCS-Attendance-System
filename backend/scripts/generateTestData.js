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
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Organization_1 = __importDefault(require("../src/models/Organization"));
const User_1 = __importDefault(require("../src/models/User"));
const Student_1 = __importDefault(require("../src/models/Student"));
const Event_1 = __importDefault(require("../src/models/Event"));
const OfficerExclusion_1 = __importDefault(require("../src/models/OfficerExclusion"));
const qr_service_1 = require("../src/services/qr.service");
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/attendance-system";
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoose_1.default.connect(MONGO_URI);
        // Clear existing data
        console.log("Clearing existing data...");
        yield Student_1.default.deleteMany({});
        yield User_1.default.deleteMany({});
        yield Organization_1.default.deleteMany({});
        yield Event_1.default.deleteMany({});
        yield OfficerExclusion_1.default.deleteMany({});
        console.log("Generating test data...");
        // Create organization
        const org = yield Organization_1.default.create({ name: "Computer Science Society" });
        console.log(`✅ Created organization: ${org.name}`);
        // Create admin user with hashed password
        const adminPassword = yield bcryptjs_1.default.hash("admin123", 10);
        const admin = yield User_1.default.create({
            email: "admin@ccs.com",
            passwordHash: adminPassword,
            role: "admin",
            organizationId: org._id,
        });
        console.log(`✅ Created admin user: ${admin.email}`);
        // Create users for students
        const studentPassword = yield bcryptjs_1.default.hash("student123", 10);
        const users = yield User_1.default.insertMany([
            {
                email: "alice.smith@student.com",
                passwordHash: studentPassword,
                role: "student",
                organizationId: org._id,
            },
            {
                email: "bob.jones@student.com",
                passwordHash: studentPassword,
                role: "student",
                organizationId: org._id,
            },
            {
                email: "charlie.brown@student.com",
                passwordHash: studentPassword,
                role: "student",
                organizationId: org._id,
            },
            {
                email: "diana.prince@student.com",
                passwordHash: studentPassword,
                role: "student",
                organizationId: org._id,
            },
            {
                email: "eve.wilson@student.com",
                passwordHash: studentPassword,
                role: "student",
                organizationId: org._id,
            },
        ]);
        console.log(`✅ Created ${users.length} student users`);
        // Create students with proper QR codes
        const studentData = [
            {
                userId: users[0]._id,
                studentId: "2024001",
                studentName: "Alice Smith",
                yearLevel: "1st Year",
                major: "Computer Science",
                departmentProgram: "BSCS",
                status: "regular",
            },
            {
                userId: users[1]._id,
                studentId: "2024002",
                studentName: "Bob Jones",
                yearLevel: "2nd Year",
                major: "Information Technology",
                departmentProgram: "BSIT",
                status: "governor",
            },
            {
                userId: users[2]._id,
                studentId: "2024003",
                studentName: "Charlie Brown",
                yearLevel: "3rd Year",
                major: "Computer Science",
                departmentProgram: "BSCS",
                status: "vice-governor",
            },
            {
                userId: users[3]._id,
                studentId: "2024004",
                studentName: "Diana Prince",
                yearLevel: "4th Year",
                major: "Computer Engineering",
                departmentProgram: "BSCpE",
                status: "under-secretary",
            },
            {
                userId: users[4]._id,
                studentId: "2024005",
                studentName: "Eve Wilson",
                yearLevel: "2nd Year",
                major: "Information Technology",
                departmentProgram: "BSIT",
                status: "regular",
            },
        ];
        const students = [];
        for (const data of studentData) {
            // Generate proper QR code with correct organization ID
            const qrCodeData = yield (0, qr_service_1.generateQRCode)(data.studentId, data.studentName, false, String(org._id));
            const student = yield Student_1.default.create(Object.assign(Object.assign({}, data), { qrCodeData, organizationId: org._id }));
            students.push(student);
            console.log(`✅ Created student: ${student.studentName} (${student.studentId}) - QR: ${qrCodeData}`);
        }
        // Create sample events
        const today = new Date();
        const events = yield Event_1.default.insertMany([
            {
                title: "Computer Science Society General Assembly",
                eventDate: today,
                startTime: "09:00",
                endTime: "12:00",
                organizationId: org._id,
                createdBy: admin._id,
            },
            {
                title: "Programming Workshop",
                eventDate: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
                startTime: "13:00",
                endTime: "17:00",
                organizationId: org._id,
                createdBy: admin._id,
            },
            {
                title: "Tech Talk: AI and Machine Learning",
                eventDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
                startTime: "10:00",
                endTime: "11:30",
                organizationId: org._id,
                createdBy: admin._id,
            },
        ]);
        console.log(`✅ Created ${events.length} sample events`);
        // Create officer exclusion
        yield OfficerExclusion_1.default.create({
            studentId: students[1]._id,
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            reason: "Officer duties conflict",
            createdBy: admin._id,
        });
        console.log("✅ Created officer exclusion");
        console.log("\n🎉 Test data generation completed successfully!");
        console.log("\n📊 Summary:");
        console.log(`- Organization: ${org.name}`);
        console.log(`- Admin: ${admin.email} (password: admin123)`);
        console.log(`- Students: ${students.length} (password: student123)`);
        console.log(`- Events: ${events.length}`);
        console.log("\n🔍 You can now test QR code scanning with any of the generated students!");
        console.log("\n📝 Sample Student IDs and their QR codes:");
        students.forEach((student, index) => {
            console.log(`   ${index + 1}. ${student.studentId} - ${student.studentName}`);
            console.log(`      QR Code: ${student.qrCodeData}`);
        });
        yield mongoose_1.default.disconnect();
        process.exit(0);
    });
}
main();
