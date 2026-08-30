# PCCOE Campus Interview Platform

A campus placement preparation platform for PCCOE students. Students can browse real interview experiences, study questions asked in previous rounds, save useful content, ask and answer questions, and track upcoming campus drives. Final-year students can contribute experiences, while administrators review submissions and manage platform data before it is published.

## Features

- Browse approved interview experiences by company, role, difficulty, and interview year.
- Read interview rounds, questions, tags, preparation tips, package information, and selection status.
- Search and filter the question bank.
- Submit interview experiences as a final-year student.
- Submit answers to questions and upvote useful answers.
- Bookmark complete experiences and individual questions.
- View and manage upcoming campus drives through the calendar.
- Receive notifications for campus drives and other platform events.
- Update profile and password after signing in.
- Admin dashboard for moderation, users, companies, statistics, and campus drives.
- Optional OTP email support through SMTP.
- Responsive static frontend served directly by the Express server.

## Technology Stack

### Backend

- Node.js
- Express 4
- MongoDB with Mongoose 8
- JSON Web Tokens for authentication
- bcryptjs for password hashing
- express-validator for request validation
- Nodemailer for OTP email delivery
- CORS and dotenv

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Font Awesome icons
- Google Fonts

There is no frontend build step. The HTML, CSS, and JavaScript files in `frontend/` are served as static assets by the backend.

## Project Structure

```text
.
├── backend/
│   ├── config/db.js              MongoDB connection and retry handling
│   ├── controllers/              Authentication, experience, and admin logic
│   ├── middleware/               JWT authentication and database checks
│   ├── models/                   Mongoose models
│   ├── routes/                   API route definitions
│   ├── utils/emailService.js     OTP email delivery through SMTP
│   ├── seed.js                   Admin and company seed script
│   └── server.js                 Express application entry point
├── frontend/
│   ├── css/style.css             Shared application styles
│   ├── html/                     Application pages
│   ├── images/                   Logos and visual assets
│   └── js/                       Page-specific and shared browser logic
├── scripts/add-ip.js             MongoDB Atlas network access helper
├── package.json
└── README.md
```

## Prerequisites

Install the following before running the application:

- Node.js 18 or newer recommended
- npm
- A MongoDB database, either MongoDB Atlas or a local MongoDB server
- An SMTP account if OTP email verification is required

## Installation

Clone or open the repository, then install the dependencies:

```bash
npm install
```

Create a `.env` file in the project root, next to `package.json`.

### Environment Variables

```env
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/campus_interview_platform
JWT_SECRET=replace-with-a-long-random-secret

# Optional server settings
PORT=5000
JWT_EXPIRE=7d
NODE_ENV=development

# Optional seeded administrator account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-password
ADMIN_NAME=Platform Administrator

# Optional SMTP settings for OTP emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-app-password
```

`MONGODB_URI` and `JWT_SECRET` should be treated as required for normal operation. The application will keep retrying the MongoDB connection every 30 seconds if the database is unavailable, but API requests other than `/api/health` will be rejected until the connection is ready.

Do not commit `.env` or real credentials to source control. For Gmail SMTP, use an app password rather than an account password when two-step verification is enabled.

## Database Setup

### MongoDB Atlas

1. Create a MongoDB Atlas cluster and database user.
2. Add the current development machine IP under **Security > Network Access**.
3. Put the Atlas connection string in `MONGODB_URI`.
4. If the server reports an IP whitelist error, use the displayed public IP or run:

```bash
node scripts/add-ip.js
```

Allowing `0.0.0.0/0` can help with local development, but it is not recommended for production.

### Seed the administrator and companies

After configuring `MONGODB_URI`, run:

```bash
npm run seed
```

The seed script creates or updates the administrator configured by `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`. It also inserts a starter list of companies when they do not already exist.

The seed script prints the administrator email and password. Change the password before using the application outside local development.

## Running the Application

Start the server in normal mode:

```bash
npm start
```

Start with automatic restart during development:

```bash
npm run dev
```

The default application URL is:

```text
http://localhost:5000
```

Useful URLs:

