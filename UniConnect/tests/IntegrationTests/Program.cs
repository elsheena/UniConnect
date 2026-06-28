using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Core.Enums.Application;
using Core.Enums.Booking;
using Core.Enums.Document;
using Core.Enums.Group;
using Core.Enums.Transaction;
using Core.Enums.User;
using Admin.Core.DTOs;
using Admin.BLL.Services;
using Admin.DataAccess.Data;
using Bookings.BLL.Services;
using Bookings.DataAccess;
using Bookings.Core.DTOs;
using Shared.Core.Interfaces;
using Core.Models;

namespace IntegrationTests
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("==================================================");
            Console.WriteLine("  UniConnect Integration Test Runner");
            Console.WriteLine("==================================================");

            var optionsBuilder = new DbContextOptionsBuilder<AdminDbContext>();
            optionsBuilder.UseNpgsql("Host=localhost;Database=uniconnect;Username=postgres;Password=123");

            using var db = new AdminDbContext(optionsBuilder.Options);
            
            db.Database.OpenConnection();
            var connection = db.Database.GetDbConnection();
            
            var bookingsOptionsBuilder = new DbContextOptionsBuilder<BookingsDbContext>().UseNpgsql(connection);
            using var servicesDb = new BookingsDbContext(bookingsOptionsBuilder.Options);

            Console.WriteLine("Connecting to PostgreSQL...");
            try
            {
                await db.Database.OpenConnectionAsync();
                await db.Database.CloseConnectionAsync();
                Console.WriteLine("Database connection successful!");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("Error: Could not connect to the database. Make sure PostgreSQL is running.");
                Console.WriteLine(ex.Message);
                Console.ResetColor();
                return;
            }
            // Start a safe database transaction to leave dev data pristine
            using var transaction = await db.Database.BeginTransactionAsync();
            await servicesDb.Database.UseTransactionAsync(transaction.GetDbTransaction());

            try
            {
                // 1. Setup Mock Data
                Console.WriteLine("\n[1/5] Setting up mock entities...");
                
                var countryCode = "TC"; // Test Country
                var country = await db.Countries.FindAsync(countryCode);
                if (country == null)
                {
                    country = new Country { Code = countryCode, Name = "TestCountry", Icon = "flag-tc" };
                    db.Countries.Add(country);
                }

                var countryGroup = await db.Groups.FirstOrDefaultAsync(g => g.GroupType == GroupType.Country && g.CountryCode == countryCode);
                if (countryGroup == null)
                {
                    countryGroup = new Group 
                    { 
                        Name = "TestCountry Students Group", 
                        CountryCode = countryCode, 
                        GroupType = GroupType.Country, 
                        Flag = "flag-tc" 
                    };
                    db.Groups.Add(countryGroup);
                }

                var globalGroup = await db.Groups.FirstOrDefaultAsync(g => g.CountryCode == "ALL");
                if (globalGroup == null)
                {
                    globalGroup = new Group 
                    { 
                        Name = "Global Chat", 
                        CountryCode = "ALL", 
                        GroupType = GroupType.General, 
                        Flag = "globe" 
                    };
                    db.Groups.Add(globalGroup);
                }

                var university = new University 
                { 
                    Name = "Test ITMO University", 
                    City = "Test Petersburg", 
                    Description = "ITMO University description", 
                    Logo = "itmo.png", 
                    Image = "itmo-bg.png" 
                };
                db.Universities.Add(university);
                await db.SaveChangesAsync(); // save to generate University Id

                var testProgram = new Core.Models.Program 
                { 
                    Code = "T-M-SE", 
                    Name = "Master in Test Software Engineering", 
                    CostRUB = 350000, 
                    Duration = "2 years", 
                    Level = "Master", 
                    Language = "English", 
                    Description = "Software engineering program", 
                    UniversityId = university.Id 
                };
                db.Programs.Add(testProgram);

                var uniGroup = new Group 
                { 
                    Name = "Test ITMO University Group", 
                    UniversityId = university.Id, 
                    GroupType = GroupType.University, 
                    Flag = "itmo" 
                };
                db.Groups.Add(uniGroup);

                var repUser = new User
                {
                    FullName = "Test ITMO Representative",
                    Email = "testrep@itmo-test.ru",
                    Password = "hashed_password",
                    Role = UserRole.Representative,
                    UniversityId = university.Id,
                    UniversityName = university.Name,
                    IsVerified = true,
                    VerificationStatus = UserVerificationStatus.Verified
                };
                db.Users.Add(repUser);

                var applicant = new User
                {
                    FullName = "Youssef Test Applicant",
                    Email = "yousseftest@test.com",
                    Password = "hashed_password",
                    Role = UserRole.Applicant,
                    Nationality = countryCode,
                    IsVerified = false,
                    VerificationStatus = UserVerificationStatus.None
                };
                db.Users.Add(applicant);

                var admin = new User
                {
                    FullName = "Test System Admin",
                    Email = "testadmin@uniconnect.ru",
                    Password = "hashed_password",
                    Role = UserRole.Admin,
                    IsVerified = true,
                    VerificationStatus = UserVerificationStatus.Verified
                };
                db.Users.Add(admin);

                await db.SaveChangesAsync();
                Console.WriteLine("Mock entities successfully prepared.");

                // 2. Test Scenario 1: Apply to University program
                Console.WriteLine("\n[2/5] Test Scenario 1: Apply to Program and check automated PrivateChat, Initial Message, and Email Outbox...");
                var mockEmailService = new MockEmailService(db);
                var universityService = new UniversityService(servicesDb, mockEmailService);
                
                var applyResult = await universityService.ApplyToUniversityAsync(university.Id, applicant.Id, new ApplyDto("T-M-SE"));
                
                if (!applyResult.Success)
                {
                    throw new Exception("ApplyToUniversityAsync failed: " + applyResult.Error);
                }

                // Assertions
                var appInDb = await db.Applications.FirstOrDefaultAsync(a => a.UserId == applicant.Id && a.UniversityId == university.Id);
                if (appInDb == null) throw new Exception("Application record not found in database.");
                Console.WriteLine("-> Application record correctly added.");

                var chatInDb = await db.PrivateChats.FirstOrDefaultAsync(c => c.ApplicantId == applicant.Id && c.StudentId == repUser.Id);
                if (chatInDb == null) throw new Exception("Private chat tunnel between applicant and representative was not created.");
                Console.WriteLine("-> Private chat tunnel correctly established.");

                var welcomeMsg = await db.PrivateMessages.FirstOrDefaultAsync(m => m.ChatId == chatInDb.Id && m.SenderId == applicant.Id);
                if (welcomeMsg == null) throw new Exception("Automated message was not posted in the chat.");
                Console.WriteLine("-> Automated chat welcome message correctly sent.");

                var emailOutbox = await db.BackgroundEmails.FirstOrDefaultAsync(e => e.ToEmail == "mina@mikhaeil.ru");
                if (emailOutbox == null) throw new Exception("Nodemailer transactional email was not queued into background_emails outbox table.");
                Console.WriteLine("-> Outbox email notification correctly queued.");

                // 3. Test Scenario 2: Verification Flow - Passport and Avatar approval
                Console.WriteLine("\n[3/5] Test Scenario 2: Verification Flow - Passport and Avatar approval...");
                var passportDoc = new Document
                {
                    UserId = applicant.Id,
                    Filename = "passport.pdf",
                    OriginalName = "passport.pdf",
                    Type = DocumentType.PassportId,
                    Status = DocumentStatus.Pending
                };
                var avatarDoc = new Document
                {
                    UserId = applicant.Id,
                    Filename = "avatar.jpg",
                    OriginalName = "avatar.jpg",
                    Type = DocumentType.ProfilePicture,
                    Status = DocumentStatus.Pending
                };
                db.Documents.AddRange(passportDoc, avatarDoc);
                await db.SaveChangesAsync();

                var adminService = new AdminService(db);
                await adminService.VerifyDocumentAsync(passportDoc.Id, admin.Id, new VerifyDocumentDto("approve", "Passport looks good.", null));
                await adminService.VerifyDocumentAsync(avatarDoc.Id, admin.Id, new VerifyDocumentDto("approve", "Profile picture approved.", null));

                // Reload applicant state
                var updatedApplicant = await db.Users.FindAsync(applicant.Id);
                if (updatedApplicant == null) throw new Exception("Applicant user state could not be loaded.");
                
                if (updatedApplicant.VerificationStatus != UserVerificationStatus.Verified || !updatedApplicant.IsVerified)
                {
                    throw new Exception($"Applicant verification state incorrect: Verified={updatedApplicant.IsVerified}, Status={updatedApplicant.VerificationStatus}");
                }
                Console.WriteLine("-> Applicant status successfully updated to Verified.");

                var memberships = await db.Memberships.Where(m => m.UserId == applicant.Id).ToListAsync();
                if (!memberships.Any(m => m.GroupId == countryGroup.Id))
                {
                    throw new Exception("Applicant was not auto-joined to their nationality country group chat.");
                }
                if (!memberships.Any(m => m.GroupId == globalGroup.Id))
                {
                    throw new Exception("Applicant was not auto-joined to the Global Group Chat.");
                }
                Console.WriteLine("-> Applicant correctly auto-joined the Country group and Global group chats.");

                // 4. Test Scenario 3: Verification Flow - Student Card approval (University Group transition)
                Console.WriteLine("\n[4/5] Test Scenario 3: Verification Flow - Student Card approval (Swapping to student role & university group)...");
                
                updatedApplicant.PendingUniversityId = university.Id;
                var studentCardDoc = new Document
                {
                    UserId = applicant.Id,
                    Filename = "student_card.jpg",
                    OriginalName = "student_card.jpg",
                    Type = DocumentType.StudentCard,
                    Status = DocumentStatus.Pending
                };
                db.Documents.Add(studentCardDoc);
                await db.SaveChangesAsync();

                await adminService.VerifyDocumentAsync(studentCardDoc.Id, admin.Id, new VerifyDocumentDto("approve", "Student card verified.", DateTime.UtcNow.AddYears(4)));

                // Reload applicant
                var studentApplicant = await db.Users.FindAsync(applicant.Id);
                if (studentApplicant == null) throw new Exception("Student applicant user state could not be loaded.");

                if (studentApplicant.Role != UserRole.Student)
                {
                    throw new Exception($"Applicant role did not update to Student. Current role: {studentApplicant.Role}");
                }
                Console.WriteLine("-> Applicant role successfully promoted to Student.");

                if (studentApplicant.UniversityId != university.Id)
                {
                    throw new Exception("Student university association was not updated.");
                }
                Console.WriteLine("-> Student university association successfully set.");

                var studentMemberships = await db.Memberships.Where(m => m.UserId == applicant.Id).ToListAsync();
                if (!studentMemberships.Any(m => m.GroupId == uniGroup.Id))
                {
                    throw new Exception("Student was not auto-joined to their university chat group.");
                }
                Console.WriteLine("-> Student correctly auto-joined the University group chat.");

                // 5. Test Scenario 4: Admin MP point modifications
                Console.WriteLine("\n[5/5] Test Scenario 4: Admin MP point modifications (Awarding & Deducting)...");
                
                var addResult = await adminService.AddUserMPAsync(applicant.Id, new AddMPDto(100, "Active community participation"));
                if (!addResult.Success) throw new Exception("AddUserMPAsync failed: " + addResult.Error);

                var mpUser = await db.Users.FindAsync(applicant.Id);
                if (mpUser == null) throw new Exception("User state could not be loaded.");
                if (mpUser.BalanceMP != 100) throw new Exception($"Expected MP balance of 100, got {mpUser.BalanceMP}");
                Console.WriteLine("-> MP Points addition successfully credited. Balance: 100 MP.");

                var deductResult = await adminService.DeductUserMPAsync(applicant.Id, new DeductMPDto(30, "Spam in chat"));
                if (!deductResult.Success) throw new Exception("DeductUserMPAsync failed: " + deductResult.Error);

                var finalUser = await db.Users.FindAsync(applicant.Id);
                if (finalUser == null) throw new Exception("User state could not be loaded.");
                if (finalUser.BalanceMP != 70) throw new Exception($"Expected MP balance of 70, got {finalUser.BalanceMP}");
                Console.WriteLine("-> MP Points deduction successfully debited. Balance: 70 MP.");

                var mpTransactions = await db.WalletTransactions.Where(t => t.UserId == applicant.Id).ToListAsync();
                if (mpTransactions.Count != 2) throw new Exception($"Expected 2 wallet transactions, found {mpTransactions.Count}");
                Console.WriteLine("-> MP Transactions are correctly logged in wallet history.");

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("\n==================================================");
                Console.WriteLine("  ALL TESTS PASSED SUCCESSFULLY! (5/5 checks)");
                Console.WriteLine("==================================================");
                Console.ResetColor();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("\n==================================================");
                Console.WriteLine("  INTEGRATION TEST FAILED!");
                Console.WriteLine("==================================================");
                Console.WriteLine(ex.ToString());
                if (ex.InnerException != null)
                {
                    Console.WriteLine("\nInner Exception:");
                    Console.WriteLine(ex.InnerException.ToString());
                }
                Console.ResetColor();
            }
            finally
            {
                Console.WriteLine("Rolling back transaction to leave database clean...");
                await transaction.RollbackAsync();
                Console.WriteLine("Transaction rolled back successfully.");
            }
        }
    }

    public class MockEmailService : IEmailService
    {
        private readonly AdminDbContext _db;
        public MockEmailService(AdminDbContext db) => _db = db;
        public async Task SendApplicationEmailAsync(string applicantName, string applicantEmail, string applicantNationality, string universityName, string programName, string programCode, List<(string FilePath, string OriginalName)> attachments)
        {
            _db.BackgroundEmails.Add(new BackgroundEmail
            {
                ToEmail = "mina@mikhaeil.ru",
                Subject = $"New University Application - {universityName} - {applicantName}",
                Body = $"Mock application email",
                Sent = false,
                CreatedAt = DateTime.UtcNow,
                AttachmentsJson = "[]"
            });
            await _db.SaveChangesAsync();
        }
    }
}
