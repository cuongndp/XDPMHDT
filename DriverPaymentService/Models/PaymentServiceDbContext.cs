using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace DriverPaymentService.Models;

public partial class PaymentServiceDbContext : DbContext
{
    public PaymentServiceDbContext()
    {
    }

    public PaymentServiceDbContext(DbContextOptions<PaymentServiceDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<BookingCache> BookingCaches { get; set; }

    public virtual DbSet<HoaDon> HoaDons { get; set; }

    public virtual DbSet<UsersCache> UsersCaches { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=payment_service_db;Username=admin;Password=1234");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BookingCache>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("booking_cache_pkey");

            entity.ToTable("booking_cache");

            entity.Property(e => e.Id)
                .ValueGeneratedNever()
                .HasColumnName("id");
            entity.Property(e => e.ChiPhi)
                .HasPrecision(10, 2)
                .HasColumnName("chi_phi");
            entity.Property(e => e.IdLoaiPin).HasColumnName("id_loai_pin");
            entity.Property(e => e.IdUser).HasColumnName("id_user");
            entity.Property(e => e.PhuongThucThanhToan)
                .HasMaxLength(20)
                .HasColumnName("phuong_thuc_thanh_toan");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(30)
                .HasColumnName("trang_thai");
            entity.Property(e => e.TrangThaiThanhToan)
                .HasMaxLength(20)
                .HasColumnName("trang_thai_thanh_toan");
        });

        modelBuilder.Entity<HoaDon>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("hoa_don_pkey");

            entity.ToTable("hoa_don");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ChiPhi)
                .HasPrecision(10, 2)
                .HasColumnName("chi_phi");
            entity.Property(e => e.IdBooking).HasColumnName("id_booking");
            entity.Property(e => e.IdLoaiPin).HasColumnName("id_loai_pin");
            entity.Property(e => e.IdTramDoiPin).HasColumnName("id_tram_doi_pin");
            entity.Property(e => e.IdUser).HasColumnName("id_user");
            entity.Property(e => e.NgayDoiPin).HasColumnName("ngay_doi_pin");
        });

        modelBuilder.Entity<UsersCache>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_cache_pkey");

            entity.ToTable("users_cache");

            entity.Property(e => e.Id)
                .ValueGeneratedNever()
                .HasColumnName("id");
            entity.Property(e => e.Email)
                .HasMaxLength(150)
                .HasColumnName("email");
            entity.Property(e => e.GioiTinh)
                .HasMaxLength(10)
                .HasColumnName("gioi_tinh");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.SoDienThoai)
                .HasMaxLength(15)
                .HasColumnName("so_dien_thoai");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
