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

    public virtual DbSet<YeuCauHoTro> YeuCauHoTros { get; set; }

    public virtual DbSet<TinNhanHoTro> TinNhanHoTros { get; set; }

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

        modelBuilder.Entity<YeuCauHoTro>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("yeu_cau_ho_tro_pkey");

            entity.ToTable("yeu_cau_ho_tro");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Iduser).HasColumnName("iduser");
            entity.Property(e => e.Idtramdoipin).HasColumnName("idtramdoipin");
            entity.Property(e => e.Idpin).HasColumnName("idpin");
            entity.Property(e => e.Idbooking).HasColumnName("idbooking");
            entity.Property(e => e.MoTa).HasColumnName("mo_ta");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(20)
                .HasDefaultValueSql("'Chờ xử lý'::character varying")
                .HasColumnName("trang_thai");
            entity.Property(e => e.DoUuTien)
                .HasMaxLength(20)
                .HasDefaultValueSql("'Trung bình'::character varying")
                .HasColumnName("do_uu_tien");
            entity.Property(e => e.PhanHoi).HasColumnName("phan_hoi");
            entity.Property(e => e.NgayTao)
                .HasColumnType("timestamp")
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnName("ngay_tao");
            entity.Property(e => e.NgayXuLy)
                .HasColumnType("timestamp")
                .HasColumnName("ngay_xu_ly");
        });

        modelBuilder.Entity<TinNhanHoTro>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tin_nhan_ho_tro_pkey");

            entity.ToTable("tin_nhan_ho_tro");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IdYeuCauHoTro).HasColumnName("id_yeu_cau_ho_tro");
            entity.Property(e => e.IdUser).HasColumnName("id_user");
            entity.Property(e => e.NoiDung).HasColumnName("noi_dung");
            entity.Property(e => e.NgayGui)
                .HasColumnType("timestamp")
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnName("ngay_gui");

            // Foreign key relationship
            entity.HasOne(e => e.YeuCauHoTro)
                .WithMany()
                .HasForeignKey(e => e.IdYeuCauHoTro)
                .OnDelete(DeleteBehavior.Cascade);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
