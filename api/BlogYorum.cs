using SporiumAPI.Models;

namespace SporiumAPI
{
    public class BlogYorum
    {
        public int Id { get; set; }
        public string Icerik { get; set; }
        public DateTime Tarih { get; set; } = DateTime.Now;

        // İlişkiler: Hangi üye yazdı?
        public int UyeId { get; set; }
        public Uye Uye { get; set; }

        // Hangi bloga yazıldı?
        public int BlogId { get; set; }
        // Blog nesnesini buraya koymaya gerek yok, döngüye girmesin
    }
}