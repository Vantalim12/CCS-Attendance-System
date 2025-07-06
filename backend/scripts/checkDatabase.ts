import mongoose from "mongoose";
import Student from "../src/models/Student";
import User from "../src/models/User";
import Organization from "../src/models/Organization";
import Event from "../src/models/Event";

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/attendance-system");
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const checkDatabase = async () => {
  try {
    await connectDB();

    console.log("=== Database Status Check ===");

    // Check collections
    const students = await Student.find({});
    const users = await User.find({});
    const organizations = await Organization.find({});
    const events = await Event.find({});

    console.log(`\n📊 Collection Counts:`);
    console.log(`Students: ${students.length}`);
    console.log(`Users: ${users.length}`);
    console.log(`Organizations: ${organizations.length}`);
    console.log(`Events: ${events.length}`);

    if (students.length > 0) {
      console.log(`\n👥 Sample Students:`);
      students.slice(0, 3).forEach((student, index) => {
        console.log(
          `${index + 1}. ${student.studentName} (${student.studentId})`
        );
        console.log(`   QR Code: ${student.qrCodeData}`);
      });
    } else {
      console.log(`\n⚠️  No students found in database!`);
      console.log(
        `   This explains why QR scanning returns "Student not found"`
      );
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
        console.log(
          `${index + 1}. ${event.title} - ${new Date(
            event.eventDate
          ).toLocaleDateString()}`
        );
      });
    }

    console.log(`\n=== End Database Check ===`);
  } catch (error) {
    console.error("Error checking database:", error);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the script
checkDatabase();
