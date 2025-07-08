# CCS-Attendance-System

A comprehensive QR code-based attendance management system built with React (frontend) and Node.js/Express (backend).

## 🛠️ System Requirements

### Prerequisites

- **Node.js**: v16.x or higher
- **npm**: v8.x or higher (comes with Node.js)
- **MongoDB**: v5.x or higher
- **Git**: Latest version

### Operating System

- Windows 10/11
- macOS 10.15+
- Linux (Ubuntu 20.04+)

## 📦 Dependencies Overview

### Backend Dependencies

- **Runtime**: Node.js with TypeScript
- **Database**: MongoDB
- **Framework**: Express.js
- **Authentication**: JWT + bcryptjs
- **File Processing**: ExcelJS, Multer, PDFKit
- **QR Code**: QRCode library
- **Validation**: Express-validator

### Frontend Dependencies

- **Framework**: React 19.1.0
- **UI**: Tailwind CSS
- **QR Scanner**: html5-qrcode
- **HTTP Client**: Axios
- **Routing**: React Router DOM
- **TypeScript**: v4.9.5

## 🚀 Quick Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/CCS-Attendance-System.git
cd CCS-Attendance-System
```

### 2. Environment Setup

#### Backend Environment

Create `backend/.env` file with:

```env
# Database Configuration
MONGO_URI=mongodb://localhost:27017/qr-attendance-system

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

# Server Configuration
PORT=5000

# Environment
NODE_ENV=development

# CORS Configuration (Optional)
CORS_ORIGIN=http://localhost:3000

# Security Configuration (Optional)
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=24h

# File Upload Configuration (Optional)
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# MongoDB Atlas Example (if using cloud database)
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/qr-attendance-system?retryWrites=true&w=majority
```

#### Frontend Environment

Create `frontend/.env` file with:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api

# Environment
NODE_ENV=development

# Optional: Application Configuration
# REACT_APP_TITLE=CCS Attendance System
# REACT_APP_DEBUG=true
```

### 3. Install Dependencies

#### Backend Installation

```bash
cd backend
npm install
```

#### Frontend Installation

```bash
cd frontend
npm install
```

### 4. Database Setup

#### Option A: Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service:

   ```bash
   # Windows
   net start MongoDB

   # macOS (with Homebrew)
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod
   ```

#### Option B: MongoDB Atlas (Cloud)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGO_URI` in `backend/.env`

### 5. Initialize Database

```bash
cd backend
# Create admin user
npm run create-admin

# Verify admin user
npm run verify-admin

# Generate test data (optional)
npm run generate-test-data
```

### 6. Start the Application

#### Development Mode

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

#### Production Mode

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve build folder with your preferred server
```

## 📱 Application URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **MongoDB**: mongodb://localhost:27017

## 🔧 Available Scripts

### Backend Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm start            # Start production server
npm run create-admin # Create admin user
npm run verify-admin # Verify admin credentials
npm run generate-test-data # Generate sample data
npm run regenerate-qr # Regenerate QR codes
npm run check-db     # Check database connection
```

### Frontend Scripts

```bash
npm start            # Start development server
npm run build        # Build for production
npm test             # Run tests
npm run eject        # Eject from Create React App
```

## 🛡️ Security Configuration

### HTTPS Requirements

- QR scanner requires HTTPS in production
- Use SSL certificates for production deployment
- Localhost works without HTTPS for development

### Environment Variables

- Never commit `.env` files to version control
- Use strong JWT secrets in production
- Change default MongoDB credentials

## 📦 Package Versions

### Backend Core Dependencies

```json
{
  "express": "^5.1.0",
  "mongoose": "^8.16.1",
  "typescript": "^5.8.3",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^3.0.2",
  "cors": "^2.8.5",
  "dotenv": "^17.0.1",
  "qrcode": "^1.5.4",
  "exceljs": "^4.4.0",
  "multer": "^2.0.1"
}
```

### Frontend Core Dependencies

```json
{
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "typescript": "^4.9.5",
  "axios": "^1.10.0",
  "html5-qrcode": "^2.3.8",
  "react-router-dom": "^7.6.3",
  "tailwindcss": "^3.4.17"
}
```

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Issues

```bash
# Check if MongoDB is running
# Windows
net start MongoDB

# macOS/Linux
brew services list | grep mongodb
sudo systemctl status mongod
```

#### Port Already in Use

```bash
# Kill process on port 3000 or 5000
npx kill-port 3000
npx kill-port 5000
```

#### Node Version Issues

```bash
# Check Node version
node --version
npm --version

# Use Node Version Manager if needed
nvm use 16
```

#### Permission Issues (Linux/macOS)

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

## 🌐 Browser Compatibility

### Supported Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Camera Requirements

- HTTPS required for camera access (except localhost)
- WebRTC support required for QR scanning
- Camera permissions must be granted

## 📝 Additional Notes

- The system uses MongoDB for data persistence
- QR codes are generated server-side and scanned client-side
- File uploads are handled with Multer middleware
- Authentication uses JWT tokens
- Real-time updates available for attendance records

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.
