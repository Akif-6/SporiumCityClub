using Microsoft.EntityFrameworkCore;
using SporiumAPI.Models;

namespace SporiumAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Uye> Uyeler { get; set; }
        public DbSet<Gider> Giderler { get; set; }
        public DbSet<Blog> Blogs { get; set; }
        public DbSet<BlogYorum> BlogYorumlar { get; set; }
        public DbSet<BlogBegeni> BlogBegeniler { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

     
            modelBuilder.Entity<Uye>().HasData(new Uye
            {
                Id = 1,
                AdSoyad = "Semih Gök",
                Email = "semihgok5025@gmail.com",
                Sifre = "25422542sG!.",
                Rol = "Admin",
                Durum = "Aktif", 
                // phpMyAdmin'deki isim KayitTarihi, koddaki de öyle olmalı
                KayitTarihi = DateTime.Now
            });
        }

    }

}
