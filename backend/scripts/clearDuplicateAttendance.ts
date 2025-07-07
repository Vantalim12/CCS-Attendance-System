import dotenv from "dotenv";
import { connectDB } from "../src/utils/db";
import Student from "../src/models/Student";
import Attendance from "../src/models/Attendance";
import Event from "../src/models/Event";

// Load environment variables
dotenv.config();

async function clearDuplicateAttendance() {
  try {
    // Connect to database
    await connectDB();
    console.log("Connected to database");

    // Get all attendance records
    const allAttendance = await Attendance.find({});
    console.log(`Found ${allAttendance.length} attendance records`);

    let deletedCount = 0;

    for (const record of allAttendance) {
      try {
        // Check if the student still exists
        const student = await Student.findById(record.studentId);
        const event = await Event.findById(record.eventId);

        if (!student) {
          console.log(
            `Deleting orphaned attendance: No student found for ID ${record.studentId}`
          );
          await Attendance.findByIdAndDelete(record._id);
          deletedCount++;
        } else if (!event) {
          console.log(
            `Deleting orphaned attendance: No event found for ID ${record.eventId}`
          );
          await Attendance.findByIdAndDelete(record._id);
          deletedCount++;
        } else {
          console.log(
            `Valid attendance: ${student.studentName} -> ${event.title}`
          );
        }
      } catch (error) {
        console.error(`Error checking record ${record._id}:`, error);
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total records checked: ${allAttendance.length}`);
    console.log(`Records deleted: ${deletedCount}`);
    console.log(`Records remaining: ${allAttendance.length - deletedCount}`);

    // Show remaining attendance records
    const remainingAttendance = await Attendance.find({});
    console.log(`\n=== Remaining Attendance Records ===`);
    for (const record of remainingAttendance) {
      const student = await Student.findById(record.studentId);
      const event = await Event.findById(record.eventId);
      console.log(
        `${student?.studentName || "Unknown"} -> ${
          event?.title || "Unknown Event"
        } (Morning: ${record.signInMorning ? "YES" : "NO"}, Afternoon: ${
          record.signInAfternoon ? "YES" : "NO"
        })`
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("Error clearing duplicate attendance:", error);
    process.exit(1);
  }
}

clearDuplicateAttendance();
