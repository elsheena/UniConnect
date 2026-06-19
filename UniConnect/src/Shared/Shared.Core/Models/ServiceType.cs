using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("service_types")]
    public class ServiceType
    {
        [Key]
        [Column("id")]
        public string Id { get; set; } = string.Empty;

        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("icon")]
        public string Icon { get; set; } = string.Empty;

        [Column("price")]
        public decimal Price { get; set; }

        [Column("has_city")]
        public bool HasCity { get; set; }

        [Column("has_university")]
        public bool HasUniversity { get; set; }

        [Column("description")]
        public string Description { get; set; } = string.Empty;

        [Column("first_free")]
        public bool FirstFree { get; set; }
    }
}
