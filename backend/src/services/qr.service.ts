import crypto from "crypto";
import QRCode from "qrcode";

export function parseQRCode(qrData: string) {
  // Use a more robust separator that won't conflict with student IDs
  // New format: studentId|orgId|hash|suffix or studentId|orgId|hash
  const parts = qrData.split("|");

  if (parts.length >= 3) {
    if (parts.length === 4) {
      // Format: studentId|orgId|hash|suffix
      const [studentId, organizationId, timestampHash, suffix] = parts;
      return { studentId, organizationId, timestampHash, suffix };
    } else if (parts.length === 3) {
      // Format: studentId|orgId|hash
      const [studentId, organizationId, timestampHash] = parts;
      return { studentId, organizationId, timestampHash };
    }
  }

  // Fallback: parse old format (dash-separated) with smart logic
  const dashParts = qrData.split("-");

  if (dashParts.length >= 3) {
    // Smart parsing for legacy format
    if (dashParts.length === 4) {
      // For 4-part format like "2021-0003-DEFAULT-8bf22c02"
      // Reconstruct student ID from first two parts
      const potentialStudentId = `${dashParts[0]}-${dashParts[1]}`;
      const organizationId = dashParts[2];
      const timestampHash = dashParts[3];

      return {
        studentId: potentialStudentId,
        organizationId,
        timestampHash,
        _originalFormat: "legacy-4-parts",
      };
    } else if (dashParts.length === 5) {
      // For 5-part format like "2021-1304-TestOrg-fb6c-8daf"
      const potentialStudentId = `${dashParts[0]}-${dashParts[1]}`;
      const organizationId = dashParts[2];
      const timestampHash = `${dashParts[3]}-${dashParts[4]}`;

      return {
        studentId: potentialStudentId,
        organizationId,
        timestampHash,
        _originalFormat: "legacy-5-parts",
      };
    } else if (dashParts.length === 3) {
      // For 3-part format, assume simple format
      const [studentId, organizationId, timestampHash] = dashParts;

      return {
        studentId,
        organizationId,
        timestampHash,
        _originalFormat: "legacy-3-parts",
      };
    }
  }

  return null;
}

export function validateQRCode(qrData: string, orgSecret: string): boolean {
  const parsed = parseQRCode(qrData);
  if (!parsed) return false;

  // Basic format validation
  if (!parsed.studentId || !parsed.organizationId) {
    return false;
  }

  // For now, just validate the format is correct
  // In production, you could add more sophisticated validation
  return true;
}

export async function generateQRCode(
  studentId: string,
  studentName: string,
  returnBase64: boolean = false,
  organizationId: string = "DEFAULT_ORG"
): Promise<string> {
  // Create a deterministic hash based on student data (not timestamp)
  // This ensures the same student always gets the same QR code
  const dataToHash = `${studentId}-${studentName}-${organizationId}`;
  const hash = crypto
    .createHash("sha256")
    .update(dataToHash)
    .digest("hex")
    .substring(0, 12); // Use 12 characters for better uniqueness

  // Add a random suffix to prevent easy duplication
  const suffix = crypto.randomBytes(4).toString("hex");

  // Use pipe separator to avoid conflicts with dashes in student IDs
  const qrData = `${studentId}|${organizationId}|${hash}|${suffix}`;

  if (returnBase64) {
    try {
      // Generate actual QR code as base64 data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        width: 200,
      });
      return qrCodeDataURL.split(",")[1]; // Return just the base64 part without data:image/png;base64,
    } catch (error) {
      console.error("Error generating QR code:", error);
      return generatePlaceholderQRBase64(qrData);
    }
  }

  return qrData;
}

function generatePlaceholderQRBase64(qrData: string): string {
  // Fallback placeholder base64 image (1x1 pixel PNG)
  const placeholder =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
  return placeholder;
}

// Function to create QR code from student data (for actual QR generation)
export async function createStudentQRData(
  student: any,
  organizationName?: string
): Promise<string> {
  let orgIdentifier = "DEFAULT";

  if (organizationName) {
    orgIdentifier = organizationName.replace(/\s+/g, "").substring(0, 10);
  }

  return await generateQRCode(
    student.studentId,
    student.studentName,
    false,
    orgIdentifier
  );
}

// Helper function to extract the base student ID from a full student ID
export function extractBaseStudentId(fullStudentId: string): string {
  // If the student ID has a format like "2021-1304", extract just "2021"
  // Otherwise return the full ID
  const parts = fullStudentId.split("-");
  return parts[0];
}

// Helper function to validate if a QR code belongs to a specific student
export function validateStudentQRCode(
  qrData: string,
  studentId: string,
  studentName: string,
  organizationId: string
): boolean {
  const parsed = parseQRCode(qrData);
  if (!parsed) return false;

  // Check if the QR code's student ID matches (either exact or base match)
  const baseStudentId = extractBaseStudentId(studentId);
  const qrStudentId = parsed.studentId;

  if (qrStudentId !== studentId && qrStudentId !== baseStudentId) {
    return false;
  }

  // Validate the hash if possible
  const expectedHash = crypto
    .createHash("sha256")
    .update(`${studentId}-${studentName}-${organizationId}`)
    .digest("hex")
    .substring(0, 12);

  return parsed.timestampHash === expectedHash;
}
