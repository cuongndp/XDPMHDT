using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace BatteryAdminService.Models;

public partial class BatteryAdminDbContext : DbContext
{
    public BatteryAdminDbContext(DbContextOptions<BatteryAdminDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Pin> Pins { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Pin>(entity =>
        {
            entity.HasKey(e => e.Idpin).HasName("pin_pkey");

            entity.ToTable("pin");

            entity.Property(e => e.Idpin).HasColumnName("idpin");
            entity.Property(e => e.Idloaipin).HasColumnName("idloaipin");
            entity.Property(e => e.Idtram).HasColumnName("idtram");
            entity.Property(e => e.Soc)
                .HasDefaultValueSql("100")
                .HasColumnName("soc");
            entity.Property(e => e.Soh)
                .HasDefaultValueSql("100")
                .HasColumnName("soh");
            entity.Property(e => e.Tinhtrang)
                .HasMaxLength(50)
                .HasDefaultValueSql("'Khả dụng'::character varying")
                .HasColumnName("tinhtrang");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
