import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./utils/db";

// Import models to ensure they are registered
import "./models/User";
import "./models/Student";
import "./models/Event";
import "./models/Attendance";
import "./models/OfficerExclusion";
import "./models/ExcuseLetter";
import "./models/Organization";

// Import routes
import authRoutes from "./routes/auth.routes";
import studentRoutes from "./routes/student.routes";
import eventRoutes from "./routes/event.routes";
import attendanceRoutes from "./routes/attendance.routes";
import officerExclusionRoutes from "./routes/officerExclusion.routes";
import excuseLetterRoutes from "./routes/excuseLetter.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/officer-exclusions", officerExclusionRoutes);
app.use("/api/excuse-letters", excuseLetterRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
