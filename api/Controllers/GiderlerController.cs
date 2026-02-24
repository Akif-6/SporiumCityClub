using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SporiumAPI.Data;   // DÜZELTİLDİ
using SporiumAPI.Models; // DÜZELTİLDİ

namespace SporiumAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GiderlerController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GiderlerController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Gider>>> GetGiderler()
        {
            return await _context.Giderler.OrderByDescending(g => g.Tarih).ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Gider>> PostGider(Gider gider)
        {
            if (gider.Tarih == null) gider.Tarih = DateTime.Now;

            _context.Giderler.Add(gider);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetGiderler", new { id = gider.Id }, gider);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGider(int id)
        {
            var gider = await _context.Giderler.FindAsync(id);
            if (gider == null) return NotFound();

            _context.Giderler.Remove(gider);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}