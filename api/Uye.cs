using System;
using System.ComponentModel.DataAnnotations;

namespace SporiumAPI.Models
{
    public class Uye
    {
        [Key]
        public int Id { get; set; }
        public string? AdSoyad { get; set; }
        public string? Email { get; set; }
        public string? Sifre { get; set; }
        public string? Paket { get; set; }
        public decimal Fiyat { get; set; }
        public string? Rol { get; set; }
        public string? Durum { get; set; } // Aktif/Pasif

        // EKSİK OLAN ALANLAR EKLENDİ
        public DateTime? KayitTarihi { get; set; }
        public DateTime? BaslangicTarihi { get; set; }
        public DateTime? BitisTarihi { get; set; }
        public string? AntrenmanProgrami { get; set; }
        public string? DiyetProgrami { get; set; }
        public string? Mesajlar { get; set; }
    }

    // Giriş Modeli (Controller'da kullanılıyor)
    public class UyeLoginModel
    {
        public string Email { get; set; }
        public string Sifre { get; set; }
    }
}