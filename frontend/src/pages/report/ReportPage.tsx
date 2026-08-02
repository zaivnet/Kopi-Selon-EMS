import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import * as XLSX from 'xlsx';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { useAuth } from '@/context/AuthContext';

export default function ReportPage() {
  const { hasPermission } = useAuth();
  const [filterType, setFilterType] = useState('month'); 
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [outletId, setOutletId] = useState('');
  
  const reportRef = useRef(null);

  const { data: employees } = useQuery({
    queryKey: ['employeesReport'],
    queryFn: async () => (await api.get('/employees')).data
  });

  const { data: shifts } = useQuery({
    queryKey: ['shiftsReport'],
    queryFn: async () => (await api.get('/shifts')).data
  });

  const { data: outlets } = useQuery({
    queryKey: ['outletsReport'],
    queryFn: async () => (await api.get('/outlets')).data
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reportData', filterType, month, year, startDate, endDate, employeeId, shiftId, outletId],
    queryFn: async () => {
      const params: any = {};
      if (filterType === 'month') {
        params.month = month;
        params.year = year;
      } else {
        if (startDate && endDate) {
          params.startDate = startDate;
          params.endDate = endDate;
        }
      }
      if (employeeId) params.employeeId = employeeId;
      if (shiftId) params.shiftId = shiftId;
      if (outletId) params.outletId = outletId;
      
      const res = await api.get('/reports', { params });
      return res.data;
    }
  });

  const handleExportExcel = () => {
    if (!reportData) return;
    const worksheet = XLSX.utils.json_to_sheet(reportData.map((r: any) => ({
      'Nama Karyawan': r.name,
      'Posisi': r.position,
      'Shift': r.shift,
      'Kehadiran (Hari)': r.totalPresent,
      'Tidak Hadir (Hari)': r.absentDays,
      'Keterlambatan (Menit)': r.lateMins,
      'Kurang Jam (Jam)': r.underworkHours,
      'Jam Lembur (Jam)': r.overtimeHours,
      'Gaji Pokok': r.baseSalary,
      'Total Potongan': r.totalDeduction,
      'Total Gaji (Net)': r.totalSalary
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    XLSX.writeFile(workbook, "Laporan_Absensi_Gaji.xlsx");
  };

  
  const handleExportPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text("Laporan Karyawan KOPI SELON", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    const periodText = filterType === 'month' ? `Periode: Bulan ${month} Tahun ${year}` : `Periode: ${startDate || '-'} s/d ${endDate || '-'}`;
    doc.text(periodText, 14, 30);
    
    const tableColumn = ["Karyawan", "Shift", "Kehadiran", "Tidak Hadir", "Terlambat", "Kurang Jam", "Jam Lembur", "Potongan", "Total Gaji"];
    const tableRows = reportData.map((row: any) => [
      row.name,
      row.shift,
      row.totalPresent + " Hari",
      row.absentDays + " Hari",
      row.lateMins + " Menit",
      row.underworkHours + " Jam",
      (row.overtimeHours || "0") + " Jam",
      formatCurrency(row.totalDeduction),
      formatCurrency(row.totalSalary)
    ]);
    
    // @ts-ignore
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] } // emerald-500
    });
    
    doc.save('Laporan_Absensi_Gaji.pdf');
  };


  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Terpadu</h1>
          <p className="text-muted-foreground">Laporan absensi, jam kerja, dan perhitungan gaji.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('reports.print') && (
            <button onClick={handlePrint} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              <Printer className="mr-2 h-4 w-4" /> Print
            </button>
          )}
          {hasPermission('reports.export') && (
            <button onClick={handleExportPDF} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-red-600 border-red-200 hover:bg-red-50">
              <Download className="mr-2 h-4 w-4" /> PDF
            </button>
          )}
          {hasPermission('reports.export') && (
            <button onClick={handleExportExcel} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </button>
          )}
        </div>
      </div>

      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipe Filter</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                <option value="month">Bulanan</option>
                <option value="date">Rentang Tanggal</option>
              </select>
            </div>
            
            {filterType === 'month' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bulan</label>
                  <select value={month} onChange={e => setMonth(Number(e.target.value))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={i+1}>{i+1}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tahun</label>
                  <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Mulai</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Akhir</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
                </div>
              </>
            )}

            <div className="space-y-2 lg:col-span-1">
              <label className="text-sm font-medium">Karyawan</label>
              <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                <option value="">Semua Karyawan</option>
                {employees?.filter((e: any) => !['Owner', 'Administrator'].includes(e.user?.role?.name)).map((e: any) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2 lg:col-span-1">
              <label className="text-sm font-medium">Shift</label>
              <select value={shiftId} onChange={e => setShiftId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                <option value="">Semua Shift</option>
                {shifts?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 lg:col-span-1">
              <label className="text-sm font-medium">Cabang (Outlet)</label>
              <select value={outletId} onChange={e => setOutletId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                <option value="">Semua Cabang</option>
                {outlets?.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 sm:p-6" id="report-content" ref={reportRef}>
          <div className="hidden print:block mb-6 text-center">
            <h2 className="text-2xl font-bold">Laporan Karyawan KOPI SELON</h2>
            <p className="text-muted-foreground">
              {filterType === 'month' ? `Periode: Bulan ${month} Tahun ${year}` : `Periode: ${startDate || '-'} s/d ${endDate || '-'}`}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading data...</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Karyawan</th>
                    <th className="px-4 py-3 font-semibold">Absensi</th>
                    <th className="px-4 py-3 font-semibold text-center">Keterlambatan</th>
                    <th className="px-4 py-3 font-semibold text-center">Kurang Jam</th>
                    <th className="px-4 py-3 font-semibold text-center">Jam Lembur</th>
                    <th className="px-4 py-3 font-semibold text-center">Tidak Hadir</th>
                    <th className="px-4 py-3 font-semibold text-right">Potongan</th>
                    <th className="px-4 py-3 font-semibold text-right">Total Gaji</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground border-b">Data tidak ditemukan.</td>
                    </tr>
                  ) : (
                    reportData?.map((row: any) => (
                      <tr key={row.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{row.name}</div>
                          <div className="text-xs text-muted-foreground">{row.shift}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            {row.totalPresent} Hari
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.lateMins > 0 ? (
                            <span className="text-amber-600 font-medium">{row.lateMins} Menit</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {Number(row.underworkHours) > 0 ? (
                            <span className="text-amber-600 font-medium">{row.underworkHours} Jam</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {Number(row.overtimeHours) > 0 ? (
                            <span className="text-emerald-600 font-semibold">{row.overtimeHours} Jam</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.absentDays > 0 ? (
                            <span className="text-destructive font-medium">{row.absentDays} Hari</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-destructive font-medium">{formatCurrency(row.totalDeduction)}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {formatCurrency(row.totalSalary)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
