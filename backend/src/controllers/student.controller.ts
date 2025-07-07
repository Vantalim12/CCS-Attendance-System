import { Request, Response } from "express";
import Student from "../models/Student";
import Organization from "../models/Organization";
import {
  importStudentsFromExcel,
  exportStudentsToExcel,
  generateExcelTemplate,
} from "../services/excel.service";
import { generateQRCode } from "../services/qr.service";
import path from "path";
import fs from "fs";

export const getStudents = async (req: Request, res: Response) => {
  try {
    const { search, status, yearLevel, major } = req.query;
    const filter: any = {};

    // Apply filters
    if (status && status !== "all") {
      filter.status = status;
    }

    if (yearLevel && yearLevel !== "all") {
      filter.yearLevel = yearLevel;
    }

    if (major && major !== "all") {
      filter.major = major;
    }

    let students = await Student.find(filter).sort({ createdAt: -1 });

    // Search filter
    if (search && typeof search === "string") {
      const searchRegex = new RegExp(search, "i");
      students = students.filter(
        (student) =>
          searchRegex.test(student.studentName) ||
          searchRegex.test(student.studentId) ||
          searchRegex.test(student.major) ||
          searchRegex.test(student.departmentProgram)
      );
    }

    // Transform student data to match frontend expectations
    const transformedStudents = students.map((student) => {
      const nameParts = student.studentName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      return {
        ...student.toObject(),
        firstName,
        lastName,
        email: "", // Placeholder - we don't have email in the model yet
      };
    });

    res.json(transformedStudents);
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch students", error });
    return;
  }
};

export const getStudent = async (req: Request, res: Response) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Transform student data to match frontend expectations
    const nameParts = student.studentName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const transformedStudent = {
      ...student.toObject(),
      firstName,
      lastName,
      email: "", // Placeholder - we don't have email in the model yet
    };

    res.json(transformedStudent);
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch student", error });
    return;
  }
};

