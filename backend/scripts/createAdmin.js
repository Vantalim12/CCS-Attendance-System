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
function createAdmin() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Connect to database
            yield (0, db_1.connectDB)();
            console.log("Connected to database");
            // Check if admin user already exists
            const existingAdmin = yield User_1.default.findOne({ email: "admin@softui.com" });
            if (existingAdmin) {
                console.log("Admin user already exists");
                process.exit(0);
            }
            // Create or find organization
            let organization = yield Organization_1.default.findOne({
                name: "Default Organization",
            });
            if (!organization) {
                organization = yield Organization_1.default.create({
                    name: "Default Organization",
                });
                console.log("Created default organization");
            }
            // Hash password
            const saltRounds = 10;
            const passwordHash = yield bcryptjs_1.default.hash("secret", saltRounds);
            // Create admin user
            const adminUser = yield User_1.default.create({
                email: "admin@softui.com",
                passwordHash,
                role: "admin",
                organizationId: organization._id,
            });
            console.log("Admin user created successfully:");
            console.log("Email: admin@softui.com");
            console.log("Password: secret");
            console.log("Role: admin");
            console.log("Organization:", organization.name);
            process.exit(0);
        }
        catch (error) {
            console.error("Error creating admin user:", error);
            process.exit(1);
        }
    });
}
createAdmin();
