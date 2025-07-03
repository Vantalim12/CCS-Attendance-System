import mongoose from "mongoose";
import dotenv from "dotenv";
import Organization from "../src/models/Organization";
import User from "../src/models/User";
import Student from "../src/models/Student";
import OfficerExclusion from "../src/models/OfficerExclusion";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/qr-attendance-system";

async function main() {
  await mongoose.connect(MONGO_URI);

  // Create organization
  const org = await Organization.create({ name: "Test Org" });

  // Create admin user
  const admin = await User.create({
    email: "admin@test.com",
    passwordHash: "testhash",
    role: "admin",
    organizationId: org._id,
  });

  // Create users for students
  const user1 = await User.create({
    email: "alice@test.com",
    passwordHash: "testhash",
    role: "student",
    organizationId: org._id,
  });
  const user2 = await User.create({
    email: "bob@test.com",
    passwordHash: "testhash",
    role: "student",
    organizationId: org._id,
  });

  // Create students
  const students = await Student.insertMany([
    {
      userId: user1._id,
      studentId: "S001",
      studentName: "Alice Smith",
      yearLevel: "1",
      major: "CS",
      departmentProgram: "BSCS",
      status: "regular",
      qrCodeData: "S001-" + org._id + "-hash",
      organizationId: org._id,
    },
    {
      userId: user2._id,
      studentId: "S002",
      studentName: "Bob Jones",
      yearLevel: "2",
      major: "IT",
      departmentProgram: "BSIT",
      status: "governor",
      qrCodeData: "S002-" + org._id + "-hash",
      organizationId: org._id,
    },
  ]);

  // Create officer exclusion
  await OfficerExclusion.create({
    studentId: students[1]._id,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    reason: "Test exclusion",
    createdBy: admin._id,
  });

  console.log("Test data generated.");
  process.exit(0);
}

main();
