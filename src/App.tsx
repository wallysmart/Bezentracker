import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User as UserIcon, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Menu,
  Users,
  Cloud,
  X,
  Info,
  Check,
  AlertTriangle,
  LogOut,
  Lock,
  Plus,
  Trash2,
  RefreshCw,
  Home,
  BarChart3,
  UserCheck,
  Settings,
  Mail,
  UserX,
  Eye,
  EyeOff,
  Coins,
  Scale
} from "lucide-react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { auth, googleProvider } from "@/src/lib/firebase";
import { ProductInput, RecordRow } from "./types";
import ProductCard from "./components/ProductCard";
import ConfirmationModal from "./components/ConfirmationModal";
import Logo from "./components/Logo";
import ProductOverview from "./components/ProductOverview";

const INITIAL_PRODUCTS: ProductInput[] = [
  {
    id: "strawberry-big",
    dbName: "aardbeien groot",
    displayName: "Aardbeien groot",
    quantityBakjes: 0,
    quantityKisten: 0,
    icon: "🍓",
    color: "bg-rose-50",
    textColor: "text-rose-600",
    accentColor: "#E11D48",
    step: 1,
    max: 100
  },
  {
    id: "strawberry-small",
    dbName: "aardbeien klein",
    displayName: "Aardbeien klein",
    quantityBakjes: 0,
    quantityKisten: 0,
    icon: "🍓",
    color: "bg-rose-50/50",
    textColor: "text-pink-600",
    accentColor: "#EC4899",
    step: 1,
    max: 100
  },
  {
    id: "cherry-tomato",
    dbName: "kerstomaten",
    displayName: "Kerstomaten",
    quantityBakjes: 0,
    quantityKisten: 0,
    icon: "🍅",
    color: "bg-orange-50",
    textColor: "text-orange-600",
    accentColor: "#EA580C",
    step: 1,
    max: 100
  }
];

interface ServerUser {
  email: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  isAdmin: boolean;
}

interface UserRegistryItem {
  uid: string;
  email: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  provider: "google" | "email";
}

