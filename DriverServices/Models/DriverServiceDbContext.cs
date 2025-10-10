using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace DriverServices.Models;

public partial class DriverServiceDbContext : DbContext
{
    public DriverServiceDbContext()
    {
    }

    public DriverServiceDbContext(DbContextOptions<DriverServiceDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Booking> Bookings { get; set; }

    public virtual DbSet<DangKyDichVu> DangKyDichVus { get; set; }

    public virtual DbSet<PhuongTien> PhuongTiens { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=driver_service_db;Username=admin;Password=1234");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("pg_catalog", "pg_cron");

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("booking_pkey");

            entity.ToTable("booking");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Chiphi).HasColumnName("chiphi");
            entity.Property(e => e.Giohen).HasColumnName("giohen");
            entity.Property(e => e.Idloaipin).HasColumnName("idloaipin");
            entity.Property(e => e.Iduser).HasColumnName("iduser");
            entity.Property(e => e.Ngaydat)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnName("ngaydat");
            entity.Property(e => e.Ngayhen).HasColumnName("ngayhen");
            entity.Property(e => e.Phuongthucthanhtoan)
                .HasMaxLength(50)
                .HasColumnName("phuongthucthanhtoan");
            entity.Property(e => e.Trangthai)
                .HasMaxLength(20)
                .HasColumnName("trangthai");
            entity.Property(e => e.Trangthaithanhtoan)
                .HasMaxLength(20)
                .HasColumnName("trangthaithanhtoan");
        });

        modelBuilder.Entity<DangKyDichVu>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("dang_ky_dich_vu_pkey");

            entity.ToTable("dang_ky_dich_vu");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Iddichvu).HasColumnName("iddichvu");
            entity.Property(e => e.Iduser).HasColumnName("iduser");
            entity.Property(e => e.Ngaydangky)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnName("ngaydangky");
            entity.Property(e => e.Ngayketthuc).HasColumnName("ngayketthuc");
            entity.Property(e => e.Phuongthucthanhtoan)
                .HasMaxLength(50)
                .HasColumnName("phuongthucthanhtoan");
            entity.Property(e => e.Solandoipin)
                .HasMaxLength(100)
                .HasColumnName("solandoipin");
            entity.Property(e => e.Trangthai)
                .HasMaxLength(20)
                .HasColumnName("trangthai");
            entity.Property(e => e.Trangthaithanhtoan)
                .HasMaxLength(20)
                .HasColumnName("trangthaithanhtoan");

            entity.HasOne(d => d.IduserNavigation).WithMany(p => p.DangKyDichVus)
                .HasForeignKey(d => d.Iduser)
                .HasConstraintName("dang_ky_dich_vu_iduser_fkey");
        });

        modelBuilder.Entity<PhuongTien>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("phuong_tien_pkey");

            entity.ToTable("phuong_tien");

            entity.HasIndex(e => e.Bienso, "phuong_tien_bienso_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Bienso)
                .HasMaxLength(20)
                .HasColumnName("bienso");
            entity.Property(e => e.Idloaipin).HasColumnName("idloaipin");
            entity.Property(e => e.Iduser).HasColumnName("iduser");
            entity.Property(e => e.Tenphuongtien)
                .HasMaxLength(100)
                .HasColumnName("tenphuongtien");

            entity.HasOne(d => d.IduserNavigation).WithMany(p => p.PhuongTiens)
                .HasForeignKey(d => d.Iduser)
                .HasConstraintName("phuong_tien_iduser_fkey");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "users_email_key").IsUnique();

            entity.HasIndex(e => e.SoDienThoai, "users_sodienthoai_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Age).HasColumnName("age");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.GioiTinh).HasMaxLength(10);
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.Password)
                .HasMaxLength(255)
                .HasColumnName("password");
            entity.Property(e => e.Role)
                .HasMaxLength(20)
                .HasColumnName("role");
            entity.Property(e => e.SoDienThoai).HasMaxLength(15);
        });
        modelBuilder.HasSequence("jobid_seq", "cron");
        modelBuilder.HasSequence("runid_seq", "cron");

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
