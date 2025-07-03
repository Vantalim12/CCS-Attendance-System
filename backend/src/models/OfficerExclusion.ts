import mongoose, { Document, Schema } from "mongoose";

export interface IOfficerExclusion extends Document {
  studentId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  reason: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OfficerExclusionSchema: Schema = new Schema<IOfficerExclusion>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IOfficerExclusion>(
  "OfficerExclusion",
  OfficerExclusionSchema
);
