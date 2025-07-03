import mongoose, { Document, Schema } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema
);
