"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./utils/db");
// Import models to ensure they are registered
require("./models/User");
require("./models/Student");
require("./models/Event");
require("./models/Attendance");
require("./models/OfficerExclusion");
require("./models/ExcuseLetter");
require("./models/Organization");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const event_routes_1 = __importDefault(require("./routes/event.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const officerExclusion_routes_1 = __importDefault(require("./routes/officerExclusion.routes"));
const excuseLetter_routes_1 = __importDefault(require("./routes/excuseLetter.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Register routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/students", student_routes_1.default);
app.use("/api/events", event_routes_1.default);
app.use("/api/attendance", attendance_routes_1.default);
app.use("/api/officer-exclusions", officerExclusion_routes_1.default);
app.use("/api/excuse-letters", excuseLetter_routes_1.default);
const PORT = process.env.PORT || 5000;
(0, db_1.connectDB)().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
