import { Request, Response } from "express";
import Student from "../models/Student";
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

    res.json(students);
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
    res.json(student);
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
      studentName,
      yearLevel,
      major,
      departmentProgram,
      status,
    } = req.body;

    // Check if student ID already exists
    const existingStudent = await Student.findOne({ studentId });
    if (existingStudent) {
      res.status(400).json({ message: "Student ID already exists" });
      return;
    }

    // Generate QR code data
    const qrCodeData = generateQRCode(studentId, studentName);

    const student = await Student.create({
      studentId,
      studentName,
      yearLevel,
      major,
      departmentProgram,
      status: status || "regular",
      qrCodeData,
      organizationId: req.body.organizationId || "507f1f77bcf86cd799439011", // Default org for now
    });

    res.status(201).json({ message: "Student created successfully", student });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to create student", error });
    return;
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body;

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

      // Regenerate QR code if student ID changed
      if (req.body.studentName) {
        req.body.qrCodeData = generateQRCode(studentId, req.body.studentName);
      }
    }

    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }
    res.json({ message: "Student updated successfully", student });
    return;
  } catch (error) {
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
    const qrCodes: { [key: string]: string } = {};

    for (const student of students) {
      // Generate QR code as base64 image
      const qrCodeBase64 = generateQRCode(
        student.studentId,
        student.studentName,
        true
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

    // Generate PDF with QR codes (this would need a PDF library like puppeteer or pdfkit)
    // For now, we'll return a simple response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="student-qr-codes.pdf"'
    );

    // This would generate an actual PDF in a real implementation
    res.status(501).json({ message: "PDF generation not implemented yet" });
    return;
  } catch (error) {
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

    const userId = (req as any).user.id;
    const organizationId =
      req.body.organizationId || "507f1f77bcf86cd799439011"; // Default org

    const result = await importStudentsFromExcel(req.file.path, organizationId);

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
    const organizationId =
      (req.query.organizationId as string) || "507f1f77bcf86cd799439011";
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
