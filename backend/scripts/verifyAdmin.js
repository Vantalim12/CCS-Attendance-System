"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../src/utils/db");
const User_1 = __importDefault(require("../src/models/User"));
const Organization_1 = __importDefault(require("../src/models/Organization"));
// Load environment variables
dotenv_1.default.config();
function verifyAdmin() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Connect to database
            yield (0, db_1.connectDB)();
            console.log("Connected to database");
            // Find admin user
            const adminUser = yield User_1.default.findOne({ email: "admin@softui.com" });
            if (!adminUser) {
                console.log("Admin user not found");
                process.exit(1);
            }
            console.log("Admin user found:");
            console.log("Email:", adminUser.email);
            console.log("Role:", adminUser.role);
            console.log("Organization ID:", adminUser.organizationId);
            // Find organization
            const organization = yield Organization_1.default.findById(adminUser.organizationId);
            if (organization) {
                console.log("Organization name:", organization.name);
            }
            // Test password
            const passwordMatch = yield bcryptjs_1.default.compare("secret", adminUser.passwordHash);
            console.log("Password verification:", passwordMatch ? "SUCCESS" : "FAILED");
            if (!passwordMatch) {
                console.log("Stored hash:", adminUser.passwordHash);
                console.log("Testing with plain password...");
            }
            process.exit(0);
        }
        catch (error) {
            console.error("Error verifying admin user:", error);
            process.exit(1);
        }
    });
}
verifyAdmin();
