using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
// 👇 JWT İÇİN GEREKLİ KÜTÜPHANELER EKLENDİ
using Microsoft.IdentityModel.Tokens;
using SporiumAPI.Data;
using SporiumAPI.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SporiumAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UyelerController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration; // 👇 Ayarları okumak için eklendi

        // Constructor (Kurucu Metot) Güncellendi
        public UyelerController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // TÜM ÜYELERİ GETİR
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Uye>>> GetUyeler()
        {
            return await _context.Uyeler.ToListAsync();
        }

        // TEK ÜYE GETİR
        [HttpGet("{id}")]
        public async Task<ActionResult<Uye>> GetUye(int id)
        {
            var uye = await _context.Uyeler.FindAsync(id);
            if (uye == null) return NotFound();
            return uye;
        }

        // GİRİŞ YAP (JWT TOKEN OLUŞTURAN YENİ VERSİYON)
        [HttpPost("giris")]
        [AllowAnonymous]
        public IActionResult GirisYap([FromBody] LoginModel model)
        {
            // 1. Kullanıcıyı bul
            var uye = _context.Uyeler.FirstOrDefault(u => u.Email == model.Email);

            // 2. Şifre kontrolü
            if (uye == null || !BCrypt.Net.BCrypt.Verify(model.Sifre, uye.Sifre))
            {
                return Unauthorized(new { message = "E-posta veya şifre hatalı!" });
            }

            // --- 3. JWT TOKEN OLUŞTURMA (BİLET BASMA) ---
            var tokenHandler = new JwtSecurityTokenHandler();
            // appsettings.json'dan gizli anahtarı alıyoruz
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new Claim[]
                {
                    new Claim(ClaimTypes.NameIdentifier, uye.Id.ToString()),
                    new Claim(ClaimTypes.Email, uye.Email),
                    new Claim(ClaimTypes.Role, uye.Rol) // Rolü biletin içine gömüyoruz
                }),
                Expires = DateTime.UtcNow.AddDays(7), // Token 7 gün geçerli
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"]
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            // 4. Şifreyi gizle ve Frontend'e hem Token'ı hem Kullanıcıyı gönder
            uye.Sifre = "";
            return Ok(new { token = tokenString, user = uye });
        }

        // YENİ ÜYE EKLE (POST)
        [HttpPost]
        [AllowAnonymous]
        public async Task<ActionResult<Uye>> PostUye(Uye uye)
        {
            // 1. AYNI E-POSTA VAR MI KONTROLÜ
            if (await _context.Uyeler.AnyAsync(u => u.Email == uye.Email))
            {
                return BadRequest("Bu e-posta adresiyle zaten bir kayıt mevcut.");
            }

            // 2. ŞİFREYİ HASH'LE
            uye.Sifre = BCrypt.Net.BCrypt.HashPassword(uye.Sifre);

            // 3. TARİH KONTROLLERİ
            if (uye.KayitTarihi == null || uye.KayitTarihi < DateTime.Parse("1900-01-01"))
                uye.KayitTarihi = DateTime.Now;

            if (uye.BaslangicTarihi == null || uye.BaslangicTarihi < DateTime.Parse("1900-01-01"))
                uye.BaslangicTarihi = DateTime.Now;

            if (uye.BitisTarihi == null || uye.BitisTarihi < DateTime.Parse("1900-01-01"))
                uye.BitisTarihi = DateTime.Now.AddMonths(1);

            // 4. Null alanları doldur
            if (string.IsNullOrEmpty(uye.AntrenmanProgrami)) uye.AntrenmanProgrami = " ";
            if (string.IsNullOrEmpty(uye.DiyetProgrami)) uye.DiyetProgrami = " ";
            if (string.IsNullOrEmpty(uye.Durum)) uye.Durum = "Aktif";

            if (string.IsNullOrEmpty(uye.Mesajlar)) uye.Mesajlar = "[]";

            _context.Uyeler.Add(uye);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return BadRequest("Veritabanı Hatası: " + ex.Message);
            }

            return CreatedAtAction("GetUye", new { id = uye.Id }, uye);
        }


        // ÜYE GÜNCELLE (PUT)
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUye(int id, Uye uye)
        {
            if (id != uye.Id) return BadRequest();

            // 1. Veritabanındaki mevcut kaydı çekiyoruz (dbUser burada tanımlanıyor)
            var dbUser = await _context.Uyeler.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);

            // Eğer veritabanında böyle bir kullanıcı yoksa hata dön
            if (dbUser == null) return NotFound();

            // 2. ŞİFRE MANTIĞI (Double Hashing Koruması)
            // Eğer şifre boşsa veya zaten bir Hash kodu ($2a$ ile başlayan) gönderildiyse dokunma
            if (string.IsNullOrEmpty(uye.Sifre) || uye.Sifre.StartsWith("$2a$"))
            {
                // Veritabanındaki eski (çalışan) şifreyi aynen koru
                uye.Sifre = dbUser.Sifre;
            }
            else
            {
                // Sadece admin yeni bir düz şifre yazdıysa (örn: 123456) onu şifrele
                uye.Sifre = BCrypt.Net.BCrypt.HashPassword(uye.Sifre);
            }

            // Tarihlerin bozulmaması için minimum kontroller
            if (uye.BaslangicTarihi < DateTime.Parse("1900-01-01")) uye.BaslangicTarihi = dbUser.BaslangicTarihi;
            if (uye.BitisTarihi < DateTime.Parse("1900-01-01")) uye.BitisTarihi = dbUser.BitisTarihi;

            // 3. Güncelleme İşlemini Başlat
            _context.Entry(uye).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Uyeler.Any(e => e.Id == id)) return NotFound();
                else throw;
            }

            return NoContent();
        }
        // ÜYE SİL (DELETE)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUye(int id)
        {
            var uye = await _context.Uyeler.FindAsync(id);
            if (uye == null) return NotFound();

            _context.Uyeler.Remove(uye);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class LoginModel
    {
        public string Email { get; set; }
        public string Sifre { get; set; }
    }
}