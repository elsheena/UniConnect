# UniConnect

UniConnect is an enterprise-grade, microservices-based platform designed and developed as a university thesis project. Its purpose is to facilitate the seamless integration of international students into the university ecosystem. The system bridges the gap between newcomers and their campuses by providing targeted guidance, peer mentorship, community networking, and verified university representations.

The architecture is implemented in C# .NET 8.0, showcasing a highly modular, decoupled microservices topology utilizing an API Gateway, database per service pattern, asynchronous background processing, and modern software design patterns.

---

## Technical Stack & Infrastructure

* **Language & Runtime**: C# .NET 8.0 SDK / ASP.NET Core
* **Gateway Routing**: Ocelot API Gateway (Port 3000)
* **Object-Relational Mapping (ORM)**: Entity Framework Core (EF Core)
* **Database Engine**: PostgreSQL
* **Security & Session Management**: ASP.NET Core Data Protection API with shared cryptographic keys (`uniconnect-keys`) across isolated microservices
* **Real-time Log Delivery**: Server-Sent Events (SSE) streaming API for integration test monitoring

---

## Architectural Topology & Bounded Contexts

The solution is organized into isolated assemblies to ensure strict boundaries. The directory structure is organized as follows:

```
E:\FREERIDE\Documents\Thesis\UniConnect
│   UniConnect.sln                 # Central .NET Solution File
│   run_all.ps1                    # PowerShell Ecosystem Startup Script
├───src
│   ├───ApiGateway                 # Central Entrypoint & Ocelot Reverse Proxy
│   ├───NotificationWorker         # Asynchronous Background Mail Daemon
│   ├───Shared                     # Common Core Entities and Base Data Access
│   │   ├───Shared.Core
│   │   └───Shared.DataAccess
│   └───Subsystems                 # Segregated Subsystem Projects
│       ├───Admin                  # Admin & Moderation Subsystem (Port 3005)
│       ├───Auth                   # Profile & Authentication Subsystem (Port 3001)
│       ├───Chats                  # Private & Community Communication Subsystem (Port 3002)
│       ├───Files                  # Document Storage & BLOB Mapping Subsystem (Port 3003)
│       └───Services               # University & Peer Booking Subsystem (Port 3004)
└───tests
    └───IntegrationTests           # End-to-End Suite for Business Logics
```

Each subsystem under `src/Subsystems/` is partitioned into a four-tier architecture:
1. **`.Core`**: Declares subsystem-specific DTOs, domain models, and service abstractions.
2. **`.DataAccess`**: Hosts DbContext configurations and entity-to-table mappings.
3. **`.BLL`**: Implements business rules and core application workflows.
4. **`.API`**: Exposes stateless REST controllers and manages service lifetime registration.

---

## Architectural Patterns & Best Practices Implemented

### 1. API Gateway Pattern
A centralized `ApiGateway` serves as the single entrypoint for all clients. Utilizing Ocelot, the gateway intercepts public HTTP requests and routes them to private downstream subsystem ports (3001–3005) based on routing rules configured in `ocelot.json`. It also acts as the host for static client assets and delivers real-time system diagnostics.

### 2. Database Per Service (Data Isolation)
Each subsystem owns its database boundaries through dedicated `DbContext` classes (e.g., `AuthDbContext`, `ChatsDbContext`). Data models are decoupled, preventing cross-database joins and ensuring that subsystems can be scaled or modified independently without affecting adjacent boundaries.

### 3. Shared Kernel Pattern
To prevent redundant schema definitions, common entities (e.g., `User`, `Notification`, `BackgroundEmail`) and domain-wide enums are extracted into `Shared.Core` and `Shared.DataAccess`. These shared libraries are referenced by the subsystems to maintain model consistency across DbContext boundaries.

### 4. Transactional Outbox Pattern
To guarantee eventual consistency without distributed locks:
* When a user action triggers a system notification, the `BaseDbContext` intercepts the save cycle and inserts a corresponding email delivery job into the `BackgroundEmail` table within the **same local database transaction**.
* The `NotificationWorker` daemon polls this table asynchronously, dispatches the email via SMTP, and marks the job as sent. This guarantees that notifications and emails are sent reliably, even during temporary SMTP failures.

### 5. Strategy Pattern (Decoupled Email Dispatch)
The `EmailService` inside the Admin subsystem implements the Strategy pattern to handle email sending. The service dynamically resolves and delegates email dispatching to different concrete providers (`SmtpEmailSender`, `MailtrapEmailSender`, `FileEmailSender`, or `FailoverEmailSender`) based on the environment configuration, providing automatic fallback.

### 6. Bounded Session Propagation
Microservices share user authentication state statelessy. By using the ASP.NET Core Data Protection API, a temporary session cookie issued by the Auth subsystem is decrypted and verified by Ocelot and adjacent APIs using shared cryptographic keys located in a temporary directory (`uniconnect-keys`).

---

## System Configuration & Launch

### Prerequisites
* **PostgreSQL Engine**: Ensure a PostgreSQL instance is running on `localhost` with a database named `uniconnect` and username/password credentials.
* **.NET 8.0 SDK**: Required for compiling and running the assemblies.

### Startup Execution
The ecosystem can be launched concurrently using the provided PowerShell script at the project root:
```powershell
.\run_all.ps1
```
This script boots up the downstream subsystems, initializes background tasks, waits for port readiness, and launches the central `ApiGateway` on port `3000`.

Open your browser and navigate to:
```
http://localhost:3000
```

---

## Integration Testing

UniConnect includes an end-to-end integration test runner to validate system workflows (e.g., account registration, document verification, booking requests, chat routing, and reward point allocations).

### CLI Execution
Navigate to the test suite directory and run the project:
```bash
cd tests/IntegrationTests
dotnet run
```

### Browser Execution
The test suite can be run and monitored visually from the browser. 
1. Run the system via `.\run_all.ps1`.
2. Visit `http://localhost:3000/tests` in the web browser.
3. Click **Run System Tests** to trigger execution, watch real-time console streaming, and view step-by-step progress tracking.

---

## Pre-seeded Accounts
The database automatically seeds mock accounts for testing. Use any of the following credentials (password suffix is `...123` matching the role name):
* **Admin**: `admin@uniconnect.ru` (Password: `admin123`)
* **Applicant**: `applicant@mail.com` (Password: `applicant123`)
* **Student (Verified Mentor)**: `student@itmo.ru` (Password: `student123`)
* **University Representative**: `rep@hse.ru` (Password: `rep123`)
