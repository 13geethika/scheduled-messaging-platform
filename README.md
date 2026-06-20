# ChronosMsg - Enterprise Scheduled Messaging Platform

ChronosMsg is a production-grade, enterprise-ready Scheduled Messaging Platform built using **Java 21**, **Spring Boot 3**, **React 19 (Vite + TypeScript)**, **Redux Toolkit**, **Spring Security JWT**, and **Quartz Scheduler**.

## Core Features
1. **User Registration & Security**: Includes password encryption (BCrypt), JWT-based authentication with silent renewal (refresh tokens), email verification links, password recovery, and login rate limiting (5 attempts locks accounts for 15 minutes).
2. **Contact Management**: Search active users, send requests, accept connections, remove connections, and block users.
3. **Dynamic Message Scheduler**: Schedule text, image, video, or audio messages to accepted contacts at any future point.
4. **Quartz Engine Integration**:
   - Stores active jobs in the database (`QRTZ_*` schemas).
   - Handles job recoveries automatically upon server restarts (`requestRecovery(true)`).
   - Manages misfire rules safely.
   - Triggers automated retries (up to 3 times, 1 minute apart) for failed deliveries.
   - Calculates daily, weekly, and monthly recurrence schedules dynamically.
5. **Unified Storage Service**:
   - `LocalStorageServiceImpl` (Default): Stores media locally (`uploads/`) and serves static resources. **No AWS account required** for local development.
   - `S3StorageServiceImpl`: An enterprise-grade AWS S3 adapter activated via Spring profiles for cloud production.
6. **In-App Notification Center**: Notification logs for received messages, registration welcomes, and delivery updates.
7. **Interactive Dashboard**: Metric trackers and charts mapping scheduling frequencies and statuses.

---

## Project Structure
```
scheduled-messaging-platform/
│
├── backend/                             # Spring Boot 3 + Java 21 project
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/enterprise/scheduler/
│   │   │   │   ├── config/              # Security, JWT, Quartz, Web MVC config
│   │   │   │   ├── controller/          # REST Endpoints (Auth, Contacts, Messages, etc)
│   │   │   │   ├── dto/                 # Request/Response payloads
│   │   │   │   ├── entity/              # JPA Database entities
│   │   │   │   ├── exception/           # Global exception handler & mappings
│   │   │   │   ├── repository/          # Spring Data JPA repositories
│   │   │   │   ├── scheduler/           # Quartz Job definitions (MessageDeliveryJob)
│   │   │   │   └── service/             # Services & Implementations
│   │   │   └── resources/
│   │   │       ├── application.properties
│   │   │       └── schema.sql           # MySQL DDL for Business + Quartz tables
│   │   └── test/                        # JUnit 5 & Mockito test files
│   ├── Dockerfile
│   └── pom.xml
│
├── frontend/                            # React 19 + TypeScript + Vite project
│   ├── src/
│   │   ├── modules/                     # Feature modules (auth, contacts, messages, etc)
│   │   ├── routes/                      # Route guards & lazy load path definitions
│   │   ├── shared/                      # Axios clients, layouts, and reusable components
│   │   ├── store/                       # Redux Toolkit store, thunks, and slices
│   │   ├── App.tsx                      # Styles, dark theme, and redux providers
│   │   ├── main.tsx
│   │   └── index.css                    # CSS resets & Google Font imports
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
└── docker-compose.yml                   # Multi-container orchestration config
```

---

## Database Schema Design

The normalized schema includes:
- `users`: Credentials, role-based controls, failed login limits, and tokens.
- `contacts`: User-to-user mappings with connection status (`PENDING`, `ACCEPTED`, `BLOCKED`).
- `messages`: Scheduled text/media parameters, recurrences, execution times, and retry metrics.
- `notifications`: User alert logs.
- `refresh_tokens`: Session extension keys.
- **Quartz Schemas**: 11 standard tables (`QRTZ_JOB_DETAILS`, `QRTZ_TRIGGERS`, etc.) holding job persistence parameters.

---

## Quickstart Setup

### Prerequisites
- Docker & Docker Compose
- Java 21 (optional, if running locally without Docker)
- Maven (optional, if running locally without Docker)
- Node.js v18+ & npm (optional, if running locally without Docker)

### Option 1: Run via Docker Compose (Recommended)
This spins up the database, Mailpit server, backend, and frontend containers automatically:

1. In the root directory `scheduled-messaging-platform/`, run:
   ```bash
   docker-compose up --build
   ```
2. Once all services start:
   - **Frontend App**: Access `http://localhost:5173`
   - **Backend API**: Access `http://localhost:8080`
   - **Mailpit WebUI (Interprets registration emails)**: Access `http://localhost:8025`
   - **MySQL Database**: Exposed on port `3306` (username: `root`, password: `root`)

---

### Option 2: Run Locally (For active development)

#### Step 1: Start MySQL and Mailpit
Make sure you have a MySQL server running on port `3306` with database `scheduled_messaging` created, or use docker to start them:
```bash
docker run -d --name local-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=scheduled_messaging mysql:8.0
docker run -d --name local-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

#### Step 2: Start Backend API
1. Navigate to the `backend/` folder.
2. Build and run the jar:
   ```bash
   mvn clean package -DskipTests
   mvn spring-boot:run
   ```
3. The API will start on `http://localhost:8080`.
4. **Swagger OpenAPI Documentation**: Access `http://localhost:8080/swagger-ui/index.html` to test API request payloads.

#### Step 3: Start Frontend Dev Server
1. Navigate to the `frontend/` folder.
2. Install dependencies (if not done already):
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the React app at `http://localhost:5173`.

---

## Testing the Platform Flow

1. **Sign Up**: Access `http://localhost:5173/register` and create an account.
2. **Activate Account**: Go to `http://localhost:8025` (Mailpit). Find the verification email sent by ChronosMsg, and click the link.
3. **Log In**: Go to `http://localhost:5173/login`, authenticate, and receive your JWT tokens.
4. **Add Contact**:
   - Register a second account (e.g. `bob@test.com`) and verify it.
   - From your primary account, go to **Contacts** tab, click **Add Contact**, and request Bob's email.
   - Log in as Bob, navigate to **Contacts -> Requests**, and click **Accept**.
5. **Schedule Message**:
   - Go to **Scheduler** tab.
   - Select Bob's email.
   - Choose a time in the future (e.g. 2 minutes from now).
   - Enter text content, or change Message Type to **IMAGE** and upload a local image file.
   - Click **Schedule Message**.
6. **Watch execution**: Check your console logs. At the scheduled time, the Quartz worker trigger will fire, execute the simulated delivery, log the payload, and notify Bob of the incoming message in real time!

