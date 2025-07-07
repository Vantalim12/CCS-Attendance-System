import xlsx from "xlsx";
import Student from "../models/Student";
import Organization from "../models/Organization";
import OfficerExclusion from "../models/OfficerExclusion";
import { generateQRCode } from "./qr.service";
import { Request } from "express";
import fs from "fs";

export async function importStudentsFromExcel(
  filePath: string,
  organizationId: string,
  userId: string
) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  // Get organization for QR code generation
  const organization = await Organization.findById(organizationId);
  let orgIdentifier = "DEFAULT";

  if (organization) {
    // Create a simple identifier from the organization name
    orgIdentifier = organization.name.replace(/\s+/g, "").substring(0, 10);
  }

  console.log("Excel import using organization identifier:", orgIdentifier);

  const results = {
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const row of data as any[]) {
    try {
      // Validate required fields
      if (
        !row.student_id ||
        !row.student_name ||
        !row.year_level ||
        !row.major ||
        !row.department_program
      ) {
        results.failed++;
        results.errors.push(
          `Row ${
            results.successful + results.failed + results.skipped + 1
          }: Missing required fields`
        );
        continue;
      }

      // Check if student already exists
      const existingStudent = await Student.findOne({
        studentId: row.student_id,
      });
      if (existingStudent) {
        results.skipped++;
        results.errors.push(
          `Student ID ${row.student_id} already exists - skipped`
        );
        continue;
      }

      // Generate QR code with proper organization identifier
      const qrCodeData = await generateQRCode(
        row.student_id,
        row.student_name,
        false,
        orgIdentifier
      );

      console.log(`Generated QR for ${row.student_id}: ${qrCodeData}`);

      const student = await Student.create({
        userId,
        studentId: row.student_id,
        studentName: row.student_name,
        yearLevel: row.year_level,
        major: row.major,
        departmentProgram: row.department_program,
        status: row.status || "regular",
        organizationId,
        qrCodeData,
      });

      results.successful++;
    } catch (error: any) {
      results.failed++;
      results.errors.push(
        `Row ${results.successful + results.failed + results.skipped}: ${
          error.message
        }`
      );
    }
  }

  console.log("Excel import completed:", results);
  return results;
}

export async function exportStudentsToExcel(
  organizationId: string,
  filePath: string
) {
  const students = await Student.find({ organizationId });
  const data = students.map((s) => ({
    student_id: s.studentId,
    student_name: s.studentName,
    year_level: s.yearLevel,
    major: s.major,
    department_program: s.departmentProgram,
    status: s.status,
    created_date: s.createdAt.toISOString().split("T")[0],
  }));
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Students");
  xlsx.writeFile(workbook, filePath);
  return filePath;
}

export async function generateExcelTemplate(filePath: string) {
  // Create template data with headers and sample rows
  const templateData = [
    {
      student_id: "SAMPLE-001",
      student_name: "Juan Dela Cruz",
      year_level: "1st Year",
      major: "Computer Science",
      department_program: "Bachelor of Science in Computer Science",
      status: "regular",
    },
    {
      student_id: "SAMPLE-002",
      student_name: "Maria Santos",
      year_level: "2nd Year",
      major: "Information Technology",
      department_program: "Bachelor of Science in Information Technology",
      status: "governor",
    },
    {
      student_id: "SAMPLE-003",
      student_name: "Jose Rizal",
      year_level: "3rd Year",
      major: "Computer Engineering",
      department_program: "Bachelor of Science in Computer Engineering",
      status: "vice-governor",
    },
  ];

  const worksheet = xlsx.utils.json_to_sheet(templateData);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 15 }, // student_id
    { wch: 25 }, // student_name
    { wch: 12 }, // year_level
    { wch: 20 }, // major
    { wch: 40 }, // department_program
    { wch: 15 }, // status
  ];
  worksheet["!cols"] = columnWidths;

  // Add instructions sheet
  const instructionsData = [
    {
      Field: "student_id",
      Description: "Unique student ID (required)",
      Example: "2024-001234",
    },
    {
      Field: "student_name",
      Description: "Full name of student (required)",
      Example: "Juan Dela Cruz",
    },
    {
      Field: "year_level",
      Description: "Year level (required)",
      Example: "1st Year, 2nd Year, 3rd Year, 4th Year",
    },
    {
      Field: "major",
      Description: "Student major/course (required)",
      Example: "Computer Science",
    },
    {
      Field: "department_program",
      Description: "Full program name (required)",
      Example: "Bachelor of Science in Computer Science",
    },
    {
      Field: "status",
      Description: "Student status (optional)",
      Example: "regular, governor, vice-governor, under-secretary",
    },
  ];

  const instructionsSheet = xlsx.utils.json_to_sheet(instructionsData);
  instructionsSheet["!cols"] = [{ wch: 20 }, { wch: 40 }, { wch: 30 }];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Students Template");
  xlsx.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  xlsx.writeFile(workbook, filePath);
  return filePath;
}

export async function importOfficerExclusionsFromExcel(
  filePath: string,
  createdBy: string
) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  const exclusions = [];
  for (const row of data as any[]) {
    const exclusion = await OfficerExclusion.create({
      studentId: row.student_id,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      reason: row.reason,
      createdBy,
    });
    exclusions.push(exclusion);
  }
  return exclusions;
}

export async function exportOfficerExclusionsToExcel(
  organizationId: string,
  filePath: string
) {
  const exclusions = await OfficerExclusion.find({ organizationId });
  const data = exclusions.map((e) => ({
    student_id: e.studentId,
    start_date: e.startDate,
    end_date: e.endDate,
    reason: e.reason,
  }));
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "OfficerExclusions");
  xlsx.writeFile(workbook, filePath);
  return filePath;
}