- Home: `http://localhost:5000/`
- Login: `http://localhost:5000/login`
- Registration: `http://localhost:5000/register`
- Experiences: `http://localhost:5000/experiences`
- Questions: `http://localhost:5000/questions`
- Calendar: `http://localhost:5000/calendar`
- Dashboard: `http://localhost:5000/dashboard`
- Admin: `http://localhost:5000/admin`
- Health check: `http://localhost:5000/api/health`

## User Roles and Workflow

### Junior student

1. Register and sign in.
2. Browse approved experiences and questions.
3. Filter content by company, role, difficulty, or year.
4. Bookmark experiences and questions.
5. Ask questions and submit answers.
6. View notifications and upcoming campus drives.

### Final-year student

Final-year students have all junior capabilities and can submit interview experiences. An experience includes company, role, date, difficulty, experience type, rounds, questions, tips, package information, selection status, and optional anonymous publishing. New submissions are created with `pending` status and must be approved by an administrator before appearing in the approved experience feed.

The API allows submission when the account role is `finalyear`, `admin`, or the profile year is `Final Year`.

### Administrator

Administrators can:

- Review, approve, reject, and delete experiences.
- Remove individual questions from experiences.
- View platform statistics.
- List, deactivate, update roles, and delete users.
- Add and remove companies.
- Create, update, and delete campus drives.
- Trigger notifications to students when a campus drive is created.

All `/api/admin` endpoints and administrator-only calendar mutations require a valid JWT for a user with the `admin` role.

## API Reference

All API responses use JSON. Protected endpoints require:

```http
Authorization: Bearer <jwt-token>
```

### Health

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Confirms that the server is running. |

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a student account. |
| POST | `/api/auth/login` | Public | Authenticate and receive a JWT. |
| POST | `/api/auth/send-otp` | Public | Send an OTP through configured email service. |
| POST | `/api/auth/verify-otp` | Public | Verify an OTP. |
| GET | `/api/auth/me` | Protected | Get the current user. |
| PUT | `/api/auth/updatepassword` | Protected | Change the current password. |
| PUT | `/api/auth/updateprofile` | Protected | Update profile details. |

Registration supports the branches `Computer Engineering`, `IT`, `ENTC`, `Mechanical`, `Civil`, `AI & ML`, `Data Science`, and `Other`. Supported academic years are `FY`, `SY`, `TY`, and `Final Year`.

### Experiences and questions

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/experiences` | Protected | List experiences with search and filter support. |
| GET | `/api/experiences/companies` | Protected | List available companies. |
| GET | `/api/experiences/jobroles` | Protected | List available job roles. |
| GET | `/api/experiences/years` | Protected | List interview years. |
| GET | `/api/experiences/questions` | Protected | Get the question bank. |
| GET | `/api/experiences/company/:name/stats` | Protected | Get company-level statistics. |
| GET | `/api/experiences/my` | Protected | Get experiences submitted by the current user. |
| POST | `/api/experiences` | Final-year/admin | Submit an experience for moderation. |
| GET | `/api/experiences/:id` | Protected | Get one experience. |
| PUT | `/api/experiences/:id` | Protected | Update an experience. |
| DELETE | `/api/experiences/:id` | Protected | Delete an experience. |
| GET | `/api/experiences/:id/answers` | Protected | List answers for an experience. |
| POST | `/api/experiences/:id/answers` | Protected | Add an answer to a question. |
| PUT | `/api/experiences/:id/answers/:answerId/upvote` | Protected | Upvote an answer. |

Experience creation validates the company name, job role, ISO 8601 interview date, difficulty (`Easy`, `Medium`, or `Hard`), and experience type (`Positive`, `Neutral`, or `Negative`). Answer text is limited to 3,000 characters and tips are limited to 2,000 characters.

### Bookmarks

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/bookmarks` | Protected | Get bookmarked experiences and questions. |
| POST | `/api/bookmarks/experience/:id` | Protected | Toggle an experience bookmark. |
| POST | `/api/bookmarks/question` | Protected | Toggle a question bookmark. |
| GET | `/api/bookmarks/experience/:id/check` | Protected | Check an experience bookmark. |

