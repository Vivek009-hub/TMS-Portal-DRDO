# Training Management Portal

A production-ready Training Management Portal built with **React.js**, **Node.js**, **Express.js**, and **MySQL**. Designed for government and institutional training operations with role-based access control, certificate generation, document management, and analytics.

## Features

### Authentication & Authorization
- JWT-based authentication with bcrypt password hashing
- Role-based access: **Super Admin**, **Admin**, **User**
- No public registration — only administrators can create accounts
- Secure password change and session management

### Core Modules
| Module | Description |
|--------|-------------|
| **Dashboard** | Admin analytics with interactive charts; participant personal dashboard |
| **Participants** | Manual entry + Excel import/export (service number, rank, department, unit, etc.) |
| **Courses** | Full course lifecycle management (draft → completed) |
| **Certificates** | Auto-fill templates, PDF export, QR verification, 4 certificate types |
| **Circulars** | Rich-text editable official circulars with PDF generation |
| **Schedules** | Editable course schedules with PDF export |
| **Calendars** | Training calendar management with PDF export |
| **Templates** | Editable document templates with placeholder support |
| **Document Center** | Secure file upload, categorization, and download |
| **Leave Management** | Submit, approve/reject workflow with email notifications |
| **Feedback** | Structured course feedback with star ratings |
| **Reports** | Analytics dashboard with trends and breakdowns |
| **Notifications** | In-app notification system |
| **Settings** | Configurable portal settings |
| **Users** | Admin-managed user account creation |

### Participant Portal
Participants can securely view and download only their own:
- Certificates, schedules, calendars, circulars
- Leave records and attendance
- Course materials
- Submit structured course feedback

## Tech Stack

**Frontend:** React 18, Vite, Redux Toolkit, React Router, Recharts, React Quill, Axios

**Backend:** Node.js, Express.js, MySQL (mysql2), JWT, bcrypt, Joi validation, Winston logging, PDFKit, QRCode, XLSX, Nodemailer, Multer

## Project Structure

```
DRDO Project/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & app configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── database/        # Schema, init, seed scripts
│   │   ├── middleware/      # Auth, validation, upload, error handling
│   │   ├── repositories/    # Data access layer
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helpers, constants, logger
│   │   └── server.js        # Entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client
│   │   ├── components/      # Shared UI components
│   │   ├── features/        # Redux slices
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store
│   │   └── styles/          # Global CSS
│   ├── .env.example
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8.0+

### 1. Database Setup

```bash
# Create MySQL database and tables
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials

npm install
npm run db:init
npm run db:seed
```

### 2. Start Backend

```bash
cd backend
npm run dev
# API runs on http://localhost:8000
```

### 3. Start Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# App runs on http://localhost:5173
```

### Default Login

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@trainingportal.gov | SuperAdmin@123 |

> Change the default password immediately after first login.

## API Endpoints

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/profile` | Auth | Get profile |
| POST | `/api/auth/change-password` | Auth | Change password |
| POST | `/api/users` | Admin | Create user account |

### Participants
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/participants` | Admin | List (paginated, searchable) |
| POST | `/api/participants` | Admin | Create participant |
| PUT | `/api/participants/:id` | Admin | Update participant |
| POST | `/api/participants/import` | Admin | Import from Excel |
| GET | `/api/participants/export` | Admin | Export to Excel |

### Courses
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/courses` | Auth | List courses |
| POST | `/api/courses` | Admin | Create course |
| PUT | `/api/courses/:id` | Admin | Update course |
| DELETE | `/api/courses/:id` | Admin | Delete course |
| POST | `/api/courses/:id/enroll` | Admin | Enroll participant |

### Certificates
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/certificates` | Auth | List certificates |
| POST | `/api/certificates/generate` | Admin | Generate certificate |
| POST | `/api/certificates/bulk-generate` | Admin | Bulk generate |
| GET | `/api/certificates/:id/download` | Auth | Download PDF |
| GET | `/api/certificates/verify/:number` | Public | Verify certificate |

### Documents
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET/POST | `/api/circulars` | Auth/Admin | Circulars CRUD |
| GET | `/api/circulars/:id/pdf` | Auth | Download PDF |
| GET/POST | `/api/schedules` | Auth/Admin | Schedules CRUD |
| GET | `/api/schedules/:id/pdf` | Auth | Download PDF |
| GET/POST | `/api/calendars` | Auth/Admin | Calendars CRUD |
| GET | `/api/calendars/:id/pdf` | Auth | Download PDF |
| GET/POST/PUT | `/api/templates` | Admin | Template management |

### Other
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/dashboard` | Auth | Analytics dashboard |
| GET/POST | `/api/leaves` | Auth | Leave management |
| PATCH | `/api/leaves/:id/status` | Admin | Approve/reject leave |
| GET/POST | `/api/feedback` | Auth | Feedback |
| GET | `/api/feedback/analytics` | Admin | Feedback analytics |
| GET/POST | `/api/documents` | Auth/Admin | Document center |
| GET | `/api/notifications` | Auth | Notifications |
| GET/PUT | `/api/settings` | Admin | System settings |
| GET/POST | `/api/attendance/bulk` | Auth/Admin | Attendance |

All list endpoints support `?page=1&limit=10&search=...` query parameters.

## Excel Import Format

| Column | Required | Description |
|--------|----------|-------------|
| Service Number | Yes | Unique identifier |
| First Name | Yes | Participant first name |
| Last Name | Yes | Participant last name |
| Rank | No | Military/civil rank |
| Department | No | Department name |
| Unit | No | Unit name |
| Email | No | Contact email |
| Phone | No | Contact phone |
| Training Start | No | Start date (YYYY-MM-DD) |
| Training End | No | End date (YYYY-MM-DD) |

## Certificate Template Placeholders

Use these in certificate/document templates:

- `{{participant_name}}`, `{{rank}}`, `{{service_number}}`
- `{{department}}`, `{{unit}}`
- `{{course_name}}`, `{{course_code}}`
- `{{start_date}}`, `{{end_date}}`
- `{{certificate_number}}`, `{{issued_date}}`

## Production Deployment

1. Set `NODE_ENV=production` in backend `.env`
2. Use a strong `JWT_SECRET` (64+ random characters)
3. Configure SMTP for email notifications
4. Set up MySQL with proper user permissions
5. Build frontend: `cd frontend && npm run build`
6. Serve frontend build via Nginx/Apache
7. Use PM2 or similar for backend process management
8. Enable HTTPS with valid SSL certificates
9. Configure rate limiting and firewall rules

## Security Notes

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with configurable expiration
- Helmet.js security headers
- Rate limiting on API and login endpoints
- Input validation with Joi on all endpoints
- Role-based authorization on every route
- File upload type and size restrictions
- No public user registration endpoint

## License

Proprietary — For authorized institutional use only.
