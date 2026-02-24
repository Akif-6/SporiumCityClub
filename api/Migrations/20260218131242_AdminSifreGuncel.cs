using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SporiumAPI.Migrations
{
    /// <inheritdoc />
    public partial class AdminSifreGuncel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Uyeler",
                columns: new[] { "Id", "AdSoyad", "AntrenmanProgrami", "BaslangicTarihi", "BitisTarihi", "DiyetProgrami", "Durum", "Email", "Fiyat", "KayitTarihi", "Mesajlar", "Paket", "Rol", "Sifre" },
                values: new object[] { 1, "Semih Gök", null, null, null, null, "Aktif", "semihgok5025@gmail.com", 0m, new DateTime(2026, 2, 18, 16, 12, 42, 114, DateTimeKind.Local).AddTicks(1340), null, null, "Admin", "$2a$11$6N.vI8qSuBvE6jCuD7GH8ueC9fI0K1L2M3N4O5P6Q7R8S9T0U1V2W" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Uyeler",
                keyColumn: "Id",
                keyValue: 1);
        }
    }
}
