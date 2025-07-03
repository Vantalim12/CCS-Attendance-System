import mongoose, { Document, Schema } from "mongoose";

export interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;
  studentId: string;
  studentName: string;
  yearLevel: string;
  major: string;
  departmentProgram: string;
  status: string; // 'regular' | 'governor' | 'vice-governor' | 'under-secretary'
  qrCodeData: string;
  organizationId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema<IStudent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentId: { type: String, required: true, unique: true },
    studentName: { type: String, required: true },
    yearLevel: { type: String, required: true },
    major: { type: String, required: true },
    departmentProgram: { type: String, required: true },
    status: { type: String, required: true },
    qrCodeData: { type: String, required: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IStudent>("Student", StudentSchema);
