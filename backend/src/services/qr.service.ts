import crypto from "crypto";
import QRCode from "qrcode";

export function parseQRCode(qrData: string) {
  // Example format: studentId-organizationId-timestampHash
  const parts = qrData.split("-");
  if (parts.length < 3) return null;
  const [studentId, organizationId, timestampHash] = parts;
  return { studentId, organizationId, timestampHash };
}

export function validateQRCode(qrData: string, orgSecret: string): boolean {
  // For demo: just check format. In production, decrypt/verify hash with orgSecret.
  const parsed = parseQRCode(qrData);
  if (!parsed) return false;
  // TODO: Add real cryptographic validation
  return true;
}

export async function generateQRCode(
  studentId: string,
  studentName: string,
  returnBase64: boolean = false
): Promise<string> {
  // Generate a unique QR code data string
  const organizationId = "DEFAULT_ORG"; // This should come from context in real implementation
  const timestamp = Date.now().toString();
  const hash = crypto
    .createHash("sha256")
    .update(`${studentId}-${studentName}-${organizationId}-${timestamp}`)
    .digest("hex")
    .substring(0, 8);

  const qrData = `${studentId}-${organizationId}-${hash}`;

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
export async function createStudentQRData(student: any): Promise<string> {
  return await generateQRCode(student.studentId, student.studentName);
}
