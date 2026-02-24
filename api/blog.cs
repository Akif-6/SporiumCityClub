using System;

namespace SporiumAPI.Models
{
    public class Blog
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty; // Boş bırakılamaz hatasını çözer
        public string Content { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
        public DateTime Date { get; set; } = DateTime.Now;

        public List<BlogYorum> Yorumlar { get; set; } = new List<BlogYorum>();
        public List<BlogBegeni> Begeniler { get; set; } = new List<BlogBegeni>();
    }
}