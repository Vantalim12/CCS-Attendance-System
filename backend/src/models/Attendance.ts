import mongoose, { Document, Schema } from "mongoose";

export interface IAttendance extends Document {
  studentId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  signInMorning?: Date;
  signOutMorning?: Date;
  signInAfternoon?: Date;
  signOutAfternoon?: Date;
  status: "present" | "absent" | "excused";
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema = new Schema<IAttendance>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    signInMorning: { type: Date },
    signOutMorning: { type: Date },
    signInAfternoon: { type: Date },
    signOutAfternoon: { type: Date },
    status: {
      type: String,
      enum: ["present", "absent", "excused"],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAttendance>("Attendance", AttendanceSchema);
