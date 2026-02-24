using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SporiumAPI.Data;
using SporiumAPI.Models;

namespace SporiumAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BlogsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BlogsController(AppDbContext context)
        {
            _context = context;
        }

        // --- DTO SINIFLARI ---
        public class YorumIstegi { public int BlogId { get; set; } public int UyeId { get; set; } public string Icerik { get; set; } }
        public class BegeniIstegi { public int BlogId { get; set; } public int UyeId { get; set; } }

        // ------------------------------------------

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Blog>>> GetBlogs()
        {
            return await _context.Blogs.ToListAsync();
        }

        [HttpGet("{id}")]
        public IActionResult GetBlog(int id)
        {
            var blog = _context.Blogs
                .Include(x => x.Yorumlar).ThenInclude(y => y.Uye)
                .Include(x => x.Begeniler)
                .FirstOrDefault(x => x.Id == id);

            if (blog == null) return NotFound();

            var sonuc = new
            {
                blog.Id,
                blog.Title,
                blog.Content,
                blog.Image,
                blog.Date,
                BegeniSayisi = blog.Begeniler.Count,
                Yorumlar = blog.Yorumlar.Select(y => new
                {
                    y.Id,
                    y.Icerik,
                    y.Tarih,
                    UyeAdi = y.Uye != null ? y.Uye.AdSoyad : "Misafir Kullanıcı"
                }).ToList()
            };

            return Ok(sonuc);
        }

        [HttpPost("yorum-yap")]
        public IActionResult YorumYap([FromBody] YorumIstegi istek)
        {
            if (string.IsNullOrEmpty(istek.Icerik)) return BadRequest("Yorum boş olamaz.");

            var yeniYorum = new BlogYorum
            {
                BlogId = istek.BlogId,
                UyeId = istek.UyeId,
                Icerik = istek.Icerik,
                Tarih = DateTime.Now
            };

            _context.BlogYorumlar.Add(yeniYorum);
            _context.SaveChanges();
            return Ok(new { mesaj = "Yorum eklendi." });
        }

        [HttpPost("begen")]
        public IActionResult Begen([FromBody] BegeniIstegi istek)
        {
            var mevcutBegeni = _context.BlogBegeniler.FirstOrDefault(x => x.BlogId == istek.BlogId && x.UyeId == istek.UyeId);

            if (mevcutBegeni != null)
            {
                try
                {
                    _context.BlogBegeniler.Remove(mevcutBegeni);
                    _context.SaveChanges();
                }
                catch (DbUpdateConcurrencyException) { return Ok(new { durum = "begeni-alindi" }); }
                return Ok(new { durum = "begeni-alindi" });
            }
            else
            {
                try
                {
                    _context.BlogBegeniler.Add(new BlogBegeni { BlogId = istek.BlogId, UyeId = istek.UyeId });
                    _context.SaveChanges();
                }
                catch (Exception) { return BadRequest("Bir hata oluştu."); }
                return Ok(new { durum = "begenildi" });
            }
        }

        [HttpDelete("yorum-sil/{id}")]
        public IActionResult YorumSil(int id)
        {
            var yorum = _context.BlogYorumlar.Find(id);
            if (yorum == null) return NotFound();
            _context.BlogYorumlar.Remove(yorum);
            _context.SaveChanges();
            return Ok(new { mesaj = "Silindi" });
        }

        [HttpGet("gundem")]
        public IActionResult GetGundem()
        {
            try
            {
                var populler = _context.Blogs
                    .Include(x => x.Begeniler)
                    .OrderByDescending(x => x.Begeniler.Count)
                    .Take(4)
                    .Select(x => new
                    {
                        x.Id,
                        x.Title,
                        x.Image,
                        BegeniSayisi = x.Begeniler.Count
                    })
                    .ToList();
                return Ok(populler);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Sunucu hatası: " + ex.Message);
            }
        }

        // --- MASAÜSTÜNDEN RESİMLİ BLOG EKLEME (POST) ---
        [HttpPost]
        public async Task<IActionResult> PostBlog([FromForm] string title, [FromForm] string content, IFormFile? imageFile)
        {
            string filePath = "";

            if (imageFile != null && imageFile.Length > 0)
            {
                var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);

                var fileName = Guid.NewGuid().ToString() + Path.GetExtension(imageFile.FileName);
                var fullPath = Path.Combine(folderPath, fileName);

                using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                    await imageFile.CopyToAsync(stream);
                }
                filePath = "/uploads/" + fileName;
            }

            var blog = new Blog
            {
                Title = title,
                Content = content,
                Image = filePath,
                Date = DateTime.Now
            };

            _context.Blogs.Add(blog);
            await _context.SaveChangesAsync();

            return Ok(blog);
        }

        // --- GÜNCELLEME (RESİMLİ - PUT) ---
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBlog(int id, [FromForm] string title, [FromForm] string content, IFormFile? imageFile)
        {
            var blog = await _context.Blogs.FindAsync(id);
            if (blog == null) return NotFound("Blog bulunamadı.");

            blog.Title = title;
            blog.Content = content;

            if (imageFile != null && imageFile.Length > 0)
            {
                var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);

                var fileName = Guid.NewGuid().ToString() + Path.GetExtension(imageFile.FileName);
                var fullPath = Path.Combine(folderPath, fileName);

                using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                    await imageFile.CopyToAsync(stream);
                }
                blog.Image = "/uploads/" + fileName;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Güncelleme başarılı" });
        }

        // --- SİLME (DELETE) --- 
        // (BUNU EKLEMEDİĞİN İÇİN SİLME BUTONU ÇALIŞMAZ, ŞİMDİ EKLENDİ)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBlog(int id)
        {
            var blog = await _context.Blogs.FindAsync(id);
            if (blog == null) return NotFound();

            _context.Blogs.Remove(blog);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}