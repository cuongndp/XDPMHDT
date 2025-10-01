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

    public virtual DbSet<LoaiPin> LoaiPins { get; set; }

    public virtual DbSet<PhuongTien> PhuongTiens { get; set; }

    public virtual DbSet<TramDoiPinCache> TramDoiPinCaches { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=driver_service_db;Username=admin;Password=1234");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("booking_pkey");

            entity.ToTable("booking");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ChiPhi)
                .HasPrecision(10, 2)
                .HasColumnName("chi_phi");
            entity.Property(e => e.GioHen).HasColumnName("gio_hen");
            entity.Property(e => e.IdLoaiPin).HasColumnName("id_loai_pin");
            entity.Property(e => e.IdUser).HasColumnName("id_user");
            entity.Property(e => e.NgayDat).HasColumnName("ngay_dat");
            entity.Property(e => e.NgayHen).HasColumnName("ngay_hen");
            entity.Property(e => e.PhuongThucThanhToan)
                .HasMaxLength(20)
                .HasColumnName("phuong_thuc_thanh_toan");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(30)
                .HasColumnName("trang_thai");
            entity.Property(e => e.TrangThaiThanhToan)
                .HasMaxLength(20)
                .HasColumnName("trang_thai_thanh_toan");

            entity.HasOne(d => d.IdLoaiPinNavigation).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.IdLoaiPin)
                .HasConstraintName("booking_id_loai_pin_fkey");

            entity.HasOne(d => d.IdUserNavigation).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.IdUser)
                .HasConstraintName("booking_id_user_fkey");
        });

        modelBuilder.Entity<LoaiPin>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("loai_pin_pkey");

            entity.ToTable("loai_pin");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CongSuat).HasColumnName("cong_suat");
            entity.Property(e => e.DienAp).HasColumnName("dien_ap");
            entity.Property(e => e.GiaDoiPin)
                .HasPrecision(10, 2)
                .HasColumnName("gia_doi_pin");
            entity.Property(e => e.TenLoaiPin)
                .HasMaxLength(100)
                .HasColumnName("ten_loai_pin");
        });

        modelBuilder.Entity<PhuongTien>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("phuong_tien_pkey");

            entity.ToTable("phuong_tien");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BienSo)
                .HasMaxLength(20)
                .HasColumnName("bien_so");
            entity.Property(e => e.IdLoaiPin).HasColumnName("id_loai_pin");
            entity.Property(e => e.IdUser).HasColumnName("id_user");
            entity.Property(e => e.TenPhuongTien)
                .HasMaxLength(100)
                .HasColumnName("ten_phuong_tien");

            entity.HasOne(d => d.IdLoaiPinNavigation).WithMany(p => p.PhuongTiens)
                .HasForeignKey(d => d.IdLoaiPin)
                .HasConstraintName("phuong_tien_id_loai_pin_fkey");

            entity.HasOne(d => d.IdUserNavigation).WithMany(p => p.PhuongTiens)
                .HasForeignKey(d => d.IdUser)
                .HasConstraintName("phuong_tien_id_user_fkey");
        });

        modelBuilder.Entity<TramDoiPinCache>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tram_doi_pin_cache_pkey");

            entity.ToTable("tram_doi_pin_cache");

            entity.Property(e => e.Id)
                .ValueGeneratedNever()
                .HasColumnName("id");
            entity.Property(e => e.DiaChi).HasColumnName("dia_chi");
            entity.Property(e => e.GioDongCua)
                .HasMaxLength(10)
                .HasColumnName("gio_dong_cua");
            entity.Property(e => e.GioMoCua)
                .HasMaxLength(10)
                .HasColumnName("gio_mo_cua");
            entity.Property(e => e.IdKho).HasColumnName("id_kho");
            entity.Property(e => e.SoDienThoaiTd)
                .HasMaxLength(15)
                .HasColumnName("so_dien_thoai_td");
            entity.Property(e => e.TenLoaiPin)
                .HasMaxLength(500)
                .HasColumnName("ten_loai_pin");
            entity.Property(e => e.TenTram)
                .HasMaxLength(200)
                .HasColumnName("ten_tram");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(20)
                .HasColumnName("trang_thai");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_pkey");

            entity.ToTable("users");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Age).HasColumnName("age");
            entity.Property(e => e.Email)
                .HasMaxLength(150)
                .HasColumnName("email");
            entity.Property(e => e.GioiTinh)
                .HasMaxLength(10)
                .HasColumnName("gioi_tinh");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.Password)
                .HasMaxLength(255)
                .HasColumnName("password");
            entity.Property(e => e.Role)
                .HasMaxLength(50)
                .HasColumnName("role");
            entity.Property(e => e.SoDienThoai)
                .HasMaxLength(15)
                .HasColumnName("so_dien_thoai");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
