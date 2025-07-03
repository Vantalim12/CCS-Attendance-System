import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/utils/db";
import User from "../src/models/User";
import Organization from "../src/models/Organization";

// Load environment variables
dotenv.config();

async function createAdmin() {
  try {
    // Connect to database
    await connectDB();
    console.log("Connected to database");

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: "admin@softui.com" });
    if (existingAdmin) {
      console.log("Admin user already exists");
      process.exit(0);
    }

    // Create or find organization
    let organization = await Organization.findOne({
      name: "Default Organization",
    });
    if (!organization) {
      organization = await Organization.create({
        name: "Default Organization",
      });
      console.log("Created default organization");
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash("secret", saltRounds);

    // Create admin user
    const adminUser = await User.create({
      email: "admin@softui.com",
      passwordHash,
      role: "admin",
      organizationId: organization._id,
    });

    console.log("Admin user created successfully:");
    console.log("Email: admin@softui.com");
    console.log("Password: secret");
    console.log("Role: admin");
    console.log("Organization:", organization.name);

    process.exit(0);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
}

createAdmin();
