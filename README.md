# UniConnect

UniConnect is a unified platform built to seamlessly integrate foreign students into the Russian university ecosystem. Our mission is to bridge the gap between newcomers and their campuses by providing targeted guidance, community networking, and verifiable university representations.

## Key Features
- **Profile Hub & Verification Cycle:** Role-based profiles (Applicant, Student, Representative, Admin) with secure document-based avatar verification.
- **Service & Mentorship Bookings:** Enables applicants to request personalized help (e.g., Airport Pickups, Document Assistance) with verified students from their target universities.
- **Dynamic University Communities:** Country-based global chats alongside restrictive, localized "University Chats" locked exclusively to members of specific institutions.
- **The Matryoshka Reward System (MP):** Integrated economy that rewards actively participating students for offering their mentoring services.
- **Persistent Private Messaging:** End-to-end routing between students and applicants using custom real-time floating chats.

## Tech Stack
- **Backend:** Node.js, Express.js
- **Frontend Vanilla:** HTML5, Modern CSS (Glassmorphism, dark mode variables), Vanilla JS (ES6+)
- **Storage Layer:** Custom in-memory runtime datastore (`store.js`) acting as a Mock DB.

## Installation & Usage
1. Clone the repository:
   ```bash
   git clone https://github.com/elsheena/UniConnect.git
   ```
2. Navigate to the project directory:
   ```bash
   cd UniConnect
   ```
3. Install required backend modules:
   ```bash
   npm install express multer
   ```
4. Start the server environment locally:
   ```bash
   npm start
   ```
   *(Or run `node server.js` directly)*
5. Open your browser and navigate to: `http://localhost:3000`

## Demonstration Accounts
The database automatically seeds active accounts for demonstration. Use any of the following credentials (Password is `...123` matching the role):
- Admin: `admin@uniconnect.ru` / `admin123`
- Applicant: `applicant@mail.com` / `applicant123`
- Student: `student@itmo.ru` / `student123`
- University Rep: `rep@hse.ru` / `rep123`
