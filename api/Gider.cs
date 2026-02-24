using System;

namespace SporiumAPI.Models
{
    public class Gider
    {
        public int Id { get; set; }
        public string? Aciklama { get; set; }
        public decimal? Tutar { get; set; }
        public DateTime? Tarih { get; set; }
    }
}