export const createStudent = async (req: Request, res: Response) => {
  try {
    const {
      studentId,
      firstName,
      lastName,
      yearLevel,
      major,
      departmentProgram,
      status,
      organizationId,
    } = req.body;

    // Check if student ID already exists
    const existingStudent = await Student.findOne({ studentId });
    if (existingStudent) {
      res.status(400).json({ message: "Student ID already exists" });
      return;
    }

    // Combine first and last name for studentName field
    const studentName = `${firstName} ${lastName}`;

    // Get userId from authenticated user
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Get organization to use for QR code generation
    let finalOrgId = organizationId;

    // If no organization ID provided, find the Default Organization
    if (!finalOrgId) {
      const defaultOrg = await Organization.findOne({
        name: "Default Organization",
      });
      if (defaultOrg) {
        finalOrgId = defaultOrg._id;
        console.log("Using Default Organization:", finalOrgId);
      } else {
        // If Default Organization doesn't exist, use any available organization
        const anyOrg = await Organization.findOne({});
        if (anyOrg) {
          finalOrgId = anyOrg._id;
          console.log("Using available organization:", anyOrg.name, finalOrgId);
        } else {
          res.status(400).json({
            message:
              "No organizations available. Please create an organization first.",
          });
          return;
        }
      }
    }

    // Find the organization to get its name/identifier for QR code
    const organization = await Organization.findById(finalOrgId);
    if (!organization) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }

    // Create a simple identifier from the organization name
    const orgIdentifier = organization.name
      .replace(/\s+/g, "")
      .substring(0, 10);

    console.log("Creating student with QR code:", {
      studentId,
      studentName,
      orgIdentifier,
      organizationId: finalOrgId,
      organizationName: organization.name,
    });

    // Generate QR code data with organization identifier
    const qrCodeData = await generateQRCode(
      studentId,
      studentName,
      false,
      orgIdentifier
    );

    console.log("Generated QR code data:", qrCodeData);

    const student = await Student.create({
      userId,
      studentId,
      studentName,
      yearLevel,
      major,
      departmentProgram,
      status: status || "regular",
      qrCodeData,
      organizationId: finalOrgId,
    });

    console.log("Student created successfully:", student.studentId);

    // Transform student data to match frontend expectations
    const transformedStudent = {
      ...student.toObject(),
      firstName,
      lastName,
      email: "", // Placeholder - we don't have email in the model yet
    };

    res.status(201).json({
      message: "Student created successfully",
      student: transformedStudent,
    });
    return;
  } catch (error) {
    console.error("Student creation error:", error);
    res.status(500).json({ message: "Failed to create student", error });
    return;
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { studentId, firstName, lastName } = req.body;

    // Prepare update data
    const updateData = { ...req.body };

    // If firstName and lastName are provided, combine them into studentName
    if (firstName && lastName) {
      updateData.studentName = `${firstName} ${lastName}`;
    }

    // If student ID is being changed, check for duplicates
    if (studentId) {
      const existingStudent = await Student.findOne({
        studentId,
        _id: { $ne: req.params.id },
      });
      if (existingStudent) {
        res.status(400).json({ message: "Student ID already exists" });
        return;
      }

      // Regenerate QR code if student ID or name changed
      if (updateData.studentName) {
        const currentStudent = await Student.findById(req.params.id);
        if (currentStudent) {
          // Get organization for QR code generation
          const organization = await Organization.findById(
            currentStudent.organizationId
          );
          let orgIdentifier = "DEFAULT";

          if (organization) {
            orgIdentifier = organization.name
              .replace(/\s+/g, "")
              .substring(0, 10);
          }

          console.log("Regenerating QR code for student:", {
            studentId,
            studentName: updateData.studentName,
            orgIdentifier,
          });

          updateData.qrCodeData = await generateQRCode(
            studentId,
            updateData.studentName,
            false,
            orgIdentifier
          );

          console.log("New QR code data:", updateData.qrCodeData);
        }
      }
    }

    const student = await Student.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    // Transform student data to match frontend expectations
    const nameParts = student.studentName.split(" ");
    const transformedStudent = {
      ...student.toObject(),
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: "", // Placeholder - we don't have email in the model yet
    };

    res.json({
      message: "Student updated successfully",
      student: transformedStudent,
    });
    return;
  } catch (error) {
    console.error("Student update error:", error);
    res.status(500).json({ message: "Failed to update student", error });
    return;
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }
    res.json({ message: "Student deleted successfully" });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to delete student", error });
    return;
  }
};

export const generateQRCodes = async (req: Request, res: Response) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds)) {
      res.status(400).json({ message: "Student IDs array is required" });
      return;
    }

    const students = await Student.find({ _id: { $in: studentIds } });
    const qrCodes: Record<string, string> = {};

    for (const student of students) {
      // Get organization for QR code generation
      const organization = await Organization.findById(student.organizationId);
      let orgIdentifier = "DEFAULT";

      if (organization) {
        // Create a simple identifier from the organization name
        orgIdentifier = organization.name.replace(/\s+/g, "").substring(0, 10);
      }

      const qrCodeBase64 = await generateQRCode(
        student.studentId,
        student.studentName,
        true,
        orgIdentifier
      );
      qrCodes[String(student._id)] = `data:image/png;base64,${qrCodeBase64}`;
    }

    res.json({ qrCodes });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to generate QR codes", error });
    return;
  }
};

