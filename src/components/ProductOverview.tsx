import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart3, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Database, 
  Filter, 
  RefreshCw, 
  Search, 
  Trash2, 
  Download, 
  TrendingUp, 
  X,
  User,
  ShoppingBag,
  ArrowRight,
  Info,
  CalendarDays,
  AlertTriangle,
  Clock
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { RecordRow } from "../types";
import { getRecordsDirect, deleteRecordDirect, clearAllRecordsDirect, getCorrespondencesDirect } from "../lib/firestoreService";

const PRODUCT_TYPES = [
  { dbName: "aardbeien groot", displayName: "Aardbeien groot" },
  { dbName: "aardbeien klein", displayName: "Aardbeien klein" },
  { dbName: "san marzano", displayName: "San Marzano" },
  { dbName: "snoep rood", displayName: "Snoep rood" },
  { dbName: "snoep mix", displayName: "Snoep mix" },
  { dbName: "confituur", displayName: "Confituur" }
];

// Helper to parse Dutch date of format DD-MM-YYYY with dynamic optimization cache
const dutchDateCache = new Map<string, Date>();
const parseDutchDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const cached = dutchDateCache.get(dateStr);
  if (cached) return cached;
  
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    dutchDateCache.set(dateStr, d);
    return d;
  }
  const d = new Date();
  dutchDateCache.set(dateStr, d);
  return d;
};

// Helper to format Date into DD-MM-YYYY Dutch format
const formatToDutchDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

interface ProductOverviewProps {
  serverUser: {
    email: string;
    name: string;
    isAdmin: boolean;
  } | null;
}

