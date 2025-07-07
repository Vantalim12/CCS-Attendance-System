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
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Organization_1 = __importDefault(require("../models/Organization"));
const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, role, organizationName } = req.body;
        if (!email || !password || !role || !organizationName) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }
        let organization = yield Organization_1.default.findOne({ name: organizationName });
        if (!organization) {
            organization = yield Organization_1.default.create({ name: organizationName });
        }
        const passwordHash = yield bcryptjs_1.default.hash(password, 10);
        const user = yield User_1.default.create({
            email,
            passwordHash,
            role,
            organizationId: organization._id,
        });
        res.status(201).json({ user });
    }
    catch (error) {
        res.status(500).json({ message: "Registration failed", error });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield User_1.default.findOne({ email });
        if (!user) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        const isMatch = yield bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user._id,
            role: user.role,
            organizationId: user.organizationId,
        }, JWT_SECRET, { expiresIn: "1d" });
        res.json({ token, user });
    }
    catch (error) {
        res.status(500).json({ message: "Login failed", error });
    }
});
exports.login = login;
