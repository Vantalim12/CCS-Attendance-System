import dotenv from "dotenv";
import { connectDB } from "../src/utils/db";
import Student from "../src/models/Student";
import Attendance from "../src/models/Attendance";
import Event from "../src/models/Event";
import Organization from "../src/models/Organization";
import { parseQRCode } from "../src/services/qr.service";

// Load environment variables
dotenv.config();

async function debugAttendance() {
  try {
    // Connect to database
    await connectDB();
    console.log("Connected to database");

    // Find Jose Rizal student
    console.log("\n=== SEARCHING FOR JOSE RIZAL ===");
    const joseRizalStudents = await Student.find({
      studentName: { $regex: "Jose Rizal", $options: "i" },
    });

    console.log(
      `Found ${joseRizalStudents.length} students with name like "Jose Rizal"`
    );

    for (const student of joseRizalStudents) {
      console.log(`\nStudent: ${student.studentName}`);
      console.log(`  ID: ${student.studentId}`);
      console.log(`  QR Code: ${student.qrCodeData}`);
      console.log(`  Organization ID: ${student.organizationId}`);
      console.log(`  Created: ${student.createdAt}`);

      // Parse QR code
      const parsed = parseQRCode(student.qrCodeData);
      console.log(`  Parsed QR:`, parsed);

      // Check for attendance records
      const attendanceRecords = await Attendance.find({
        studentId: student._id,
      });
      console.log(`  Attendance records: ${attendanceRecords.length}`);

      if (attendanceRecords.length > 0) {
        console.log(`  Attendance details:`);
        for (const record of attendanceRecords) {
          console.log(`    - Event: ${record.eventId}`);
          console.log(`    - Morning: ${record.signInMorning ? "YES" : "NO"}`);
          console.log(
            `    - Afternoon: ${record.signInAfternoon ? "YES" : "NO"}`
          );
          console.log(`    - Created: ${record.createdAt}`);
        }
      }
    }

    // Check for duplicate student IDs
    console.log("\n=== CHECKING FOR DUPLICATE STUDENT IDs ===");
    const allStudents = await Student.find({});
    const studentIdMap = new Map();

    for (const student of allStudents) {
      if (studentIdMap.has(student.studentId)) {
        console.log(`DUPLICATE STUDENT ID FOUND: ${student.studentId}`);
        console.log(
          `  Student 1: ${studentIdMap.get(student.studentId).studentName}`
        );
        console.log(`  Student 2: ${student.studentName}`);
      } else {
        studentIdMap.set(student.studentId, student);
      }
    }

    // Check for similar student IDs that might cause conflicts
    console.log("\n=== CHECKING FOR SIMILAR STUDENT IDs ===");
    const studentIds = allStudents.map((s) => s.studentId).sort();
    for (let i = 0; i < studentIds.length; i++) {
      for (let j = i + 1; j < studentIds.length; j++) {
        const id1 = studentIds[i];
        const id2 = studentIds[j];

        // Check if one ID is a substring of another
        if (id1.includes(id2) || id2.includes(id1)) {
          console.log(`SIMILAR IDs FOUND: "${id1}" and "${id2}"`);
        }
      }
    }

    // Check all QR codes for potential duplicates
    console.log("\n=== CHECKING FOR DUPLICATE QR CODES ===");
    const qrCodeMap = new Map();

    for (const student of allStudents) {
      if (qrCodeMap.has(student.qrCodeData)) {
        console.log(`DUPLICATE QR CODE FOUND: ${student.qrCodeData}`);
        console.log(
          `  Student 1: ${qrCodeMap.get(student.qrCodeData).studentName}`
        );
        console.log(`  Student 2: ${student.studentName}`);
      } else {
        qrCodeMap.set(student.qrCodeData, student);
      }
    }

    // List all students for reference
    console.log("\n=== ALL STUDENTS ===");
    for (const student of allStudents) {
      console.log(
        `${student.studentId} - ${student.studentName} - QR: ${student.qrCodeData}`
      );
    }

    // List all events
    console.log("\n=== ALL EVENTS ===");
    const allEvents = await Event.find({});
    for (const event of allEvents) {
      console.log(`${event._id} - ${event.title} - ${event.eventDate}`);
    }

    // Check orphaned attendance records
    console.log("\n=== CHECKING FOR ORPHANED ATTENDANCE RECORDS ===");
    const allAttendance = await Attendance.find({});
    console.log(`Total attendance records: ${allAttendance.length}`);

    for (const record of allAttendance) {
      const student = await Student.findById(record.studentId);
      const event = await Event.findById(record.eventId);

      if (!student) {
        console.log(
          `ORPHANED ATTENDANCE: No student found for ID ${record.studentId}`
        );
      }
      if (!event) {
        console.log(
          `ORPHANED ATTENDANCE: No event found for ID ${record.eventId}`
        );
      }

      if (student && event) {
        console.log(
          `${student.studentName} -> ${event.title} (Morning: ${
            record.signInMorning ? "YES" : "NO"
          }, Afternoon: ${record.signInAfternoon ? "YES" : "NO"})`
        );
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Error during debugging:", error);
    process.exit(1);
  }
}

debugAttendance();
