import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/utils/db";
import User from "../src/models/User";
import Organization from "../src/models/Organization";

// Load environment variables
dotenv.config();

async function verifyAdmin() {
  try {
    // Connect to database
    await connectDB();
    console.log("Connected to database");

    // Find admin user
    const adminUser = await User.findOne({ email: "admin@softui.com" });
    if (!adminUser) {
      console.log("Admin user not found");
      process.exit(1);
    }

    console.log("Admin user found:");
    console.log("Email:", adminUser.email);
    console.log("Role:", adminUser.role);
    console.log("Organization ID:", adminUser.organizationId);

    // Find organization
    const organization = await Organization.findById(adminUser.organizationId);
    if (organization) {
      console.log("Organization name:", organization.name);
    }

    // Test password
    const passwordMatch = await bcrypt.compare(
      "secret",
      adminUser.passwordHash
    );
    console.log("Password verification:", passwordMatch ? "SUCCESS" : "FAILED");

    if (!passwordMatch) {
      console.log("Stored hash:", adminUser.passwordHash);
      console.log("Testing with plain password...");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error verifying admin user:", error);
    process.exit(1);
  }
}

verifyAdmin();