export const downloadQRCodes = async (req: Request, res: Response) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds)) {
      res.status(400).json({ message: "Student IDs array is required" });
      return;
    }

    const students = await Student.find({ _id: { $in: studentIds } });

    // Import PDFKit
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="student-qr-codes.pdf"'
    );

    // Pipe the PDF directly to the response
    doc.pipe(res);

    // Add title
    doc.fontSize(16).text("Student QR Codes", { align: "center" });
    doc.moveDown();

    let yPosition = 120;
    let xPosition = 50;
    const itemsPerRow = 3;
    let itemsInCurrentRow = 0;

    for (const student of students) {
      try {
        // Get organization for QR code generation
        const organization = await Organization.findById(
          student.organizationId
        );
        let orgIdentifier = "DEFAULT";

        if (organization) {
          // Create a simple identifier from the organization name
          orgIdentifier = organization.name
            .replace(/\s+/g, "")
            .substring(0, 10);
        }

        // Generate QR code as base64 image
        const qrCodeBase64 = await generateQRCode(
          student.studentId,
          student.studentName,
          true,
          orgIdentifier
        );

        // Add QR code to PDF (convert base64 to buffer)
        const qrBuffer = Buffer.from(qrCodeBase64, "base64");

        // Add QR code image
        doc.image(qrBuffer, xPosition, yPosition, { width: 100, height: 100 });

        // Add student info below QR code
        doc
          .fontSize(10)
          .text(student.studentName, xPosition, yPosition + 110, {
            width: 100,
            align: "center",
          })
          .text(student.studentId, xPosition, yPosition + 125, {
            width: 100,
            align: "center",
          });

        itemsInCurrentRow++;
        xPosition += 160;

        // Move to next row after 3 items
        if (itemsInCurrentRow >= itemsPerRow) {
          itemsInCurrentRow = 0;
          xPosition = 50;
          yPosition += 160;

          // Add new page if needed
          if (yPosition > 650) {
            doc.addPage();
            yPosition = 50;
          }
        }
      } catch (error) {
        console.error(
          `Error adding QR code for student ${student.studentId}:`,
          error
        );
      }
    }

    // Finalize the PDF
    doc.end();
    return;
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ message: "Failed to download QR codes", error });
    return;
  }
};

export const importStudents = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "File is required" });
      return;
    }

    const userId = (req as any).user.userId;
    let organizationId = req.body.organizationId;

    // If no organization ID provided, find the Default Organization
    if (!organizationId) {
      const defaultOrg = await Organization.findOne({
        name: "Default Organization",
      });
      if (defaultOrg) {
        organizationId = defaultOrg._id;
        console.log("Import using Default Organization:", organizationId);
      } else {
        // If Default Organization doesn't exist, use any available organization
        const anyOrg = await Organization.findOne({});
        if (anyOrg) {
          organizationId = anyOrg._id;
          console.log(
            "Import using available organization:",
            anyOrg.name,
            organizationId
          );
        } else {
          res
            .status(400)
            .json({
              message:
                "No organizations available. Please create an organization first.",
            });
          return;
        }
      }
    }

    const result = await importStudentsFromExcel(
      req.file.path,
      organizationId,
      userId
    );

    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({
      message: "Import completed",
      successful: result.successful,
      failed: result.failed,
      skipped: result.skipped,
      errors: result.errors,
    });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to import students", error });
    return;
  }
};

export const exportStudents = async (req: Request, res: Response) => {
  try {
    let organizationId = req.query.organizationId as string;

    // If no organization ID provided, find the Default Organization
    if (!organizationId) {
      const defaultOrg = await Organization.findOne({
        name: "Default Organization",
      });
      if (defaultOrg) {
        organizationId = String(defaultOrg._id);
        console.log("Export using Default Organization:", organizationId);
      } else {
        // If Default Organization doesn't exist, use any available organization
        const anyOrg = await Organization.findOne({});
        if (anyOrg) {
          organizationId = String(anyOrg._id);
          console.log(
            "Export using available organization:",
            anyOrg.name,
            organizationId
          );
        } else {
          res
            .status(400)
            .json({
              message:
                "No organizations available. Please create an organization first.",
            });
          return;
        }
      }
    }

    const filePath = path.join("uploads", `students_export_${Date.now()}.xlsx`);

    await exportStudentsToExcel(organizationId, filePath);

    res.download(filePath, "students.xlsx", (err) => {
      if (err) {
        console.error("Download error:", err);
      } else {
        // Clean up file after download
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }, 5000);
      }
    });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to export students", error });
    return;
  }
};

export const downloadImportTemplate = async (req: Request, res: Response) => {
  try {
    const filePath = path.join(
      "uploads",
      `student_template_${Date.now()}.xlsx`
    );

    await generateExcelTemplate(filePath);

    res.download(filePath, "student-import-template.xlsx", (err) => {
      if (err) {
        console.error("Download error:", err);
      } else {
        // Clean up file after download
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }, 5000);
      }
    });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to generate template", error });
    return;
  }
};

// TODO: Implement importStudents and exportStudents for Excel
