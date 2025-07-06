import mongoose from "mongoose";
import Student from "../src/models/Student";
import { generateQRCode } from "../src/services/qr.service";

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/attendance-system", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as any);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const regenerateQRCodes = async () => {
  try {
    await connectDB();

    console.log("Starting QR code regeneration...");

    const students = await Student.find({});
    console.log(`Found ${students.length} students`);

    for (const student of students) {
      try {
        console.log(
          `Processing student: ${student.studentId} - ${student.studentName}`
        );

        // Generate new QR code with correct organization ID
        const newQRCode = await generateQRCode(
          student.studentId,
          student.studentName,
          false,
          String(student.organizationId)
        );

        // Update student with new QR code
        await Student.findByIdAndUpdate(student._id, {
          qrCodeData: newQRCode,
        });

        console.log(`Updated QR code for ${student.studentId}: ${newQRCode}`);
      } catch (error) {
        console.error(`Error processing student ${student.studentId}:`, error);
      }
    }

    console.log("QR code regeneration completed!");
  } catch (error) {
    console.error("Error during QR code regeneration:", error);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the script
regenerateQRCodes();