export default function ProductOverview({ serverUser }: ProductOverviewProps) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [correspondences, setCorrespondences] = useState<Record<string, number>>({
    "kist_aardbeien_to_bakjes": 10.0,
    "doos_kerstomaten_to_bakjes": 10.0,
    "bakje_aardbeien_to_kg": 0.5,
    "bakje_kerstomaten_to_kg": 0.5
  });

  // View state: "dashboard" (graph) or "database" (table)
  const [viewMode, setViewMode] = useState<"dashboard" | "database">("dashboard");

  // Custom Delete confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<{ id: string; details: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Custom Clear Database states
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0); // 0 = closed, 1 = first warning, 2 = written confirmation
  const [clearWord, setClearWord] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const getWeekNumber = (d: Date): number => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                          - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const parseDateParts = (dateStr: string) => {
    if (!dateStr) return { year: 2026, month: 6, week: 23 };
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month - 1, day);
      return { year, month, week: getWeekNumber(d) };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, week: getWeekNumber(now) };
  };

  const handleExport = (type: "volledig" | "recent") => {
    const lastExportTs = Number(localStorage.getItem("last_export_timestamp")) || 0;
    
    // Sort by timestamp descending
    const sortedRecords = [...records].sort((a, b) => {
      const tsA = a.timestamp || 0;
      const tsB = b.timestamp || 0;
      return tsB - tsA;
    });

    // Filter if recent
    const filteredRecords = type === "recent"
      ? sortedRecords.filter(r => (r.timestamp || 0) > lastExportTs)
      : sortedRecords;

    if (filteredRecords.length === 0) {
      if (type === "recent") {
        alert("Geen nieuwe waarnemingen sinds de laatste export.");
      } else {
        alert("Geen gegevens beschikbaar om te exporteren.");
      }
      return;
    }

    let csvContent = "sep=;\r\n";
    csvContent += "vuller;Date;Year;Month;Week;Hour;Producttype;Product;Eenheden;Gewicht(kg);Prijs (/kg);Omzet;Aardbeiras;temperature;Opmerking\r\n";

    filteredRecords.forEach((r) => {
      const vuller = r.vuller || r.inputterName || "";
      const dateField = r.Date || r.inputDate || "";
      const hourField = r.Hour || r.inputTime || "";
      const productTypeField = r.Producttype || r.productType || "";
      
      const parsedDate = parseDateParts(dateField);
      const yr = r.Year !== undefined && r.Year !== null ? r.Year : parsedDate.year;
      const mt = r.Month !== undefined && r.Month !== null ? r.Month : parsedDate.month;
      const wk = r.Week !== undefined && r.Week !== null ? r.Week : parsedDate.week;
      
      let productCategory = r.Product || "";
      if (!productCategory) {
        const typeLower = productTypeField.toLowerCase();
        if (typeLower.includes("aardbeien")) {
          productCategory = "Aardbei";
        } else if (typeLower.includes("san marzano") || typeLower.includes("snoep") || typeLower.includes("tomaat")) {
          productCategory = "Tomaat";
        } else {
          productCategory = "Confituur";
        }
      }
      
      let eenheden = r.Eenheden !== undefined && r.Eenheden !== null ? r.Eenheden : null;
      let gewicht = r["Gewicht(kg)"] !== undefined && r["Gewicht(kg)"] !== null ? r["Gewicht(kg)"] : null;
      let prijsPerKg = r["Prijs (/kg)"] !== undefined && r["Prijs (/kg)"] !== null ? r["Prijs (/kg)"] : null;
      let omzet = r.Omzet !== undefined && r.Omzet !== null ? r.Omzet : null;
      let ras = r.Aardbeiras || "";
      let temperature = r.temperature !== undefined && r.temperature !== null ? r.temperature : (r.predictedTemperature !== undefined && r.predictedTemperature !== null ? r.predictedTemperature : 15);

      if (eenheden === null) {
        const isCrate = productTypeField.toLowerCase().includes("(plateau)") || productTypeField.toLowerCase().includes("plateau") || productTypeField.toLowerCase().includes("(kisten)") || productTypeField.toLowerCase().includes("kisten");
        const multiplier = isCrate ? 10.0 : 1.0;
        eenheden = (Number(r.productQuantity) || 0) * multiplier;
      }

      if (gewicht === null) {
        const bakjeToKg = productTypeField.toLowerCase().includes("tomaat") || productTypeField.toLowerCase().includes("marzano") || productTypeField.toLowerCase().includes("snoep")
          ? 0.5
          : 0.5;
        gewicht = Math.round(eenheden * bakjeToKg * 100) / 100;
      }

      if (prijsPerKg === null) {
        let unitPrice = r.unitPrice !== undefined ? r.unitPrice : r.totalPrice / (r.productQuantity || 1);
        if (isNaN(unitPrice) || !isFinite(unitPrice)) unitPrice = 4.5;
        const bakjeToKg = productTypeField.toLowerCase().includes("tomaat") || productTypeField.toLowerCase().includes("marzano") || productTypeField.toLowerCase().includes("snoep")
          ? 0.5
          : 0.5;
        prijsPerKg = Math.round((unitPrice / bakjeToKg) * 100) / 100;
      }

      if (omzet === null) {
        omzet = r.totalPrice !== undefined ? r.totalPrice : Math.round(gewicht * prijsPerKg * 100) / 100;
      }
      
      const escVuller = `"${vuller.replace(/"/g, '""')}"`;
      const escDate = `"${dateField.replace(/"/g, '""')}"`;
      const escHour = `"${hourField.replace(/"/g, '""')}"`;
      const escProductType = `"${productTypeField.replace(/"/g, '""')}"`;
      const escProduct = `"${productCategory.replace(/"/g, '""')}"`;
      const escRas = `"${ras.replace(/"/g, '""')}"`;

      const formattedEenheden = `${eenheden}`;
      const formattedGewicht = `${Number(gewicht).toFixed(2)}`;
      const formattedPrijsPerKg = `${Number(prijsPerKg).toFixed(2)}`;
      const formattedOmzet = `${Number(omzet).toFixed(2)}`;
      const formattedTemp = `${Number(temperature).toFixed(1)}`;
      const commentVal = r.comment || r.Opmerking || "";
      const escComment = `"${commentVal.replace(/"/g, '""')}"`;

      csvContent += `${escVuller};${escDate};${yr};${mt};${wk};${escHour};${escProductType};${escProduct};${formattedEenheden};${formattedGewicht};${formattedPrijsPerKg};${formattedOmzet};${escRas};${formattedTemp};${escComment}\r\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const filename = type === "recent"
      ? "verkoopautomaat_recent_export.csv"
      : "verkoopautomaat_volledige_export.csv";
      
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save timestamp of last export only if it was a recent export
    if (type === "recent") {
      localStorage.setItem("last_export_timestamp", Date.now().toString());
    }
  };

  const handleClearAllDatabase = async () => {
    if (clearStep === 2 && clearWord !== "WISSEN") {
      setClearError("Type a.u.b. exact het woord 'WISSEN' om door te gaan.");
      return;
    }
    setIsClearing(true);
    setClearError(null);
    try {
      let directSuccess = false;
      try {
        await clearAllRecordsDirect();
        directSuccess = true;
      } catch (directErr) {
        console.warn("Direct Firestore clear failed, falling back to server API:", directErr);
      }

      if (directSuccess) {
        setClearStep(0);
        setClearWord("");
        await fetchRecords(); // Refresh data
        setIsClearing(false);
        return;
      }

      const res = await fetch("/api/admin/clear-all", {
        method: "POST"
      });
      if (res.ok) {
        setClearStep(0);
        setClearWord("");
        await fetchRecords(); // Refresh data
      } else {
        const err = await res.json();
        setClearError(err.error || "Fout bij leegmaken van de database.");
      }
    } catch (err) {
      setClearError("Fout bij verbinding met de server.");
    } finally {
      setIsClearing(false);
    }
  };

  // Filter states for complete database table view
  const [tableFilterFiller, setTableFilterFiller] = useState("");
  const [tableFilterProduct, setTableFilterProduct] = useState("");
  const [tableFilterMonth, setTableFilterMonth] = useState("");
  const [tableFilterBeginDate, setTableFilterBeginDate] = useState("");
  const [tableFilterEndDate, setTableFilterEndDate] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const itemsPerPage = 10;

  // Chart configuration states
  const [chartProduct, setChartProduct] = useState("aardbeien groot");
  const [chartPeriod, setChartPeriod] = useState("30_DAYS"); // "30_DAYS", "3_MONTHS", "CURRENT_YEAR", "CUSTOM"
  const [chartBeginDate, setChartBeginDate] = useState("");
  const [chartEndDate, setChartEndDate] = useState("");

  // Load records from API
  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      try {
        const directData = await getRecordsDirect();
        if (directData && directData.length > 0) {
          setRecords(directData);
          setIsLoading(false);
          return;
        }
      } catch (directErr) {
        console.warn("Direct Firestore fetchRecords failed, falling back to server API:", directErr);
      }

      const res = await fetch("/api/records");
      if (!res.ok) {
        throw new Error("Mislukt om databasegegevens op te halen.");
      }
      const data = await res.json();
      setRecords(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Fout bij verbinding met de server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    
    // Fetch volume correspondences
    const fetchCorrespondencesData = async () => {
      try {
        const directCorr = await getCorrespondencesDirect();
        if (directCorr) {
          setCorrespondences(directCorr);
          return;
        }
      } catch (directErr) {
        console.warn("Direct correspondences fetch failed, falling back to server API:", directErr);
      }

      fetch("/api/correspondences")
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setCorrespondences(data);
        })
        .catch(e => console.error("Fout bij ophalen van correspondenties:", e));
    };

    fetchCorrespondencesData();
  }, []);

  // Trigger delete confirmation modal
  const promptDeleteRecord = (id: string, details: string) => {
    setRecordToDelete({ id, details });
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteRecord = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      try {
        await deleteRecordDirect(recordToDelete.id);
        setRecords(prev => prev.filter(r => r.id !== recordToDelete.id));
        setDeleteConfirmOpen(false);
        setRecordToDelete(null);
        setIsDeleting(false);
        return;
      } catch (directErr) {
        console.warn("Direct Firestore delete failed, falling back to server API:", directErr);
      }

      const res = await fetch(`/api/records/${recordToDelete.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== recordToDelete.id));
        setDeleteConfirmOpen(false);
        setRecordToDelete(null);
      } else {
        const errData = await res.json();
        setDeleteError(errData.error || "Fout bij het verwijderen van record.");
      }
    } catch (e) {
      setDeleteError("Fout bij verbinding met de server.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle record deletion
  const handleDeleteRecord = (id: string, detailString: string) => {
    promptDeleteRecord(id, detailString);
  };

  // Get unique lists of properties for filtering
  const uniqueProducts = useMemo(() => {
    const list = new Set<string>();
    records.forEach(r => {
      if (r.productType) list.add(r.productType);
    });
    return Array.from(list).sort();
  }, [records]);

  const uniqueFillers = useMemo(() => {
    const list = new Set<string>();
    records.forEach(r => {
      if (r.inputterName) list.add(r.inputterName.trim());
    });
    return Array.from(list).sort();
  }, [records]);

  const uniqueMonths = useMemo(() => {
    const list = new Set<string>();
    records.forEach(r => {
      const date = parseDutchDate(r.inputDate);
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const yyyy = date.getFullYear();
      list.add(`${mm}/${yyyy}`);
    });
    return Array.from(list).sort((a, b) => {
      // Sort months chronologically descending (newest first)
      const [mA, yA] = a.split("/").map(Number);
      const [mB, yB] = b.split("/").map(Number);
      if (yB !== yA) return yB - yA;
      return mB - mA;
    });
  }, [records]);

  // Reset filters
  const handleResetFilters = () => {
    setTableFilterFiller("");
    setTableFilterProduct("");
    setTableFilterMonth("");
    setTableFilterBeginDate("");
    setTableFilterEndDate("");
    setTablePage(1);
  };

  // Filtered records for completeness database
  const filteredDatabaseRecords = useMemo(() => {
    return records.filter(r => {
      // Filler / ID filter (filters by email or by name)
      if (tableFilterFiller) {
        const fillLower = tableFilterFiller.trim().toLowerCase();
        const nameLower = (r.inputterName || "").trim().toLowerCase();
        const emailLower = (r.userEmail || "").trim().toLowerCase();
        if (nameLower !== fillLower && emailLower !== fillLower) {
          return false;
        }
      }
      // Product type filter - simplified selection matching kisten/bakjes/bekers/dozen
      if (tableFilterProduct) {
        const prodLower = tableFilterProduct.trim().toLowerCase();
        const rTypeLower = (r.productType || "").trim().toLowerCase();
        
        const isMatch = rTypeLower.startsWith(prodLower) || 
                        (prodLower === "aardbeien groot" && rTypeLower.startsWith("aardbeiden groot")) ||
                        (prodLower === "aardbeien klein" && rTypeLower.startsWith("aardbeiden klein"));
        
        if (!isMatch) return false;
      }
      // Month (MM/YYYY) filter
      if (tableFilterMonth) {
        const date = parseDutchDate(r.inputDate);
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = date.getFullYear();
        if (`${mm}/${yyyy}` !== tableFilterMonth) {
          return false;
        }
      }
      // Start & End date filter
      const rDate = parseDutchDate(r.inputDate);
      if (tableFilterBeginDate) {
        const start = new Date(tableFilterBeginDate);
        start.setHours(0,0,0,0);
        if (rDate < start) return false;
      }
      if (tableFilterEndDate) {
        const end = new Date(tableFilterEndDate);
        end.setHours(23,59,59,999);
        if (rDate > end) return false;
      }

      return true;
    });
  }, [records, tableFilterFiller, tableFilterProduct, tableFilterMonth, tableFilterBeginDate, tableFilterEndDate]);

  // PAGINATION
  const paginatedRecords = useMemo(() => {
    const startIdx = (tablePage - 1) * itemsPerPage;
    return filteredDatabaseRecords.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredDatabaseRecords, tablePage]);

  const totalPages = Math.ceil(filteredDatabaseRecords.length / itemsPerPage) || 1;

  // CHART DATA PREPARATION
  const chartData = useMemo(() => {
    // Determine boundary dates based on period selection
    const now = new Date();
    let startDate = new Date();
    let isAppliedCustomRange = false;

    if (chartPeriod === "30_DAYS") {
      startDate.setDate(now.getDate() - 30);
    } else if (chartPeriod === "3_MONTHS") {
      startDate.setMonth(now.getMonth() - 3);
    } else if (chartPeriod === "CURRENT_YEAR") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (chartPeriod === "CUSTOM" && chartBeginDate) {
      startDate = new Date(chartBeginDate);
      isAppliedCustomRange = true;
    } else {
      startDate.setDate(now.getDate() - 30); // fallback
    }
    startDate.setHours(0,0,0,0);

    let endDate = new Date();
    if (chartPeriod === "CUSTOM" && chartEndDate) {
      endDate = new Date(chartEndDate);
    }
    endDate.setHours(23,59,59,999);

    // Filter relevant records in chronological range
    const rangeRecords = records.filter(r => {
      const rDate = parseDutchDate(r.inputDate);
      return rDate >= startDate && rDate <= endDate;
    });

    // Group items by date string
    const dailyMap = new Map<string, { displayDate: string; timestamp: number; total: number; uniqueSubmissions: Set<string> }>();

    // Sort records oldest first for chart timeline plotting
    const sortedTimeline = [...rangeRecords].sort((a, b) => {
      return parseDutchDate(a.inputDate).getTime() - parseDutchDate(b.inputDate).getTime();
    });

    sortedTimeline.forEach(r => {
      const dateObj = parseDutchDate(r.inputDate);
      const dateKey = r.inputDate; // DD-MM-YYYY is reliable key
      
      // Keep a simplified label (e.g., DD MMM)
      const shortLabel = dateObj.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
      
      const existing = dailyMap.get(dateKey) || { 
        displayDate: shortLabel, 
        timestamp: dateObj.getTime(), 
        total: 0,
        uniqueSubmissions: new Set<string>()
      };
      
      // We identify a unique user submission (invoerbeurt) by its timestamp OR a combination of date, time and inputterName
      const submissionId = r.timestamp ? String(r.timestamp) : `${r.inputDate}-${r.inputTime}-${r.inputterName}`;
      existing.uniqueSubmissions.add(submissionId);

      // Quantify in kilograms if geselecteerd product matches
      const typeLower = (r.productType || "").toLowerCase();
      
      const isMatch = typeLower.startsWith(chartProduct.toLowerCase()) || 
                      (chartProduct === "aardbeien groot" && typeLower.startsWith("aardbeiden groot")) ||
                      (chartProduct === "aardbeien klein" && typeLower.startsWith("aardbeiden klein"));

      if (isMatch) {
        const isBulk = typeLower.includes("(plateau)") || typeLower.includes("plateau") || typeLower.includes("(kisten)") || typeLower.includes("kisten") || typeLower.includes("(dozen)") || typeLower.includes("dozen");
        
        let weightFactor = 0.5;
        const kistToBakjes = correspondences["kist_aardbeien_to_bakjes"] !== undefined ? correspondences["kist_aardbeien_to_bakjes"] : 10.0;
        const bakjeToKg = correspondences["bakje_aardbeien_to_kg"] !== undefined ? correspondences["bakje_aardbeien_to_kg"] : 0.5;
        
        weightFactor = isBulk ? (kistToBakjes * bakjeToKg) : bakjeToKg;

        existing.total += (Number(r.productQuantity) || 0) * weightFactor;
      }

      dailyMap.set(dateKey, existing);
    });

    // Convert map to array and apply chartProduct specific totals
    const result = Array.from(dailyMap.values()).map(item => {
      let finalTotal = item.total;
      if (chartProduct === "invoerbeurten") {
        finalTotal = item.uniqueSubmissions.size;
      } else {
        // Round to 1 decimal place for Kg representation
        finalTotal = Math.round(finalTotal * 10) / 10;
      }
      return {
        displayDate: item.displayDate,
        timestamp: item.timestamp,
        total: finalTotal
      };
    });

    // Sort chronologically
    return result.sort((a, b) => a.timestamp - b.timestamp);
  }, [records, chartProduct, chartPeriod, chartBeginDate, chartEndDate]);

  // Overall statistics for the selected Chart Product & Period
  const chartStats = useMemo(() => {
    let totalFilledSum = 0;
    chartData.forEach(d => {
      totalFilledSum += d.total;
    });

    // Calculate total unique submissions (invoerbeurten) for this period
    const now = new Date();
    let startDate = new Date();
    if (chartPeriod === "30_DAYS") startDate.setDate(now.getDate() - 30);
    else if (chartPeriod === "3_MONTHS") startDate.setMonth(now.getMonth() - 3);
    else if (chartPeriod === "CURRENT_YEAR") startDate = new Date(now.getFullYear(), 0, 1);
    else if (chartPeriod === "CUSTOM" && chartBeginDate) startDate = new Date(chartBeginDate);
    startDate.setHours(0,0,0,0);

    let endDate = new Date();
    if (chartPeriod === "CUSTOM" && chartEndDate) endDate = new Date(chartEndDate);
    endDate.setHours(23,59,59,999);

    const periodRecords = records.filter(r => {
      const rDate = parseDutchDate(r.inputDate);
      return rDate >= startDate && rDate <= endDate;
    });

    const uniqueSubmissionsInPeriod = new Set<string>();
    periodRecords.forEach(r => {
      const subId = r.timestamp ? String(r.timestamp) : `${r.inputDate}-${r.inputTime}-${r.inputterName}`;
      uniqueSubmissionsInPeriod.add(subId);
    });

    const entriesCount = uniqueSubmissionsInPeriod.size;
    const averagePerDay = chartData.length > 0 ? Math.round((totalFilledSum / chartData.length) * 10) / 10 : 0;

    return {
      totalFilled: Math.round(totalFilledSum * 10) / 10,
      entriesCount, // Total unique inputs
      averagePerDay
    };
  }, [chartData, records, chartPeriod, chartBeginDate, chartEndDate]);

  // Handle Refresh UI
  const handleRefresh = () => {
    fetchRecords();
  };

  return (
    <div className="w-full space-y-4" id="product-overview-master">
      {/* Tab Header inside page */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#BE123C]" />
          <h3 className="font-display font-black text-rose-800 text-sm tracking-widest uppercase">
            {viewMode === "dashboard" ? "Verkochte Producten Evolutie" : "Databaseregister Vullingen"}
          </h3>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-50 text-slate-500 cursor-pointer"
            title="Database vernieuwen"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode(viewMode === "dashboard" ? "database" : "dashboard");
              setTablePage(1);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-5xs cursor-pointer select-none bg-rose-50 border-rose-150 text-[#BE123C] hover:bg-rose-100/70"
          >
            {viewMode === "dashboard" ? (
              <>
                <Database className="w-3.5 h-3.5" />
                <span>Volledige Database</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Evolutiegrafiek</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#BE123C] animate-spin stroke-[2.5]" />
          <p className="text-xs font-bold font-mono uppercase tracking-widest text-[#BE123C]">Gegevens ophalen...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-center space-y-3 max-w-md mx-auto">
          <Info className="w-8 h-8 text-[#BE123C] mx-auto" />
          <p className="text-xs font-bold text-rose-800 leading-normal">{error}</p>
          <button
            type="button"
            onClick={fetchRecords}
            className="px-4 py-1.5 rounded-lg bg-[#BE123C] text-white text-xs font-bold transition-all cursor-pointer"
          >
            Opnieuw Proberen
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-10 text-center space-y-3 text-slate-400">
          <Database className="w-10 h-10 stroke-[1.5] mx-auto" />
          <p className="text-xs font-bold text-slate-700">Nog geen invoergegevens gevonden</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            Zodra er vullingen worden geregistreerd via de BezenTracker, verschijnt hier de interactieve grafiek en spreadsheet.
          </p>
        </div>
      ) : (
        <>
          {/* ================= VIEW 1: EVOLUTION GRAPH & DASHBOARD ================= */}
          {viewMode === "dashboard" && (
            <div className="space-y-4" id="graph-panel-view">
              
              {/* Dashboard Selectors */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 sm:p-4 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Selector 1: Product Selector */}
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 font-mono">Evolutie van</label>
                    <select
                      value={chartProduct}
                      onChange={(e) => setChartProduct(e.target.value)}
                      className="w-full bg-white border border-slate-200/80 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-[#BE123C] text-slate-700 shadow-5xs"
                    >
                      {PRODUCT_TYPES.map(p => (
                        <option key={p.dbName} value={p.dbName}>{p.displayName} (kg)</option>
                      ))}
                      <option value="invoerbeurten">Aantal daily 'invoerbeurten'</option>
                    </select>
                  </div>

                  {/* Selector 2: Period Selector */}
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 font-mono">Tijdsperiode</label>
                    <select
                      value={chartPeriod}
                      onChange={(e) => setChartPeriod(e.target.value)}
                      className="w-full bg-white border border-slate-200/80 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-[#BE123C] text-slate-700 shadow-5xs"
                    >
                      <option value="30_DAYS">Laatste 30 dagen</option>
                      <option value="3_MONTHS">Laatste 3 maanden</option>
                      <option value="CURRENT_YEAR">Huidig jaar ({new Date().getFullYear()})</option>
                      <option value="CUSTOM">Specifieke begin & einddatum</option>
                    </select>
                  </div>

                </div>

                {/* Specific Begin & End date input side-by-side if Custom period is chosen */}
                {chartPeriod === "CUSTOM" && (
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-200/70 pt-3 flex-wrap">
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 font-mono">Begindatum</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={chartBeginDate}
                          onChange={(e) => setChartBeginDate(e.target.value)}
                          className="w-full bg-white border border-slate-200/80 rounded-xl py-1.5 px-3 text-xs font-medium focus:outline-none focus:border-[#BE123C] text-slate-700 inline-flex items-center shadow-5xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 font-mono">Einddatum</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={chartEndDate}
                          onChange={(e) => setChartEndDate(e.target.value)}
                          className="w-full bg-white border border-slate-200/80 rounded-xl py-1.5 px-3 text-xs font-medium focus:outline-none focus:border-[#BE123C] text-slate-700 inline-flex items-center shadow-5xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* KPI stat counters block */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50/60 p-2.5 sm:p-3 rounded-xl border border-slate-100 text-center font-mono">
                  <span className="block text-[8px] sm:text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                    {chartProduct === "invoerbeurten" ? "Totale Invoer" : "Totaal Volume"}
                  </span>
                  <span className="text-base sm:text-lg font-black text-[#BE123C] leading-none mt-0.5 block">
                    {chartStats.totalFilled} {chartProduct === "invoerbeurten" ? "keer" : "kg"}
                  </span>
                </div>
                <div className="bg-slate-50/60 p-2.5 sm:p-3 rounded-xl border border-slate-100 text-center font-mono">
                  <span className="block text-[8px] sm:text-[9px] font-bold uppercase text-slate-400 tracking-wider">Invoerbeurten</span>
                  <span className="text-base sm:text-lg font-black text-slate-700 leading-none mt-0.5 block">
                    {chartStats.entriesCount} keer
                  </span>
                </div>
                <div className="bg-slate-50/60 p-2.5 sm:p-3 rounded-xl border border-slate-100 text-center font-mono">
                  <span className="block text-[8px] sm:text-[9px] font-bold uppercase text-slate-400 tracking-wider">Gemiddelde / dag</span>
                  <span className="text-base sm:text-lg font-black text-rose-600 leading-none mt-0.5 block">
                    {chartStats.averagePerDay} {chartProduct === "invoerbeurten" ? "keer/dag" : "kg/dag"}
                  </span>
                </div>
              </div>

              {/* Recharts Container AreaChart */}
              <div className="bg-white border border-slate-150 rounded-2xl p-2.5 sm:p-4">
                <div className="h-60 sm:h-72 w-full p-1" id="recharts-wrapper">
                  {chartData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                      <CalendarDays className="w-8 h-8 opacity-40" />
                      <p className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500">Geen trendgegevens</p>
                      <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                        Er zijn geen vullingen geregistreerd binnen de geselecteerde filtercriteria. Selecteer een andere tijdsperiode of ander product.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -22, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#BE123C" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#BE123C" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis 
                          dataKey="displayDate" 
                          stroke="#94A3B8" 
                          fontSize={9} 
                          tickLine={false}
                          dy={6}
                          style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: "600" }}
                        />
                        <YAxis 
                          stroke="#94A3B8" 
                          fontSize={9} 
                          tickLine={false}
                          dx={-4}
                          style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: "600" }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "#1E293B", 
                            borderColor: "#334155", 
                            borderRadius: "12px", 
                            color: "white",
                            fontFamily: "Inter, sans-serif",
                            fontSize: "11px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                          }}
                          labelStyle={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", fontWeight: "700", color: "#FDA4AF", marginBottom: "3px" }}
                          itemStyle={{ color: "#FFFFFF", fontWeight: "800", padding: "0" }}
                          formatter={(value) => [
                            chartProduct === "invoerbeurten" ? `${value} beurten` : `${value} kg`, 
                            chartProduct === "invoerbeurten" ? "Invoerbeurten" : "Totaal Volume"
                          ]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#BE123C" 
                          strokeWidth={2.5}
                          fillOpacity={1} 
                          fill="url(#colorQuantity)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Navigation button link directly to the full database list */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("database");
                    setTablePage(1);
                  }}
                  className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/65 text-slate-700 font-extrabold text-xs transition-all flex items-center justify-center gap-2 outline-none cursor-pointer"
                  id="direct-to-database-btn"
                >
                  <Database className="w-4 h-4 text-slate-500" />
                  <span>Blader Complete Database ({records.length} records)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 stroke-[2.5]" />
                </button>
              </div>

            </div>
          )}

          {/* ================= VIEW 2: COMPLETE DATABASE SPREADSHEET TABLE ================= */}
          {viewMode === "database" && (
            <div className="space-y-4" id="database-panel-view">
              
              {/* Database filtering tools */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 sm:p-4 space-y-3 shadow-5xs" id="table-filters-container">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 font-mono">Database Filters</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[10px] text-rose-700 hover:underline font-bold flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" />
                    Wis filters
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Filter: Vuller */}
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-0.5 font-mono">Wie (Vuller)</label>
                    <select
                      value={tableFilterFiller}
                      onChange={(e) => { setTableFilterFiller(e.target.value); setTablePage(1); }}
                      className="w-full bg-white border border-slate-200/80 rounded-lg py-1.5 px-2 text-xs font-semibold focus:outline-none focus:border-[#BE123C] text-slate-700"
                    >
                      <option value="">Alle vullers</option>
                      {uniqueFillers.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter: Product */}
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-0.5 font-mono">Producttype</label>
                    <select
                      value={tableFilterProduct}
                      onChange={(e) => { setTableFilterProduct(e.target.value); setTablePage(1); }}
                      className="w-full bg-white border border-slate-200/80 rounded-lg py-1.5 px-2 text-xs font-semibold focus:outline-none focus:border-[#BE123C] text-slate-700"
                    >
                      <option value="">Alle producten</option>
                      {PRODUCT_TYPES.map(p => (
                        <option key={p.dbName} value={p.dbName}>{p.displayName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter: Month (MM/YYYY) */}
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-0.5 font-mono">Invoermaand</label>
                    <select
                      value={tableFilterMonth}
                      onChange={(e) => { setTableFilterMonth(e.target.value); setTablePage(1); }}
                      className="w-full bg-white border border-slate-200/80 rounded-lg py-1.5 px-2 text-xs font-semibold focus:outline-none focus:border-[#BE123C] text-slate-700"
                    >
                      <option value="">Alle maanden</option>
                      {uniqueMonths.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Period Selector block side-by-side */}
                <div className="grid grid-cols-2 gap-2.5 border-t border-slate-150 pt-2.5">
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-0.5 font-mono">Begindatum</label>
                    <input
                      type="date"
                      value={tableFilterBeginDate}
                      onChange={(e) => { setTableFilterBeginDate(e.target.value); setTablePage(1); }}
                      className="w-full bg-white border border-slate-200/80 rounded-lg py-1.5 px-2.5 text-xs font-medium focus:outline-none focus:border-[#BE123C] text-slate-700 shadow-5xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-0.5 font-mono">Einddatum</label>
                    <input
                      type="date"
                      value={tableFilterEndDate}
                      onChange={(e) => { setTableFilterEndDate(e.target.value); setTablePage(1); }}
                      className="w-full bg-white border border-slate-200/80 rounded-lg py-1.5 px-2.5 text-xs font-medium focus:outline-none focus:border-[#BE123C] text-slate-700 shadow-5xs"
                    />
                  </div>
                </div>
              </div>

              {/* Table Result Counters and Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 text-slate-500">
                <div className="flex items-center gap-4 text-[10px] font-mono font-semibold">
                  <span>Gevonden: {filteredDatabaseRecords.length} records</span>
                  {filteredDatabaseRecords.length > 0 && (
                    <span>Pagina {tablePage} van {totalPages}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  {/* Export Data buttons */}
                  <div className="flex items-center gap-1.5 bg-slate-100/60 border border-slate-200/50 rounded-xl px-2.5 py-1 shadow-5xs">
                    <span className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider px-1 shrink-0">Export data:</span>
                    <button
                      onClick={() => handleExport("volledig")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100/75 text-xs font-bold font-mono transition-colors cursor-pointer shrink-0"
                      title="Exporteer alle waarnemingen naar een CSV-bestand"
                    >
                      <Download className="w-3 h-3 shrink-0" />
                      <span>Volledig</span>
                    </button>
                    <button
                      onClick={() => handleExport("recent")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-white hover:bg-slate-900 text-xs font-bold font-mono transition-colors cursor-pointer shrink-0"
                      title="Exporteer enkel de nieuwste waarnemingen sinds de laatste download"
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>Recent</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Content representation */}
              {filteredDatabaseRecords.length === 0 ? (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-10 text-center space-y-2 text-slate-400 max-w-sm mx-auto">
                  <Search className="w-8 h-8 opacity-45 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Geen overeenkomende records</p>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Pas uw actieve filters aan om de records te bladeren. Click op "Wis filters" om te resetten.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* DESKTOP VIEW: HTML Traditional Table (hidden on phone, shown on sm+) */}
                  <div className="hidden sm:block overflow-hidden rounded-xl border border-slate-200 shadow-6xs bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Datum/Tijd</th>
                          <th className="py-2.5 px-2">Vuller</th>
                          <th className="py-2.5 px-2">Producttype</th>
                          <th className="py-2.5 px-2 text-right">Aantal</th>
                          <th className="py-2.5 px-2 text-right cursor-help text-[#BE123C] font-semibold" title="Verwachte maximale dagtemperatuur in Duffel, België">Max Temp</th>
                          <th className="py-2.5 px-2 text-right">Prijs/u</th>
                          <th className="py-2.5 px-2 text-right">Totaal</th>
                          <th className="py-2.5 px-3 text-center">Actie</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedRecords.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-3 font-mono font-medium text-slate-500 text-[10px]">
                              {r.inputDate} <span className="opacity-60">{r.inputTime}</span>
                            </td>
                            <td className="py-2 px-2 text-slate-800 font-semibold truncate max-w-[120px]" title={r.inputterName}>
                              {r.inputterName}
                            </td>
                            <td className="py-2 px-2 text-slate-700 capitalize font-medium">
                              <div className="flex flex-col">
                                <span>{r.productType}</span>
                                {(r.comment || r.Opmerking) && (
                                  <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100/60 rounded px-1.5 py-0.5 mt-0.5 w-max font-mono italic max-w-[180px] truncate" title={r.comment || r.Opmerking}>
                                    "{r.comment || r.Opmerking}"
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-black text-rose-700 font-mono text-sm">
                              {r.productQuantity}
                            </td>
                            <td className="py-2 px-2 text-right font-semibold font-mono text-[10px] text-amber-700">
                              {r.predictedTemperature !== undefined && r.predictedTemperature !== null ? `${r.predictedTemperature}°C` : "-"}
                            </td>
                            <td className="py-2 px-2 text-right font-medium font-mono text-[10px] text-slate-500">
                              {r.unitPrice !== undefined && r.unitPrice !== null ? `€${Number(r.unitPrice).toFixed(2)}` : "-"}
                            </td>
                            <td className="py-2 px-2 text-right font-bold font-mono text-[10px] text-emerald-700">
                              {r.totalPrice !== undefined && r.totalPrice !== null ? `€${Number(r.totalPrice).toFixed(2)}` : "-"}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRecord(r.id, `${r.inputterName}: ${r.productQuantity}x ${r.productType} (${r.inputDate})`)}
                                className="text-slate-400 hover:text-[#BE123C] p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center"
                                title="Verwijderen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE IPHONE OPTIMIZED VIEW: Touch-perfect stack cards (shown on phone, hidden on sm+) */}
                  <div className="block sm:hidden space-y-2">
                    {paginatedRecords.map((r) => (
                      <div 
                        key={r.id}
                        className="p-3 bg-white border border-slate-150 rounded-xl space-y-2 flex items-center justify-between gap-3 shadow-6xs active:scale-[0.99] transition-transform"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md font-bold font-mono text-slate-500 leading-none">
                              {r.inputDate} {r.inputTime}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px] font-medium" title={r.userEmail}>
                              {r.userEmail}
                            </span>
                          </div>
                          
                          <div className="flex items-baseline gap-1.5 leading-none">
                            <h4 className="text-xs font-black text-slate-800 truncate capitalize">
                              {r.productType}
                            </h4>
                          </div>

                          {(r.comment || r.Opmerking) && (
                            <div className="text-[10px] text-amber-600 bg-amber-50/70 border border-amber-100/60 rounded px-1.5 py-0.5 w-max font-mono italic max-w-[200px] truncate" title={r.comment || r.Opmerking}>
                              "{r.comment || r.Opmerking}"
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 flex-wrap py-0.5 font-mono text-[9px]">
                            {r.predictedTemperature !== undefined && r.predictedTemperature !== null && (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200/50 px-1.5 py-0.5 rounded font-bold cursor-help" title="Verwachte maximale dagtemperatuur in Duffel, België">
                                ☀️ Max {r.predictedTemperature}°C
                              </span>
                            )}
                            {r.totalPrice !== undefined && r.totalPrice !== null && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-1 px-0.5 rounded font-bold">
                                €{Number(r.totalPrice).toFixed(2)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-600">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-semibold truncate">{r.inputterName}</span>
                          </div>
                        </div>

                        {/* Quantity and Delete layout on right */}
                        <div className="flex items-center gap-2.5 shrink-0 pl-1">
                          <div className="text-right">
                            <span className="block text-[8px] font-bold font-mono text-slate-400 uppercase tracking-widest leading-none">Aantal</span>
                            <span className="text-lg font-black text-[#BE123C] font-mono leading-none mt-1 inline-block">
                              {r.productQuantity}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(r.id, `${r.inputterName}: ${r.productQuantity}x ${r.productType} (${r.inputDate})`)}
                            className="w-9 h-9 border border-slate-100 bg-slate-50 text-slate-450 hover:bg-rose-50 hover:text-[#BE123C] p-1.5 rounded-full transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* PAGINATION CONTROLS */}
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center bg-white border border-slate-150 rounded-xl p-2 select-none">
                      <button
                        type="button"
                        onClick={() => setTablePage(prev => Math.max(prev - 1, 1))}
                        disabled={tablePage === 1}
                        className="px-3 py-1.5 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Vorige</span>
                      </button>
                      
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {tablePage} / {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() => setTablePage(prev => Math.min(prev + 1, totalPages))}
                        disabled={tablePage === totalPages}
                        className="px-3 py-1.5 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <span>Volgende</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Action row back button */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setViewMode("dashboard")}
                      className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 text-[#BE123C] hover:bg-rose-100/60 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                      <span>Terug naar Evolutiegrafiek & Trends</span>
                    </button>
                  </div>

                  {/* Destructieve Beheerdersacties bottom block */}
                  {serverUser?.isAdmin && (
                    <div className="pt-6 mt-6 border-t border-slate-150 flex flex-col items-center justify-center gap-2">
                      <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                        Geavanceerde Beheerdersopties
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setClearStep(1);
                          setClearWord("");
                          setClearError(null);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#BE123C] font-extrabold text-xs transition-all cursor-pointer shadow-sm hover:shadow-md"
                        title="Wis de volledige database"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0 text-[#BE123C]" />
                        <span>Wis Database</span>
                      </button>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}
        </>
      )}

      {/* Dynamic React Delete Confirmation Dialog Modal */}
      <AnimatePresence>
        {deleteConfirmOpen && recordToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark glass backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isDeleting) setDeleteConfirmOpen(false); }}
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 z-10 flex flex-col"
            >
              {/* Header with warm/crimson alerts */}
              <div className="bg-[#BE123C] text-white p-5 relative">
                <div className="absolute right-4 top-4 text-rose-950 opacity-20">
                  <AlertTriangle className="w-16 h-16 stroke-[1]" />
                </div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-rose-200 font-mono">
                  Beheer actie
                </p>
                <h3 className="text-lg font-bold mt-0.5">
                  Record Verwijderen?
                </h3>
              </div>

              {/* Description contents */}
              <div className="p-5 space-y-4 col-span-1">
                <p className="text-xs text-slate-500 leading-normal">
                  Weet u zeker dat u deze invoer permanent wilt verwijderen uit de database? Deze actie kan niet ongedaan worden gemaakt.
                </p>

                <div className="bg-slate-50 border border-slate-100/85 p-3.5 rounded-xl text-left space-y-1.5 font-mono text-[11px] text-slate-700">
                  <p className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-1">Invoer details:</p>
                  <p className="whitespace-pre-wrap">{recordToDelete.details}</p>
                </div>

                {deleteError && (
                  <div className="text-xs text-[#BE123C] bg-rose-50 border border-rose-100 rounded-xl p-3 font-semibold">
                    {deleteError}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-5 bg-slate-50/80 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 font-bold hover:bg-slate-100 hover:text-slate-800 transition-all text-xs cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={executeDeleteRecord}
                  className="flex-1 py-2.5 rounded-xl bg-[#BE123C] hover:bg-[#9F1239] text-white font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isDeleting ? "Verwijderen..." : "Definitief Wissen"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Database Dual Confirmation Modal */}
      <AnimatePresence>
        {clearStep > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark glass backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isClearing) setClearStep(0); }}
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 z-10 flex flex-col"
            >
              {/* Header with crimson background */}
              <div className="bg-[#BE123C] text-white p-5 relative">
                <div className="absolute right-4 top-4 text-rose-950 opacity-20">
                  <AlertTriangle className="w-16 h-16 stroke-[1]" />
                </div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-rose-200 font-mono">
                  Systeem actie
                </p>
                <h3 className="text-lg font-bold mt-0.5">
                  Database Leegmaken
                </h3>
              </div>

              {/* Step 1: First Confirmation */}
              {clearStep === 1 && (
                <div className="p-5 space-y-4 flex-1">
                  <div className="p-3 bg-rose-50 border border-rose-100/80 rounded-2xl flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-[#BE123C] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-950">Waarschuwing</p>
                      <p className="text-[11px] text-rose-800 leading-normal mt-0.5">
                        U staat op het punt de volledige database leeg te maken. Alle geregistreerde records, statistieken en vullingen gaan definitief verloren.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-550 leading-normal">
                    Weet u absoluut zeker dat u wilt doorgaan met het leegmaken van de database? Dit kan niet ongedaan worden gemaakt.
                  </p>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setClearStep(0)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 font-bold hover:bg-slate-100 hover:text-slate-850 transition-all text-xs cursor-pointer text-center"
                    >
                      Annuleren
                    </button>
                    <button
                      type="button"
                      onClick={() => setClearStep(2)}
                      className="flex-1 py-2.5 rounded-xl bg-[#BE123C] hover:bg-[#9F1239] text-white font-bold transition-all text-xs text-center cursor-pointer"
                    >
                      Ja, ga verder
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Final Confirmation (Input typed keyword 'WISSEN') */}
              {clearStep === 2 && (
                <div className="p-5 space-y-4 flex-1">
                  <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <p className="text-xs font-black text-red-950">LAATSTE WAARSCHUWING</p>
                      <p className="text-[11px] text-red-800 leading-normal mt-0.5">
                        Dit is een onomkeerbare systeemactie. Typ exact het woord <span className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-red-200 text-red-700 select-all">WISSEN</span> hieronder om de database permanent te wissen.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono">Typ WISSEN ter bevestiging</label>
                    <input
                      type="text"
                      value={clearWord}
                      required
                      placeholder="Typ WISSEN"
                      onChange={(e) => {
                        setClearWord(e.target.value);
                        setClearError(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#BE123C] rounded-xl py-2 px-3.5 text-xs font-bold font-mono text-slate-800 uppercase tracking-widest outline-none transition-colors"
                    />
                  </div>

                  {clearError && (
                    <p className="text-[11px] font-bold text-[#BE123C] bg-rose-50 border border-rose-100 rounded-xl p-3 leading-normal">
                      {clearError}
                    </p>
                  )}

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      disabled={isClearing}
                      onClick={() => setClearStep(0)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 font-bold hover:bg-slate-100 hover:text-slate-850 transition-all text-xs cursor-pointer text-center disabled:opacity-40"
                    >
                      Annuleren
                    </button>
                    <button
                      type="button"
                      disabled={clearWord !== "WISSEN" || isClearing}
                      onClick={handleClearAllDatabase}
                      className="flex-1 py-2.5 rounded-xl bg-[#BE123C] hover:bg-[#9F1239] text-white font-bold transition-all text-xs text-center cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed uppercase font-mono tracking-wider shadow-5xs"
                    >
                      {isClearing ? "Wissen..." : "JA, WIS ALLES"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
