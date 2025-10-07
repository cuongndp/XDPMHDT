using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace StationService.Models;

public partial class StationServiceContext : DbContext
{
    public StationServiceContext()
    {
    }

    public StationServiceContext(DbContextOptions<StationServiceContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Kho> Khos { get; set; }

    public virtual DbSet<LoaiPin> LoaiPins { get; set; }

    public virtual DbSet<TramDoiPin> TramDoiPins { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=StationService;Username=admin;Password=1234");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Kho>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("kho_pkey");

            entity.ToTable("kho");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Idloaipin).HasColumnName("idloaipin");
            entity.Property(e => e.Soluong)
                .HasDefaultValue(0)
                .HasColumnName("soluong");

            entity.HasOne(d => d.IdloaipinNavigation).WithMany(p => p.Khos)
                .HasForeignKey(d => d.Idloaipin)
                .HasConstraintName("kho_idloaipin_fkey");
        });

        modelBuilder.Entity<LoaiPin>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("loai_pin_pkey");

            entity.ToTable("loai_pin");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Congsuat).HasColumnName("congsuat");
            entity.Property(e => e.Dienap).HasColumnName("dienap");
            entity.Property(e => e.Giadoipin).HasColumnName("giadoipin");
            entity.Property(e => e.Tenloaipin)
                .HasMaxLength(100)
                .HasColumnName("tenloaipin");
        });

        modelBuilder.Entity<TramDoiPin>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tram_doi_pin_pkey");

            entity.ToTable("tram_doi_pin");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Diachi).HasColumnName("diachi");
            entity.Property(e => e.Giodongcua).HasColumnName("giodongcua");
            entity.Property(e => e.Giomocua).HasColumnName("giomocua");
            entity.Property(e => e.Idkho).HasColumnName("idkho");
            entity.Property(e => e.Sodienthoaitd)
                .HasMaxLength(15)
                .HasColumnName("sodienthoaitd");
            entity.Property(e => e.Tenloaipin)
                .HasMaxLength(100)
                .HasColumnName("tenloaipin");
            entity.Property(e => e.Tentram)
                .HasMaxLength(100)
                .HasColumnName("tentram");
            entity.Property(e => e.Trangthai)
                .HasMaxLength(20)
                .HasColumnName("trangthai");

            entity.HasOne(d => d.IdkhoNavigation).WithMany(p => p.TramDoiPins)
                .HasForeignKey(d => d.Idkho)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("tram_doi_pin_idkho_fkey");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
