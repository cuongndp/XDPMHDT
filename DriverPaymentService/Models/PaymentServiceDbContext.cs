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

    public virtual DbSet<DichVu> DichVus { get; set; }

    public virtual DbSet<HoaDon> HoaDons { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=postgres;Port=5432;Database=payment_service_db;Username=admin;Password=1234");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DichVu>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("dich_vu_pkey");

            entity.ToTable("dich_vu");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Mota).HasColumnName("mota");
            entity.Property(e => e.Phi)
                .HasPrecision(10, 2)
                .HasColumnName("phi");
            entity.Property(e => e.Solandoipin)
                .HasMaxLength(50)
                .HasColumnName("solandoipin");
            entity.Property(e => e.Tendichvu)
                .HasMaxLength(100)
                .HasColumnName("tendichvu");
            entity.Property(e => e.Thoihan).HasColumnName("thoihan");
        });

        modelBuilder.Entity<HoaDon>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("hoa_don_pkey");

            entity.ToTable("hoa_don");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Chiphi).HasColumnName("chiphi");
            entity.Property(e => e.Idbooking).HasColumnName("idbooking");
            entity.Property(e => e.Idloaipin).HasColumnName("idloaipin");
            entity.Property(e => e.Idtramdoipin).HasColumnName("idtramdoipin");
            entity.Property(e => e.Iduser).HasColumnName("iduser");
            entity.Property(e => e.Ngaydoipin)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnName("ngaydoipin");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
