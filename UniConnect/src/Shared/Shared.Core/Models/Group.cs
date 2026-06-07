using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Core.Enums.Group;

namespace Core.Models
{
    [Table("groups")]
    public class Group
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("flag")]
        public string Flag { get; set; } = "globe";

        [Column("description")]
        public string? Description { get; set; }

        [Column("country_code")]
        public string? CountryCode { get; set; }

        [Column("group_type")]
        public GroupType GroupType { get; set; } = GroupType.General;

        [Column("university_id")]
        public Guid? UniversityId { get; set; }
    }
}
