import { Request, Response } from "express";
import OfficerExclusion from "../models/OfficerExclusion";
import Student from "../models/Student";
import {
  importOfficerExclusionsFromExcel,
  exportOfficerExclusionsToExcel,
} from "../services/excel.service";
import path from "path";

// Get all officer exclusions
export const getOfficerExclusions = async (req: Request, res: Response) => {
  try {
    const exclusions = await OfficerExclusion.find()
      .populate("student", "firstName lastName studentId status")
      .sort({ createdAt: -1 });

    res.json(exclusions);
  } catch (error) {
    console.error("Get officer exclusions error:", error);
    res.status(500).json({ message: "Failed to fetch officer exclusions" });
  }
};

// Get a specific officer exclusion
export const getOfficerExclusion = async (req: Request, res: Response) => {
  try {
    const exclusion = await OfficerExclusion.findById(req.params.id).populate(
      "student",
      "firstName lastName studentId status"
    );

    if (!exclusion) {
      res.status(404).json({ message: "Officer exclusion not found" });
      return;
    }

    res.json(exclusion);
  } catch (error) {
    console.error("Get officer exclusion error:", error);
    res.status(500).json({ message: "Failed to fetch officer exclusion" });
  }
};

// Create new officer exclusion
export const createOfficerExclusion = async (req: Request, res: Response) => {
  try {
    const { studentId, startDate, endDate, reason } = req.body;

    // Validate required fields
    if (!studentId || !startDate || !endDate || !reason) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    // Validate student exists and is an officer
    const student = await Student.findById(studentId);
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const officerStatuses = ["governor", "vice-governor", "under-secretary"];
    if (!officerStatuses.includes(student.status)) {
      res.status(400).json({ message: "Student is not an officer" });
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      res.status(400).json({ message: "End date must be after start date" });
      return;
    }

    // Check for overlapping exclusions
    const overlappingExclusion = await OfficerExclusion.findOne({
      student: studentId,
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      ],
    });

    if (overlappingExclusion) {
      res.status(400).json({
        message: "Overlapping exclusion period exists for this student",
      });
      return;
    }

    const exclusion = await OfficerExclusion.create({
      student: studentId,
      startDate: start,
      endDate: end,
      reason,
      createdBy: (req as any).user?.userId,
    });

    const populatedExclusion = await OfficerExclusion.findById(
      exclusion._id
    ).populate("student", "firstName lastName studentId status");

    res.status(201).json({
      message: "Officer exclusion created successfully",
      exclusion: populatedExclusion,
    });
  } catch (error) {
    console.error("Create officer exclusion error:", error);
    res.status(500).json({ message: "Failed to create officer exclusion" });
  }
};

// Update officer exclusion
export const updateOfficerExclusion = async (req: Request, res: Response) => {
  try {
    const { studentId, startDate, endDate, reason } = req.body;
    const exclusionId = req.params.id;

    // Validate required fields
    if (!studentId || !startDate || !endDate || !reason) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    // Validate student exists and is an officer
    const student = await Student.findById(studentId);
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const officerStatuses = ["governor", "vice-governor", "under-secretary"];
    if (!officerStatuses.includes(student.status)) {
      res.status(400).json({ message: "Student is not an officer" });
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      res.status(400).json({ message: "End date must be after start date" });
      return;
    }

    // Check for overlapping exclusions (excluding current one)
    const overlappingExclusion = await OfficerExclusion.findOne({
      _id: { $ne: exclusionId },
      student: studentId,
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      ],
    });

    if (overlappingExclusion) {
      res.status(400).json({
        message: "Overlapping exclusion period exists for this student",
      });
      return;
    }

    const exclusion = await OfficerExclusion.findByIdAndUpdate(
      exclusionId,
      {
        student: studentId,
        startDate: start,
        endDate: end,
        reason,
      },
      { new: true }
    ).populate("student", "firstName lastName studentId status");

    if (!exclusion) {
      res.status(404).json({ message: "Officer exclusion not found" });
      return;
    }

    res.json({
      message: "Officer exclusion updated successfully",
      exclusion,
    });
  } catch (error) {
    console.error("Update officer exclusion error:", error);
    res.status(500).json({ message: "Failed to update officer exclusion" });
  }
};

// Delete officer exclusion
export const deleteOfficerExclusion = async (req: Request, res: Response) => {
  try {
    const exclusion = await OfficerExclusion.findByIdAndDelete(req.params.id);

    if (!exclusion) {
      res.status(404).json({ message: "Officer exclusion not found" });
      return;
    }

    res.json({ message: "Officer exclusion deleted successfully" });
  } catch (error) {
    console.error("Delete officer exclusion error:", error);
    res.status(500).json({ message: "Failed to delete officer exclusion" });
  }
};

// Check if a student is excluded on a specific date
export const checkExclusion = async (req: Request, res: Response) => {
  try {
    const { studentId, date } = req.query;

    if (!studentId || !date) {
      res.status(400).json({ message: "Student ID and date are required" });
      return;
    }

    const checkDate = new Date(date as string);

    const exclusion = await OfficerExclusion.findOne({
      student: studentId,
      startDate: { $lte: checkDate },
      endDate: { $gte: checkDate },
    }).populate("student", "firstName lastName studentId status");

    res.json({
      isExcluded: !!exclusion,
      exclusion: exclusion || null,
    });
  } catch (error) {
    console.error("Check exclusion error:", error);
    res.status(500).json({ message: "Failed to check exclusion" });
  }
};

// Get active exclusions
export const getActiveExclusions = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const activeExclusions = await OfficerExclusion.find({
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate("student", "firstName lastName studentId status")
      .sort({ startDate: 1 });

    res.json(activeExclusions);
  } catch (error) {
    console.error("Get active exclusions error:", error);
    res.status(500).json({ message: "Failed to fetch active exclusions" });
  }
};

export const importOfficerExclusions = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "File is required" });
      return;
    }
    const createdBy = req.body.createdBy;
    const exclusions = await importOfficerExclusionsFromExcel(
      req.file.path,
      createdBy
    );
    res
      .status(201)
      .json({ message: "Officer exclusions imported", exclusions });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to import officer exclusions", error });
  }
};

export const exportOfficerExclusions = async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string;
    const filePath = path.join(
      "uploads",
      `officer_exclusions_export_${Date.now()}.xlsx`
    );
    await exportOfficerExclusionsToExcel(organizationId, filePath);
    res.download(filePath, "officer_exclusions.xlsx");
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to export officer exclusions", error });
  }
};