export default function App() {
  const [products, setProducts] = useState<ProductInput[]>(INITIAL_PRODUCTS);
  const [inputterName, setInputterName] = useState("");

  // Firebase auth & server sync states
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [serverUser, setServerUser] = useState<ServerUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Email login states
  const [isEmailRegisterMode, setIsEmailRegisterMode] = useState(false);
  const [emEmail, setEmEmail] = useState("");
  const [emPassword, setEmPassword] = useState("");
  const [emFullName, setEmFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // App views and navigation
  // "vullen" | "instellingen" | "users" | "summary"
  const [currentTab, setCurrentTab] = useState<"vullen" | "instellingen" | "users" | "summary">("vullen");
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  // Users registry management (Admin only)
  const [userList, setUserList] = useState<UserRegistryItem[]>([]);
  const [adminList, setAdminList] = useState<string[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [newAdminEmailInput, setNewAdminEmailInput] = useState("");
  const [adminMgmtError, setAdminMgmtError] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  
  // Prices and volume correspondences states (Admin only)
  const [prices, setPrices] = useState<Record<string, number>>({
    "aardbeien groot": 4.5,
    "aardbeien klein": 3.0,
    "kerstomaten": 2.5
  });
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [pricesSuccess, setPricesSuccess] = useState(false);

  const [correspondences, setCorrespondences] = useState<Record<string, number>>({
    "kist_aardbeien_to_bakjes": 10.0,
    "doos_kerstomaten_to_bakjes": 10.0,
    "bakje_aardbeien_to_kg": 0.5,
    "bakje_kerstomaten_to_kg": 0.5
  });
  const [isSavingCorrespondences, setIsSavingCorrespondences] = useState(false);
  const [correspondencesError, setCorrespondencesError] = useState<string | null>(null);
  const [correspondencesSuccess, setCorrespondencesSuccess] = useState(false);
  
  // Modals & UI States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Sync with express backend user authorization
  const syncServerUser = async (user: User) => {
    try {
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName || user.email?.split("@")[0],
          uid: user.uid,
          provider: user.providerData?.[0]?.providerId || "email"
        })
      });

      if (response.ok) {
        const data = await response.json();
        setServerUser({
          email: data.email,
          name: data.name,
          status: data.status,
          isAdmin: data.isAdmin
        });
        setInputterName(data.name);
      } else {
        setAuthError("Fout bij het laden van machtigingen.");
      }
    } catch (e) {
      console.error("Error syncing server user:", e);
      setAuthError("Verbindingsfout met server voor inlog-controle.");
    }
  };

  // Auth changes listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthLoading(true);
      setAuthError(null);
      if (user) {
        setFirebaseUser(user);
        await syncServerUser(user);
      } else {
        // If there is no Firebase user, check if we have a local E-mail user session
        const stored = localStorage.getItem("localUserSession");
        if (stored) {
          try {
            const data = JSON.parse(stored);
            // Re-sync with server to retrieve latest status / admin role
            const res = await fetch("/api/auth/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: data.email,
                name: data.name,
                uid: "local_" + data.email,
                provider: "email"
              })
            });
            if (res.ok) {
              const synced = await res.json();
              const mockUser = {
                email: synced.email,
                displayName: synced.name,
                uid: "local_" + synced.email,
                providerData: [{ providerId: "email" }]
              } as any;
              setFirebaseUser(mockUser);
              setServerUser({
                email: synced.email,
                name: synced.name,
                status: synced.status,
                isAdmin: synced.isAdmin
              });
              setInputterName(synced.name);
            } else {
              // Session expired/invalid
              localStorage.removeItem("localUserSession");
              setFirebaseUser(null);
              setServerUser(null);
              setInputterName("");
            }
          } catch (e) {
            localStorage.removeItem("localUserSession");
            setFirebaseUser(null);
            setServerUser(null);
            setInputterName("");
          }
        } else {
          setFirebaseUser(null);
          setServerUser(null);
          setInputterName("");
        }
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch local prices and volume correspondences
  const fetchPricesAndCorrespondences = async () => {
    try {
      const resP = await fetch("/api/admin/prices");
      if (resP.ok) {
        const pData = await resP.json();
        setPrices(pData);
      }
      const resC = await fetch("/api/correspondences");
      if (resC.ok) {
        const cData = await resC.json();
        setCorrespondences(cData);
      }
    } catch (e) {
      console.error("Fout bij ophalen van prijzen of volume-correspondenties:", e);
    }
  };

  useEffect(() => {
    fetchPricesAndCorrespondences();
  }, [currentTab, serverUser]);

  // Fetch admin and user registries (Admin tab only)
  const fetchUsersAndAdmins = async () => {
    if (!serverUser || !serverUser.isAdmin) return;
    setIsUsersLoading(true);
    setAdminMgmtError(null);
    try {
      // 1. Fetch Users registry
      const userRes = await fetch(`/api/admin/users?adminEmail=${encodeURIComponent(serverUser.email)}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserList(userData.users || []);
      }

      // 2. Fetch Administrators list
      const adminRes = await fetch(`/api/admin/admins?adminEmail=${encodeURIComponent(serverUser.email)}`);
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        setAdminList(adminData.admins || []);
      }
    } catch (err) {
      console.error("Error loading administration data:", err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === "users" && serverUser?.isAdmin) {
      fetchUsersAndAdmins();
    }
  }, [currentTab, serverUser]);

  // Log in with Google Auth
  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setAuthError("Log-in met Google geannuleerd of mislukt.");
      setIsAuthLoading(false);
    }
  };

  // Sign up/Login with Email and Password (Bypasses Firebase to avoid IAM provider errors)
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!emEmail || !emPassword) {
      setAuthError("Vul alsjeblieft alle velden in.");
      return;
    }
    
    setIsAuthLoading(true);
    try {
      if (isEmailRegisterMode) {
        // Custom Server registration
        if (!emFullName.trim()) {
          setAuthError("Vul uw volledige naam in.");
          setIsAuthLoading(false);
          return;
        }
        
        const res = await fetch("/api/auth/email/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emEmail,
            password: emPassword,
            name: emFullName.trim()
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Fout bij registreren.");
        }

        const mockUser = {
          email: data.user.email,
          displayName: data.user.name,
          uid: "local_" + data.user.email,
          providerData: [{ providerId: "email" }]
        } as any;

        setFirebaseUser(mockUser);
        setServerUser({
          email: data.user.email,
          name: data.user.name,
          status: data.user.status,
          isAdmin: data.user.isAdmin
        });
        setInputterName(data.user.name);
        localStorage.setItem("localUserSession", JSON.stringify(data.user));
      } else {
        // Custom Server sign-in
        const res = await fetch("/api/auth/email/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emEmail,
            password: emPassword
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Fout bij inloggen.");
        }

        const mockUser = {
          email: data.user.email,
          displayName: data.user.name,
          uid: "local_" + data.user.email,
          providerData: [{ providerId: "email" }]
        } as any;

        setFirebaseUser(mockUser);
        setServerUser({
          email: data.user.email,
          name: data.user.name,
          status: data.user.status,
          isAdmin: data.user.isAdmin
        });
        setInputterName(data.user.name);
        localStorage.setItem("localUserSession", JSON.stringify(data.user));
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      setAuthError(err.message || "Inloggen/Registreren mislukt. Controleer uw invoer.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      localStorage.removeItem("localUserSession");
      await signOut(auth);
      setFirebaseUser(null);
      setServerUser(null);
      setInputterName("");
      setProducts(INITIAL_PRODUCTS);
      setCurrentTab("vullen");
      setIsAdminMenuOpen(false);
    } catch (err) {
      console.error("Uitlogfout:", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUser) return;
    setIsSavingPrices(true);
    setPricesError(null);
    setPricesSuccess(false);
    try {
      const res = await fetch("/api/admin/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: serverUser.email,
          prices
        })
      });
      if (res.ok) {
        setPricesSuccess(true);
        setTimeout(() => setPricesSuccess(false), 3000);
      } else {
        const data = await res.json();
        setPricesError(data.error || "Fout bij opslaan van prijzen.");
      }
    } catch (err) {
      setPricesError("Kan geen verbinding maken met de server.");
    } finally {
      setIsSavingPrices(false);
    }
  };

  const handleSaveCorrespondences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUser) return;
    setIsSavingCorrespondences(true);
    setCorrespondencesError(null);
    setCorrespondencesSuccess(false);
    try {
      const res = await fetch("/api/admin/correspondences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: serverUser.email,
          correspondences: correspondences
        })
      });
      if (res.ok) {
        setCorrespondencesSuccess(true);
        setTimeout(() => setCorrespondencesSuccess(false), 3000);
      } else {
        const data = await res.json();
        setCorrespondencesError(data.error || "Fout bij opslaan van correspondenties.");
      }
    } catch (err) {
      setCorrespondencesError("Kan geen verbinding maken met de server.");
    } finally {
      setIsSavingCorrespondences(false);
    }
  };

  // Sync date and time
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString("nl-NL", { 
        weekday: "short", 
        day: "numeric", 
        month: "short", 
        year: "numeric" 
      }));
      setCurrentTime(now.toLocaleTimeString("nl-NL", { 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit"
      }));
    };
    
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleProductBakjesChange = (id: string, qty: number) => {
    setProducts(prev => 
      prev.map(p => p.id === id ? { ...p, quantityBakjes: qty } : p)
    );
  };

  const handleProductKistenChange = (id: string, qty: number) => {
    setProducts(prev => 
      prev.map(p => p.id === id ? { ...p, quantityKisten: qty } : p)
    );
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firebaseUser || !serverUser) {
      setErrorMessage("U moet ingelogd zijn.");
      return;
    }

    if (serverUser.status !== "approved") {
      setErrorMessage("Uw account is nog niet goedgekeurd door de beheerder.");
      return;
    }

    if (!inputterName.trim()) {
      setErrorMessage("Vul alsjeblieft je naam in.");
      return;
    }

    const totalFilled = products.reduce((acc, p) => acc + p.quantityBakjes + p.quantityKisten, 0);
    if (totalFilled === 0) {
      setErrorMessage("Voer voor ten minste één product een aantal in groter dan 0.");
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const itemsPayload: Array<{ productType: string; productQuantity: number }> = [];
    products.forEach(p => {
      const defaultUnit = p.dbName === "kerstomaten" ? "bekers" : "bakjes";
      if (p.quantityBakjes > 0) {
        itemsPayload.push({
          productType: `${p.dbName} (${defaultUnit})`,
          productQuantity: p.quantityBakjes,
        });
      }
      if (p.quantityKisten > 0) {
        itemsPayload.push({
          productType: `${p.dbName} (kisten)`,
          productQuantity: p.quantityKisten,
        });
      }
    });

    const now = new Date();
    const inputDateFormatted = now.toLocaleDateString("nl-NL");
    const inputTimeFormatted = now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputterName: inputterName.trim(),
          items: itemsPayload,
          inputDate: inputDateFormatted,
          inputTime: inputTimeFormatted,
          userEmail: firebaseUser?.email // Secure server-side check
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Fout bij opslaan van gegevens.");
      }

      setSubmitSuccess(true);
      setIsConfirmOpen(false);
      setShowSuccessToast(true);
      
      // Reset quantities
      setProducts(prev => prev.map(p => ({ ...p, quantityBakjes: 0, quantityKisten: 0 })));
      
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 4000);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Er is een fout opgetreden bij het schrijven naar de database.");
      setIsConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Administration list actions 
  const handleApproveUser = async (targetEmail: string) => {
    if (!serverUser) return;
    try {
      const res = await fetch("/api/admin/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: serverUser.email,
          targetEmail
        })
      });
      if (res.ok) {
        await fetchUsersAndAdmins();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Fout bij goedkeuren.");
      }
    } catch (e) {
      alert("Fout bij verbinding met de server.");
    }
  };

  const handleRejectUser = async (targetEmail: string) => {
    if (!serverUser) return;
    try {
      const res = await fetch("/api/admin/users/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: serverUser.email,
          targetEmail
        })
      });
      if (res.ok) {
        await fetchUsersAndAdmins();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Fout bij weigeren.");
      }
    } catch (e) {
      alert("Fout bij verbinding met de server.");
    }
  };

  const handleDeleteUser = async (targetEmail: string) => {
    if (!serverUser) return;
    if (!confirm(`Weet u zeker dat u ${targetEmail} wilt verwijderen uit het register?`)) return;
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: serverUser.email,
          targetEmail
        })
      });
      if (res.ok) {
        await fetchUsersAndAdmins();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Fout bij verwijderen.");
      }
    } catch (e) {
      alert("Fout bij verbinding.");
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUser || !newAdminEmailInput.trim()) return;
    setAdminMgmtError(null);

    try {
      const res = await fetch("/api/admin/admins/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: serverUser.email,
          newAdminEmail: newAdminEmailInput.trim()
        })
      });
      if (res.ok) {
        setNewAdminEmailInput("");
        await fetchUsersAndAdmins();
      } else {
        const errorData = await res.json();
        setAdminMgmtError(errorData.error || "Kon beheerder niet toevoegen.");
      }
    } catch (e) {
      setAdminMgmtError("Verbindingsfout met server.");
    }
  };

  const handleRemoveAdmin = async (targetAdmin: string) => {
    if (!serverUser) return;
    if (targetAdmin === "wouter.torfss@gmail.com") {
      alert("De hoofdbeheerder kan niet worden verwijderd.");
      return;
    }
    if (!confirm(`Weet u zeker dat u ${targetAdmin} wilt verwijderen als beheerder?`)) return;

    try {
      const res = await fetch("/api/admin/admins/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: serverUser.email,
          targetAdminEmail: targetAdmin
        })
      });
      if (res.ok) {
        await fetchUsersAndAdmins();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Kon administrator niet verwijderen.");
      }
    } catch (e) {
      alert("Verbindingsfout.");
    }
  };

  return (
    <div className="min-h-screen relative text-[#1E293B] flex justify-center items-start sm:py-10 sm:px-4 selection:bg-rose-100 selection:text-white transition-colors duration-200 overflow-x-hidden">
      
      {/* Immersive Red Strawberry Gradient Background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#E11D48] via-[#BE123C] to-[#881337]" id="strawberry-gradient-bg" />
      
      {/* Precision Vector Strawberry Seeds Background */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.09]" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M24 8 C23.5 11, 24.3 13, 24.3 13 C24.3 13, 25.1 11, 24 8 Z M8 32 C7.5 35, 8.3 37, 8.3 37 C8.3 37, 9.1 35, 8 32 Z M40 32 C39.5 35, 40.3 37, 40.3 37 C40.3 37, 41.1 35, 40 32 Z' fill='%23FDE047' stroke='%23FDE047' stroke-linecap='round' stroke-linejoin='round' stroke-width='0.8'/%3E%3C/svg%3E")`,
          backgroundSize: "48px 48px"
        }}
      />

      {/* Success Notification Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#881337] text-white font-medium px-6 py-3.5 rounded-2xl shadow-lg border border-[#BE123C] flex items-center gap-3 max-w-sm w-[90%]"
            id="toast-success-alert"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 stroke-[2.5]" />
            <div className="text-xs">
              <p className="font-bold">Succesvol!</p>
              <p className="text-rose-100/90 mt-0.5 font-sans">Uw actie is succesvol opgeslagen en gesynchroniseerd.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-xl bg-white sm:rounded-3xl rounded-none overflow-hidden sm:shadow-[0_15px_50px_rgba(0,0,0,0.15)] shadow-none sm:border border-[#EBEAE5] relative z-10 flex flex-col min-h-screen sm:min-h-[600px] app-container">
        
        {/* Loading overlay */}
        {isAuthLoading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-[#BE123C] animate-spin stroke-[2.5]" />
            <p className="text-xs font-bold font-mono uppercase tracking-widest text-[#BE123C]">Laden...</p>
          </div>
        )}

        {/* NOT AUTHENTICATED: First View is Login Page */}
        {!firebaseUser ? (
          <div className="flex-1 flex flex-col justify-center p-8 bg-[#FCFCFB] text-slate-800" id="login-container">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4 scale-110">
                <Logo />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-800">Welkom bij de BezenTracker</h2>
              <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">
                Meld u aan om de gevulde producten in verkoopautomaten te registreren.
              </p>
            </div>

            {/* Error notifications */}
            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 border border-rose-100/80 rounded-2xl p-4 text-xs font-semibold text-rose-800 flex gap-3 items-start mb-6 leading-relaxed"
                id="login-error-alert"
              >
                <AlertCircle className="w-4.5 h-4.5 text-[#BE123C] shrink-0 mt-0.5" />
                <span>{authError}</span>
              </motion.div>
            )}

            {/* Form Toggle Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button 
                type="button"
                onClick={() => { setIsEmailRegisterMode(false); setAuthError(null); }}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${!isEmailRegisterMode ? "bg-white text-slate-800 shadow-3xs" : "text-slate-400 hover:text-slate-700"}`}
              >
                Inloggen
              </button>
              <button 
                type="button"
                onClick={() => { setIsEmailRegisterMode(true); setAuthError(null); }}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${isEmailRegisterMode ? "bg-white text-slate-800 shadow-3xs" : "text-slate-400 hover:text-slate-700"}`}
              >
                Registreren
              </button>
            </div>

            {/* Email-Password form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isEmailRegisterMode && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Volledige Naam</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Bijv. Jan Janssen"
                      value={emFullName}
                      onChange={(e) => setEmFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#BE123C] focus:ring-1 focus:ring-[#BE123C]/20 transition-all font-sans text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">E-mailadres</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="uwname@voorbeeld.com"
                    value={emEmail}
                    onChange={(e) => setEmEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#BE123C] focus:ring-1 focus:ring-[#BE123C]/20 transition-all font-sans text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Wachtwoord</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Minimaal 6 tekens"
                    value={emPassword}
                    onChange={(e) => setEmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#BE123C] focus:ring-1 focus:ring-[#BE123C]/20 transition-all font-sans text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-650"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#BE123C] hover:bg-[#9F1239] text-white font-bold text-sm shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
              >
                {isEmailRegisterMode ? "Account Registreren" : "Inloggen met E-mail"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-slate-200 h-px" />
              <span className="relative bg-[#FCFCFB] px-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">OF</span>
            </div>

            {/* Google Authentication Trigger */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 py-3 rounded-2xl text-xs font-bold text-slate-700 transition-all shadow-3xs cursor-pointer active:scale-99"
            >
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Inloggen met Google
            </button>
          </div>
        ) : serverUser?.status === "pending" ? (
          /* AUTHENTICATED: Status Pending View */
          <div className="flex-1 flex flex-col justify-center items-center p-8 bg-[#FCFCFB] text-center" id="pending-container">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 border border-amber-150 flex items-center justify-center mb-6 animate-pulse mt-8">
              <Clock className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-800">Wachten op goedkeuring</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-sm font-medium leading-relaxed">
              Hallo <strong className="text-slate-800">{serverUser.name}</strong>, uw account ({serverUser.email}) is geregistreerd. 
              Er is een goedkeuringsverzoek gestuurd naar de beheerder. 
            </p>

            <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 max-w-sm text-xs text-amber-800 mt-6 leading-relaxed font-sans shadow-3xs flex gap-2.5 text-left">
              <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <span>Nieuwe gebruikers moeten eenmalig handmatig worden goedgekeurd door de beheerder in de beheeromgeving voordat zij gegevens kunnen indienen.</span>
            </div>

            <div className="flex flex-col gap-3.5 w-full max-w-xs mt-8 mb-4">
              <button
                type="button"
                onClick={() => syncServerUser(firebaseUser)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                Status Controleren
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Uitloggen / Ander account
              </button>
            </div>
          </div>
        ) : serverUser?.status === "rejected" ? (
          /* AUTHENTICATED: Status Rejected View */
          <div className="flex-1 flex flex-col justify-center items-center p-8 bg-[#FCFCFB] text-center" id="rejected-container">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 border border-rose-150 flex items-center justify-center mb-6 mt-8">
              <UserX className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-800">Toegang geweigerd</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-sm font-medium leading-relaxed">
              Beste <strong className="text-slate-800">{serverUser.name}</strong>, uw account ({serverUser.email}) is afgewezen of gedeactiveerd door een beheerder.
            </p>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-8 py-2.5 px-6 rounded-xl border border-[#BE123C] hover:bg-rose-50 text-[#BE123C] font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Uitloggen
            </button>
          </div>
        ) : (
          /* AUTHENTICATED & APPROVED: Main Vending App View */
          <>
            {/* Header with App Title and Admin Hamburger icon if Admin */}
            <header className="py-2 px-4 border-b border-[#E2E8F0] bg-white text-center flex items-center justify-between relative z-30">
              <div className="w-8 h-8 shrink-0 sm:block hidden" /> {/* Spacer */}
              <Logo size="compact" />
              
              {serverUser?.isAdmin ? (
                /* Admin Hamburger menu trigger */
                <button 
                  type="button"
                  onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                  className="w-10 h-10 rounded-xl text-slate-500 hover:text-[#BE123C] hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer border border-transparent shadow-3xs"
                  title="Beheerderspaneel Menu"
                  id="admin-hamburger-btn"
                >
                  <Menu className={`w-5 h-5 transition-transform ${isAdminMenuOpen ? "rotate-90 text-[#BE123C]" : ""}`} />
                </button>
              ) : (
                /* Regular User Settings / Info showing user detail */
                <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 relative group overflow-hidden cursor-help shadow-4xs" title={`Ingelogd als: ${serverUser?.name}`}>
                  <span className="text-[10px] font-bold uppercase font-mono">{serverUser?.name.charAt(0)}</span>
                </div>
              )}
            </header>

            {/* Hamburger Slide Down Overlay for Admin Menu Screen */}
            <AnimatePresence>
              {isAdminMenuOpen && serverUser?.isAdmin && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-[73px] inset-x-0 bg-slate-900 text-white z-40 shadow-xl border-b border-slate-800 overflow-hidden"
                  id="admin-slide-menu"
                >
                  <div className="p-4.5 space-y-4">
                    {/* Active profile badge inside admin view */}
                    <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#BE123C] to-[#E11D48] text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-700 uppercase">
                        {serverUser.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{serverUser.name}</p>
                        <p className="text-[10px] text-rose-350 font-mono uppercase tracking-wider font-semibold">Beheerder</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="p-1 px-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-[10px] font-mono leading-none flex items-center gap-1 cursor-pointer"
                        title="Uitloggen"
                      >
                        <LogOut className="w-3 h-3" />
                        Loguit
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Vullen / Filling form action */}
                      <button
                        type="button"
                        onClick={() => { setCurrentTab("vullen"); setIsAdminMenuOpen(false); }}
                        className={`p-3 rounded-xl flex items-center gap-2 text-left cursor-pointer transition-all border ${currentTab === "vullen" ? "bg-[#BE123C] border-[#BE123C] text-white" : "bg-slate-850 border-slate-700/40 hover:bg-slate-800 text-slate-300"}`}
                      >
                        <Home className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold font-mono">Vulformulier</span>
                      </button>

                      {/* Settings / Instellingen action */}
                      <button
                        type="button"
                        onClick={() => { setCurrentTab("instellingen"); setIsAdminMenuOpen(false); }}
                        className={`p-3 rounded-xl flex items-center gap-2 text-left cursor-pointer transition-all border ${currentTab === "instellingen" ? "bg-[#BE123C] border-[#BE123C] text-white" : "bg-slate-850 border-slate-700/40 hover:bg-slate-800 text-slate-300"}`}
                      >
                        <Settings className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold font-mono">Instellingen</span>
                      </button>

                      {/* Users registration table */}
                      <button
                        type="button"
                        onClick={() => { setCurrentTab("users"); setIsAdminMenuOpen(false); }}
                        className={`p-3 rounded-xl flex items-center gap-2 text-left cursor-pointer transition-all border ${currentTab === "users" ? "bg-[#BE123C] border-[#BE123C] text-white" : "bg-slate-850 border-slate-700/40 hover:bg-slate-800 text-slate-300"}`}
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold font-mono">Gebruikers</span>
                      </button>

                      {/* Product summary */}
                      <button
                        type="button"
                        onClick={() => { setCurrentTab("summary"); setIsAdminMenuOpen(false); }}
                        className={`p-3 rounded-xl flex items-center gap-2 text-left cursor-pointer transition-all border ${currentTab === "summary" ? "bg-[#BE123C] border-[#BE123C] text-white" : "bg-slate-850 border-slate-700/40 hover:bg-slate-800 text-slate-300"}`}
                      >
                        <BarChart3 className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold font-mono">Overzicht</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content Area depends on Current Nav tab */}
            <main className="p-3.5 xs:p-5 sm:p-6 flex-1 space-y-4 sm:space-y-7 bg-[#FCFCFB] relative z-10 select-none">

              {/* TAB 1: Main Product Villing Form */}
              {currentTab === "vullen" && (
                <form onSubmit={handlePreSubmit} className="space-y-3.5 sm:space-y-6" id="vending-submission-form">
                  
                  {/* Vuller Identity state */}
                  <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-100 shadow-3xs">
                    <div className="flex items-center justify-between">
                      <label htmlFor="filler-name" className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 font-mono">
                        Naam van de vuller
                      </label>
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider border border-emerald-100/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Geautoriseerd
                      </span>
                    </div>

                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        id="filler-name"
                        value={inputterName}
                        onChange={(e) => setInputterName(e.target.value)}
                        placeholder="Klik om uw naam in te voeren..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-4 text-sm font-semibold focus:outline-none focus:border-[#BE123C] transition-all font-sans text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Form Submission Errors */}
                  <AnimatePresence>
                    {errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-rose-50 border border-rose-100 text-rose-800 rounded-xl p-3 flex gap-2.5 items-center text-xs font-medium"
                      >
                        <AlertCircle className="w-4 h-4 text-[#BE123C] shrink-0" />
                        <p>{errorMessage}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Quantity inputs */}
                  <div className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                      Gevulde hoeveelheden invoeren
                    </h2>

                    <div className="grid grid-cols-1 gap-2.5">
                      {products.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          onChangeQtyBakjes={(qty) => handleProductBakjesChange(p.id, qty)}
                          onChangeQtyKisten={(qty) => handleProductKistenChange(p.id, qty)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Trigger Save */}
                  <div className="pt-1.5">
                    <button
                      type="submit"
                      style={{ fontSize: "20px" }}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#BE123C] hover:bg-[#9F1239] text-white font-black cursor-pointer shadow-sm hover:shadow-md active:scale-98 transition-all duration-150 flex items-center justify-center gap-2 outline-none uppercase tracking-wide"
                    >
                      Gegevens Opslaan
                      <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                    </button>
                    {!serverUser?.isAdmin && (
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-2.5 w-full py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-550 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Uitloggen
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* TAB: Instellingen (Submenu 1 & 2 Merged) */}
              {currentTab === "instellingen" && serverUser?.isAdmin && (
                <div className="space-y-6 animate-fade-in" id="instellingen-tab">
                  {/* Page Title */}
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Settings className="w-5 h-5 text-[#BE123C]" />
                    <h3 className="font-bold text-slate-800 text-xs sm:text-sm font-mono uppercase tracking-wider">Instellingen Beheer</h3>
                  </div>

                  <div className="bg-rose-50/40 border border-rose-100/60 rounded-2xl p-4 text-xs text-slate-650 leading-normal space-y-1.5 shadow-3xs">
                    <div className="flex items-center gap-1.5 font-bold text-rose-950">
                      <Info className="w-4 h-4 text-[#BE123C]" />
                      <span>Systeemparameters, Prijzen en Volume-conversies</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Beheer hier zowel de basisprijzen per bakje als de volume-conversies per type eenheid. Deze waarden worden automatisch toegepast bij nieuwe invoerregistraties en dashboards.
                    </p>
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Left block: Prijszetting */}
                    <div className="space-y-4 flex flex-col h-full">
                      <div className="flex items-center gap-2 font-bold text-slate-700 text-xs sm:text-sm font-mono uppercase tracking-wider">
                        <Coins className="w-4 h-4 text-rose-650" />
                        <span>Prijsbepaling per bakje</span>
                      </div>

                      <form onSubmit={handleSavePrices} className="space-y-4 bg-white p-4.5 rounded-2xl border border-slate-100 shadow-4xs flex flex-col justify-between flex-1 min-h-[380px]">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Basisprijs Aardbeien Groot (per bakje)</label>
                            <div className="relative mt-1">
                              <span className="absolute left-3.5 top-2.5 text-xs font-semibold text-slate-400">€</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={prices["aardbeien groot"] !== undefined ? prices["aardbeien groot"] : ""}
                                onChange={(e) => setPrices(prev => ({ ...prev, "aardbeien groot": parseFloat(e.target.value) || 0 }))}
                                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl py-2 px-8 text-xs text-slate-850 font-mono focus:outline-none focus:border-[#BE123C]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Basisprijs Aardbeien Klein (per bakje)</label>
                            <div className="relative mt-1">
                              <span className="absolute left-3.5 top-2.5 text-xs font-semibold text-slate-400">€</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={prices["aardbeien klein"] !== undefined ? prices["aardbeien klein"] : ""}
                                onChange={(e) => setPrices(prev => ({ ...prev, "aardbeien klein": parseFloat(e.target.value) || 0 }))}
                                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl py-2 px-8 text-xs text-slate-850 font-mono focus:outline-none focus:border-[#BE123C]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Basisprijs Kerstomaten (per bakje)</label>
                            <div className="relative mt-1">
                              <span className="absolute left-3.5 top-2.5 text-xs font-semibold text-slate-400">€</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={prices["kerstomaten"] !== undefined ? prices["kerstomaten"] : ""}
                                onChange={(e) => setPrices(prev => ({ ...prev, "kerstomaten": parseFloat(e.target.value) || 0 }))}
                                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl py-2 px-8 text-xs text-slate-850 font-mono focus:outline-none focus:border-[#BE123C]"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 space-y-3 mt-auto">
                          {pricesError && (
                            <div className="text-xs text-[#BE123C] bg-rose-50 border border-[#BE123C]/20 rounded-xl p-3 font-medium">
                              {pricesError}
                            </div>
                          )}

                          {pricesSuccess && (
                            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl p-3 font-medium flex items-center gap-1.5">
                              <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                              Prijzen succesvol opgeslagen!
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isSavingPrices}
                            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-40 font-mono uppercase tracking-wider"
                          >
                            {isSavingPrices ? "Opslaan..." : "Prijzen Opslaan"}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Right block: Volume Correspondenties */}
                    <div className="space-y-4 flex flex-col h-full">
                      <div className="flex items-center gap-2 font-bold text-slate-700 text-xs sm:text-sm font-mono uppercase tracking-wider">
                        <Scale className="w-4 h-4 text-rose-650" />
                        <span>Volume Correspondenties</span>
                      </div>

                      <form onSubmit={handleSaveCorrespondences} className="space-y-4 bg-white p-4.5 rounded-2xl border border-slate-100 shadow-4xs flex flex-col justify-between flex-1 min-h-[380px]">
                        <div className="space-y-4">
                          <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-150 space-y-4">
                            
                            {/* kist aardbeien */}
                            <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-200/50">
                              <span className="text-xs font-semibold text-slate-700">1 kist aardbeien =</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  required
                                  value={correspondences["kist_aardbeien_to_bakjes"] !== undefined ? correspondences["kist_aardbeien_to_bakjes"] : ""}
                                  onChange={(e) => setCorrespondences(prev => ({ ...prev, "kist_aardbeien_to_bakjes": parseFloat(e.target.value) || 0 }))}
                                  className="w-16 bg-white border border-slate-300 rounded-lg py-1 px-2 text-center text-xs font-bold font-mono focus:outline-none focus:border-[#BE123C]"
                                />
                                <span className="text-xs text-slate-500 font-medium font-mono">bakjes</span>
                              </div>
                            </div>

                            {/* doos kerstomaatjes */}
                            <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-200/50">
                              <span className="text-xs font-semibold text-slate-700">1 doos kerstomaatjes =</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  required
                                  value={correspondences["doos_kerstomaten_to_bakjes"] !== undefined ? correspondences["doos_kerstomaten_to_bakjes"] : ""}
                                  onChange={(e) => setCorrespondences(prev => ({ ...prev, "doos_kerstomaten_to_bakjes": parseFloat(e.target.value) || 0 }))}
                                  className="w-16 bg-white border border-slate-300 rounded-lg py-1 px-2 text-center text-xs font-bold font-mono focus:outline-none focus:border-[#BE123C]"
                                />
                                <span className="text-xs text-slate-500 font-medium font-mono">bakjes</span>
                              </div>
                            </div>

                            {/* bakje aardbeien kg */}
                            <div className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-200/50">
                              <span className="text-xs font-semibold text-slate-700">1 bakje aardbeien =</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  value={correspondences["bakje_aardbeien_to_kg"] !== undefined ? correspondences["bakje_aardbeien_to_kg"] : ""}
                                  onChange={(e) => setCorrespondences(prev => ({ ...prev, "bakje_aardbeien_to_kg": parseFloat(e.target.value) || 0 }))}
                                  className="w-16 bg-white border border-slate-300 rounded-lg py-1 px-2 text-center text-xs font-bold font-mono focus:outline-none focus:border-[#BE123C]"
                                />
                                <span className="text-xs text-slate-500 font-medium font-mono">kg</span>
                              </div>
                            </div>

                            {/* bakje kerstomaatjes kg */}
                            <div className="flex items-center justify-between gap-4 py-1.5">
                              <span className="text-xs font-semibold text-slate-700">1 bakje kerstomaatjes =</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  value={correspondences["bakje_kerstomaten_to_kg"] !== undefined ? correspondences["bakje_kerstomaten_to_kg"] : ""}
                                  onChange={(e) => setCorrespondences(prev => ({ ...prev, "bakje_kerstomaten_to_kg": parseFloat(e.target.value) || 0 }))}
                                  className="w-16 bg-white border border-slate-300 rounded-lg py-1 px-2 text-center text-xs font-bold font-mono focus:outline-none focus:border-[#BE123C]"
                                />
                                <span className="text-xs text-slate-500 font-medium font-mono">kg</span>
                              </div>
                            </div>

                          </div>
                        </div>

                        <div className="pt-4 space-y-3 mt-auto">
                          {correspondencesError && (
                            <div className="text-xs text-[#BE123C] bg-rose-50 border border-rose-100 rounded-xl p-3 font-medium">
                              {correspondencesError}
                            </div>
                          )}

                          {correspondencesSuccess && (
                            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl p-3 font-medium flex items-center gap-1.5">
                              <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                              Correspondenties succesvol opgeslagen!
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isSavingCorrespondences}
                            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-40 font-mono uppercase tracking-wider"
                          >
                            {isSavingCorrespondences ? "Opslaan..." : "Conversies Opslaan"}
                          </button>
                        </div>
                      </form>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 3: Users List & Administrations (Submenu 2) */}
              {currentTab === "users" && serverUser?.isAdmin && (
                <div className="space-y-6" id="users-registry-tab">
                  {/* Title */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#BE123C]" />
                      <h3 className="font-bold text-slate-800 text-sm font-mono uppercase tracking-wider">Gebruikers Beheer</h3>
                    </div>
                    <button 
                      type="button"
                      onClick={fetchUsersAndAdmins}
                      disabled={isUsersLoading}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#BE123C] hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Verversen"
                    >
                      <RefreshCw className={`w-4 h-4 ${isUsersLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  {/* MODULE A: REGISTERED USERS FOR APPROVAL */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold px-1 uppercase tracking-wider text-slate-400 font-mono">Aanmeldingsregister</h4>
                    {userList.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center text-xs text-slate-400 font-medium font-sans leading-relaxed">
                        Er zijn nog geen geregistreerde gebruikers in de database.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {userList.map((usr) => (
                          <div 
                            key={usr.email}
                            className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-4xs text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 hover:border-slate-300 transition-all"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 truncate">{usr.name}</span>
                                {adminList.includes(usr.email) && (
                                  <span className="bg-rose-50 text-[#BE123C] font-semibold text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase border border-rose-100">Admin</span>
                                )}
                              </div>
                              <p className="text-slate-400 font-mono text-[10px] truncate mt-0.5 select-all">{usr.email}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`inline-flex items-center gap-1 font-bold font-mono text-[9px] uppercase px-2 py-0.5 rounded-full border ${
                                  usr.status === "approved" 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                    : usr.status === "rejected"
                                    ? "bg-rose-50 text-rose-700 border-rose-100"
                                    : "bg-amber-50 text-amber-700 border-amber-100"
                                }`}>
                                  {usr.status === "approved" && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                                  {usr.status === "rejected" && <X className="w-2.5 h-2.5 stroke-[2.5]" />}
                                  {usr.status === "pending" && <Clock className="w-2.5 h-2.5 stroke-[2.5]" />}
                                  {usr.status === "approved" ? "Goedgekeurd" : usr.status === "rejected" ? "Geweigerd" : "Wachtend"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono font-medium">Reg: {usr.provider || "email"}</span>
                              </div>
                            </div>

                            {/* Approval, block / remove controls */}
                            <div className="flex gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                              {usr.status !== "approved" && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveUser(usr.email)}
                                  className="flex-1 sm:flex-none p-1.5 px-3 bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-xl font-bold font-sans text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 border border-emerald-100 hover:border-emerald-500"
                                  title="Goedkeuren"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Keur goed
                                </button>
                              )}
                              
                              {usr.status !== "rejected" && usr.email !== "wouter.torfss@gmail.com" && (
                                <button
                                  type="button"
                                  onClick={() => handleRejectUser(usr.email)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 border border-slate-200/60 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                                  title="Weigeren"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              )}

                              {usr.email !== "wouter.torfss@gmail.com" && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(usr.email)}
                                  className="p-1.5 text-slate-350 hover:text-rose-600 hover:bg-slate-50 border border-slate-200/60 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                                  title="Volledig Verwijderen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* MODULE B: EXHAUSTIVE ADMIN LIST */}
                  <div className="space-y-4 pt-5 border-t border-slate-100">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold px-1 uppercase tracking-wider text-slate-400 font-mono">Lijst van Beheerders</h4>
                      <p className="text-[10px] text-slate-400 font-medium px-1 leading-normal">
                        Admins hebben toegang tot het hamburgerpaneel om gebruikers goed te keuren.
                      </p>
                    </div>

                    {/* Manage admins items list */}
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-150">
                      {adminList.map((adm) => (
                        <div 
                          key={adm} 
                          className="flex justify-between items-center text-xs font-semibold bg-white p-2.5 rounded-xl border border-slate-100 shadow-4xs"
                        >
                          <span className="font-mono text-slate-700 truncate mr-3 select-all">{adm}</span>
                          {adm !== "wouter.torfss@gmail.com" ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveAdmin(adm)}
                              className="text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Beheerder rol verwijderen"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-mono uppercase bg-slate-105 p-1 rounded-md px-1.5 select-none font-bold">Hoofd</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Form to add new admin */}
                    <form onSubmit={handleAddAdmin} className="space-y-3 bg-white p-4.5 rounded-2xl border border-slate-150 shadow-3xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">Nieuwe beheerder toevoegen</label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            required
                            placeholder="voorbeeld@e-mail.com"
                            value={newAdminEmailInput}
                            onChange={(e) => setNewAdminEmailInput(e.target.value)}
                            className="bg-slate-50 border border-[#CBD5E1] rounded-xl text-xs py-2 px-3.5 font-sans focus:outline-none focus:border-[#BE123C] flex-1 text-slate-800"
                          />
                          <button
                            type="submit"
                            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            Toevoegen
                          </button>
                        </div>
                        {adminMgmtError && (
                          <p className="text-[10px] text-[#BE123C] font-semibold mt-1 font-sans">{adminMgmtError}</p>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 4: Product Summary */}
              {currentTab === "summary" && serverUser?.isAdmin && (
                <div id="product-summary-tab" className="w-full">
                  <ProductOverview serverUser={serverUser} />
                </div>
              )}

            </main>

            {/* Vulling & App Vitals Footer */}
            <footer className="p-4 border-t border-slate-50 bg-white text-center text-[10px] text-slate-450 font-mono tracking-wider flex items-center justify-between px-6 shrink-0 z-20">
              <span className="font-semibold text-slate-400">{currentDate}</span>
              <span className="flex items-center gap-1 text-[#BE123C] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#BE123C] animate-ping"></span>
                {currentTime}
              </span>
            </footer>
          </>
        )}

      </div>

      {/* Real Record Confirmation Dialog Modal */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSubmit}
        inputterName={inputterName}
        inputDate={new Date().toLocaleDateString("nl-NL")}
        inputTime={new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
        products={products}
        isSubmitting={isSubmitting}
      />

    </div>
  );
}
