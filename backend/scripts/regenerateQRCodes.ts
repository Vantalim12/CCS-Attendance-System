import dotenv from "dotenv";
import { connectDB } from "../src/utils/db";
import Student from "../src/models/Student";
import Organization from "../src/models/Organization";
import { generateQRCode } from "../src/services/qr.service";

// Load environment variables
dotenv.config();

async function regenerateQRCodes() {
  try {
    // Connect to database
    await connectDB();
    console.log("Connected to database");

    // Get all students
    const students = await Student.find({});
    console.log(`Found ${students.length} students`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const student of students) {
      try {
        // Get organization for this student
        const organization = await Organization.findById(
          student.organizationId
        );
        let orgIdentifier = "DEFAULT";

        if (organization) {
          // Create a simple identifier from the organization name
          orgIdentifier = organization.name
            .replace(/\s+/g, "")
            .substring(0, 10);
        }

        console.log(
          `Processing student: ${student.studentId} (${student.studentName})`
        );
        console.log(
          `  Organization: ${
            organization?.name || "Unknown"
          } (${orgIdentifier})`
        );

        // Generate new QR code
        const newQRCodeData = await generateQRCode(
          student.studentId,
          student.studentName,
          false,
          orgIdentifier
        );

        console.log(`  Old QR: ${student.qrCodeData}`);
        console.log(`  New QR: ${newQRCodeData}`);

        // Update student with new QR code
        await Student.findByIdAndUpdate(student._id, {
          qrCodeData: newQRCodeData,
        });

        updatedCount++;
        console.log(`  ✓ Updated QR code for ${student.studentId}`);
      } catch (error) {
        console.error(`  ✗ Error updating ${student.studentId}:`, error);
        errorCount++;
      }
    }

    console.log("\n=== Summary ===");
    console.log(`Total students: ${students.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log("QR code regeneration completed");

    process.exit(0);
  } catch (error) {
    console.error("Error regenerating QR codes:", error);
    process.exit(1);
  }
}

regenerateQRCodes();
