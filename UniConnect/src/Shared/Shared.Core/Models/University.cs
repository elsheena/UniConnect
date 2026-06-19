using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models
{
    [Table("universities")]
    public class University
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("city")]
        public string City { get; set; } = string.Empty;

        [Column("logo")]
        public string Logo { get; set; } = string.Empty;

        [Column("image")]
        public string Image { get; set; } = string.Empty;

        [Column("description")]
        public string Description { get; set; } = string.Empty;

        public List<Program> Programs { get; set; } = new();
    }
}
