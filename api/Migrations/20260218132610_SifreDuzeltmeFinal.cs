using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SporiumAPI.Migrations
{
    /// <inheritdoc />
    public partial class SifreDuzeltmeFinal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Uyeler",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "KayitTarihi", "Sifre" },
                values: new object[] { new DateTime(2026, 2, 18, 16, 26, 9, 710, DateTimeKind.Local).AddTicks(5543), "25422542sG!." });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Uyeler",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "KayitTarihi", "Sifre" },
                values: new object[] { new DateTime(2026, 2, 18, 16, 12, 42, 114, DateTimeKind.Local).AddTicks(1340), "$2a$11$6N.vI8qSuBvE6jCuD7GH8ueC9fI0K1L2M3N4O5P6Q7R8S9T0U1V2W" });
        }
    }
}
