import { Request, Response } from "express";
import ExcuseLetter from "../models/ExcuseLetter";
import path from "path";
import fs from "fs";

export const getExcuseLetters = async (req: Request, res: Response) => {
  try {
    const letters = await ExcuseLetter.find()
      .populate(
        "studentId",
        "studentId studentName yearLevel major departmentProgram"
      )
      .populate("eventId", "title eventDate startTime endTime")
      .sort({ submittedAt: -1 });
    res.json(letters);
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch excuse letters", error });
    return;
  }
};

export const getExcuseLetter = async (req: Request, res: Response) => {
  try {
    const letter = await ExcuseLetter.findById(req.params.id)
      .populate(
        "studentId",
        "studentId studentName yearLevel major departmentProgram"
      )
      .populate("eventId", "title eventDate startTime endTime");

    if (!letter) {
      res.status(404).json({ message: "Excuse letter not found" });
      return;
    }
    res.json(letter);
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch excuse letter", error });
    return;
  }
};

export const createExcuseLetter = async (req: Request, res: Response) => {
  try {
    const { eventId, reason } = req.body;
    const userId = (req as any).user.userId; // Get user ID from JWT

    if (!req.file) {
      res.status(400).json({ message: "File is required" });
      return;
    }

    if (!eventId || !reason) {
      res.status(400).json({ message: "Event ID and reason are required" });
      return;
    }

    // Find the student record for this user
    const Student = require("../models/Student");
    const student = await Student.findOne({ userId });
    if (!student) {
      res.status(404).json({ message: "Student record not found" });
      return;
    }

    const filePath = req.file.path;
    const letter = await ExcuseLetter.create({
      studentId: student._id,
      eventId,
      reason,
      filePath,
      status: "pending",
      submittedAt: new Date(),
    });

    res
      .status(201)
      .json({ message: "Excuse letter submitted successfully", letter });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to submit excuse letter", error });
    return;
  }
};

export const updateExcuseLetter = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const userId = (req as any).user.userId;

    if (!status || !["approved", "rejected"].includes(status)) {
      res
        .status(400)
        .json({ message: "Valid status (approved/rejected) is required" });
      return;
    }

    const updateData: any = {
      status,
      approvedAt: new Date(),
      approvedBy: userId,
    };

    const letter = await ExcuseLetter.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!letter) {
      res.status(404).json({ message: "Excuse letter not found" });
      return;
    }

    res.json({ message: `Excuse letter ${status}`, letter });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to update excuse letter", error });
    return;
  }
};

export const downloadExcuseLetter = async (req: Request, res: Response) => {
  try {
    const letter = await ExcuseLetter.findById(req.params.id);

    if (!letter) {
      res.status(404).json({ message: "Excuse letter not found" });
      return;
    }

    const filePath = letter.filePath;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // Get file extension for content type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = "application/octet-stream";

    switch (ext) {
      case ".pdf":
        contentType = "application/pdf";
        break;
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".png":
        contentType = "image/png";
        break;
    }

    // Set headers for file download
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="excuse-letter-${letter._id}${ext}"`
    );

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("error", (error) => {
      res.status(500).json({ message: "Error reading file", error });
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to download file", error });
    return;
  }
};

export const deleteExcuseLetter = async (req: Request, res: Response) => {
  try {
    const letter = await ExcuseLetter.findByIdAndDelete(req.params.id);
    if (!letter) {
      res.status(404).json({ message: "Excuse letter not found" });
      return;
    }

    // Delete the file as well
    if (fs.existsSync(letter.filePath)) {
      fs.unlinkSync(letter.filePath);
    }

    res.json({ message: "Excuse letter deleted" });
    return;
  } catch (error) {
    res.status(500).json({ message: "Failed to delete excuse letter", error });
    return;
  }
};