### Notifications

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/notifications` | Protected | Get up to 50 recent notifications and unread count. |
| PUT | `/api/notifications/:id/read` | Protected | Mark one notification as read. |
| PUT | `/api/notifications/read-all` | Protected | Mark all notifications as read. |
| DELETE | `/api/notifications/:id` | Protected | Delete one notification. |
| DELETE | `/api/notifications` | Protected | Clear all notifications. |

### Calendar and campus drives

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/calendar` | Public | List active campus drives. Supports `month`, `year`, and `upcoming=true`. |
| GET | `/api/calendar/:id` | Public | Get one campus drive. |
| POST | `/api/calendar` | Admin | Create a campus drive and notify students. |
| PUT | `/api/calendar/:id` | Admin | Update a campus drive. |
| DELETE | `/api/calendar/:id` | Admin | Delete a campus drive. |

### Administration

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/admin/experiences` | Admin | List all experiences. |
| GET | `/api/admin/experiences/pending` | Admin | List pending experiences. |
| PUT | `/api/admin/experiences/:id/approve` | Admin | Approve an experience. |
| PUT | `/api/admin/experiences/:id/reject` | Admin | Reject an experience. |
| DELETE | `/api/admin/experiences/:id` | Admin | Delete an experience. |
| DELETE | `/api/admin/experiences/:id/questions` | Admin | Delete an experience question. |
| GET | `/api/admin/users` | Admin | List users. |
| PUT | `/api/admin/users/:id/role` | Admin | Change a user's role. |
| PUT | `/api/admin/users/:id/toggle` | Admin | Activate or deactivate a user. |
| DELETE | `/api/admin/users/:id` | Admin | Delete a user. |
| GET | `/api/admin/stats` | Admin | Get dashboard statistics. |
| GET | `/api/admin/companies` | Admin | List companies. |
| POST | `/api/admin/companies` | Admin | Add a company. |
| DELETE | `/api/admin/companies/:id` | Admin | Delete a company. |

## Data Model Overview

- **User**: name, email, optional roll number, branch, academic year, role, account status, verification status, and bookmarks.
- **Experience**: company, job role, interview date and year, rounds, questions, tags, difficulty, tips, experience type, package, selection status, moderation status, author, anonymity, and view count.
- **Answer**: answer text and its relationship to an experience question, including upvote information.
- **Company**: company name, sector, website, and related metadata.
- **CampusDrive**: company, role, date, eligibility and drive details, active status, and creator.
- **Notification**: recipient, notification type, title, message, optional link, related record, read status, and creation date.
- **OTP**: one-time verification data used by the authentication flow.

Experience search uses a MongoDB text index over company name, job role, and questions.

## Security Notes

- Passwords are hashed with bcrypt before being saved.
- Protected routes use JWTs supplied in the `Authorization` header.
- Deactivated accounts cannot use protected endpoints.
- Role checks protect administrator operations.
- Request validation is applied to registration, login, experience submission, answer submission, and campus drive creation.
- Keep `JWT_SECRET`, MongoDB credentials, SMTP credentials, and administrator credentials outside the repository.
- Use HTTPS and a restricted MongoDB network policy when deploying publicly.
- Set `NODE_ENV=production` in production so server errors do not expose internal error messages.

## Troubleshooting

### MongoDB connection errors

Check that `MONGODB_URI` is present and valid. For MongoDB Atlas, verify that the machine's current public IP is in the Atlas Network Access allowlist. The server logs a suggested IP when it detects an Atlas whitelist error.

### API returns database unavailable

The server can start before MongoDB finishes connecting. Wait for the connection log message, or fix the connection and allow the background retry to succeed. `/api/health` remains available while the database is connecting.

### OTP emails are not sent

Verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS`. If SMTP credentials are missing, the email service reports that configuration is incomplete. Check the server logs for delivery errors.

### Port already in use

Set a different port in `.env`:

```env
PORT=5050
```

Then open `http://localhost:5050`.

## Development Notes

- The backend loads `.env` from the repository root.
- Static frontend files are served from `frontend/` by `backend/server.js`.
- API routes are mounted below `/api`.
- Invalid API routes return JSON with a 404 status; invalid browser routes serve the frontend 404 page.
- There is currently no automated test script in `package.json`. Verify changes through the health endpoint, the browser flows, and API requests against a development database.

## License

This project is distributed under the ISC license as declared in `package.json`.
