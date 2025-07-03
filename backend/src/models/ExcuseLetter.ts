import mongoose, { Document, Schema } from "mongoose";

export interface IExcuseLetter extends Document {
  studentId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  reason: string;
  filePath: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
}

const ExcuseLetterSchema: Schema = new Schema<IExcuseLetter>({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  reason: { type: String, required: true },
  filePath: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    required: true,
  },
  submittedAt: { type: Date, required: true },
  approvedAt: { type: Date },
  approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
});

export default mongoose.model<IExcuseLetter>(
  "ExcuseLetter",
  ExcuseLetterSchema
);
