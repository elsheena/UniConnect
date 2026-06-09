using System.Collections.Generic;

namespace Shared.DataAccess.Data
{
    public class UniversityProgram
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int CostRUB { get; set; }
        public string Duration { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<string> Subjects { get; set; } = new();
        public List<string> Careers { get; set; } = new();
    }

    public class UniversityInfo
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Logo { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<UniversityProgram> Programs { get; set; } = new();
    }

    public class CountryInfo
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
    }

    public class ServiceTypeInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public bool HasCity { get; set; }
        public bool HasUniversity { get; set; }
        public string Description { get; set; } = string.Empty;
        public bool FirstFree { get; set; }
    }

    public static class SeedData
    {
        public static readonly List<CountryInfo> Countries = new()
        {
            new() { Code = "EG", Name = "Egypt", Icon = "flag" },
            new() { Code = "DZ", Name = "Algeria", Icon = "flag" },
            new() { Code = "MA", Name = "Morocco", Icon = "flag" },
            new() { Code = "IN", Name = "India", Icon = "flag" },
            new() { Code = "CN", Name = "China", Icon = "flag" },
            new() { Code = "TR", Name = "Turkey", Icon = "flag" },
            new() { Code = "IQ", Name = "Iraq", Icon = "flag" },
            new() { Code = "SY", Name = "Syria", Icon = "flag" },
            new() { Code = "NG", Name = "Nigeria", Icon = "flag" },
            new() { Code = "VN", Name = "Vietnam", Icon = "flag" },
            new() { Code = "TN", Name = "Tunisia", Icon = "flag" },
            new() { Code = "JO", Name = "Jordan", Icon = "flag" },
            new() { Code = "PK", Name = "Pakistan", Icon = "flag" },
            new() { Code = "BD", Name = "Bangladesh", Icon = "flag" },
            new() { Code = "YE", Name = "Yemen", Icon = "flag" }
        };

        public static readonly List<ServiceTypeInfo> ServiceTypes = new()
        {
            new() { Id = "airport_pickup", Name = "Airport Pickup", Icon = "airplane", Price = 50, HasCity = true, Description = "A verified student meets you at the airport and helps with transport and settlement." },
            new() { Id = "student_consultation", Name = "Student Consultation", Icon = "chat", Price = 10, HasUniversity = true, Description = "Voice/video call with a real student at your target university. First session free!", FirstFree = true },
            new() { Id = "representative_call", Name = "University Representative Call", Icon = "building", Price = 0, HasUniversity = true, Description = "Direct call with an official university representative." },
            new() { Id = "scholarship_guidance", Name = "Scholarship Guidance", Icon = "clipboard", Price = 15, Description = "Navigate scholarship opportunities and application processes." },
            new() { Id = "migration_help", Name = "Migration Assistance", Icon = "document", Price = 20, HasCity = true, Description = "Help with visa, registration, and document requirements." },
            new() { Id = "bank_sim", Name = "Bank Account & SIM Card", Icon = "creditcard", Price = 0, HasCity = true, Description = "Guidance for opening bank accounts and getting SIM cards via our partners." }
        };

    }
}
