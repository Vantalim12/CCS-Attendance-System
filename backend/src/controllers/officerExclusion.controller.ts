import { Request, Response } from "express";
import OfficerExclusion from "../models/OfficerExclusion";
import {
  importOfficerExclusionsFromExcel,
  exportOfficerExclusionsToExcel,
} from "../services/excel.service";
import path from "path";

export const getOfficerExclusions = async (req: Request, res: Response) => {
  // TODO: Add filtering, date range, etc.
  const exclusions = await OfficerExclusion.find();
  res.json(exclusions);
};

export const getOfficerExclusion = async (req: Request, res: Response) => {
  const exclusion = await OfficerExclusion.findById(req.params.id);
  if (!exclusion) {
    res.status(404).json({ message: "Exclusion not found" });
    return;
  }
  res.json(exclusion);
};

export const createOfficerExclusion = async (req: Request, res: Response) => {
  const exclusion = await OfficerExclusion.create(req.body);
  res.status(201).json(exclusion);
};

export const updateOfficerExclusion = async (req: Request, res: Response) => {
  const exclusion = await OfficerExclusion.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  if (!exclusion) {
    res.status(404).json({ message: "Exclusion not found" });
    return;
  }
  res.json(exclusion);
};

export const deleteOfficerExclusion = async (req: Request, res: Response) => {
  const exclusion = await OfficerExclusion.findByIdAndDelete(req.params.id);
  if (!exclusion) {
    res.status(404).json({ message: "Exclusion not found" });
    return;
  }
  res.json({ message: "Exclusion deleted" });
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
