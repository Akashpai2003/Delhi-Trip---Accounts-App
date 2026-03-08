import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Receipt,
  Map as MapIcon,
  Compass,
  Plus,
  IndianRupee,
  Coffee,
  Wine,
  Train,
  Car,
  MapPin,
  ShoppingBag,
  Ticket,
  MoreHorizontal,
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
  Check,
  X,
  Navigation,
  Utensils,
  Wallet,
  LogOut,
  Trash2,
  Calendar,
  ChevronRight,
  RotateCcw,
  UtensilsCrossed,
  Camera,
} from "lucide-react";

// --- Types ---
type Tab = "dashboard" | "expenses" | "planner" | "explore";
type ExpenseCategory =
  | "Food"
  | "Alcohol"
  | "Metro"
  | "Auto"
  | "Cab"
  | "Attractions"
  | "Shopping"
  | "Misc";
type IncomeCategory =
  | "Freelance project"
  | "Internship stipend"
  | "Friend reimbursement"
  | "Custom source";
type AccountType = "trip" | "savings";
type PlaceCategory = "Street Food" | "Casual Dining" | "Premium" | "Hotspot";

interface Trip {
  id: string;
  name: string;
  totalBudget: number;
  platinumTicket?: number;
  pendingPlatinum?: number;
  flightTotal?: number;
  myFlightShare?: number;
  stay?: number;
  expectedIncoming?: number;
  baseSavings?: number;
  tripDynamicSpent?: number;
  tripDynamicIncome?: number;
  duration?: number;
  customCosts?: { id: string; label: string; amount: number }[];
}

interface Expense {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  time: string;
  accountId: AccountType;
}

interface Income {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  category: IncomeCategory;
  date: string;
  accountId: AccountType;
}

interface Place {
  id: string;
  trip_id: string;
  title: string;
  category: PlaceCategory;
}

interface ScheduleItem {
  id: string;
  trip_id: string;
  place_id: string;
  date: string;
  time: string;
  notes?: string;
  place_title: string;
  place_category: PlaceCategory;
}

// --- Constants ---
const EXPENSE_CATEGORIES: {
  name: ExpenseCategory;
  icon: any;
  color: string;
}[] = [
  { name: "Food", icon: Coffee, color: "text-orange-600 bg-orange-100" },
  { name: "Alcohol", icon: Wine, color: "text-purple-600 bg-purple-100" },
  { name: "Metro", icon: Train, color: "text-blue-600 bg-blue-100" },
  { name: "Auto", icon: Navigation, color: "text-yellow-600 bg-yellow-100" },
  { name: "Cab", icon: Car, color: "text-indigo-600 bg-indigo-100" },
  {
    name: "Attractions",
    icon: Ticket,
    color: "text-emerald-600 bg-emerald-100",
  },
  {
    name: "Shopping",
    icon: ShoppingBag,
    color: "text-pink-600 bg-pink-100",
  },
  { name: "Misc", icon: MoreHorizontal, color: "text-gray-600 bg-gray-100" },
];

const INCOME_CATEGORIES: IncomeCategory[] = [
  "Freelance project",
  "Internship stipend",
  "Friend reimbursement",
  "Custom source",
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const Modal = ({ children, onClose, title }: any) => (
  <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
    />
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-[2.5rem] z-50 p-6 border-t border-zinc-800 max-w-md mx-auto shadow-2xl"
    >
      <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6" />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
        <button
          onClick={onClose}
          className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </motion.div>
  </>
);

export default function App() {
  // --- App State ---
  const [appState, setAppState] = useState<"splash" | "auth" | "trip_selection" | "main">("splash");
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem("username"),
  );

  // --- Auth State ---
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // --- Trip State ---
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [newTripBudget, setNewTripBudget] = useState("");

  // --- Main State ---
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Fixed Finances State (Trip)
  const [totalBudget, setTotalBudget] = useState(0);
  const [platinumTicket, setPlatinumTicket] = useState(0);
  const [pendingPlatinum, setPendingPlatinum] = useState(0);
  const [flightTotal, setFlightTotal] = useState(0);
  const [myFlightShare, setMyFlightShare] = useState(0);
  const [stay, setStay] = useState(0);
  const [expectedIncoming, setExpectedIncoming] = useState(0);
  const [customCosts, setCustomCosts] = useState<{ id: string; label: string; amount: number }[]>([]);

  // Fixed Finances State (Savings)
  const [baseSavings, setBaseSavings] = useState(0);

  // Dynamic Entries State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  // UI State
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [isEditingSavings, setIsEditingSavings] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      // Splash screen timer
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        // Token is already in state from useState initializer, but we pass it explicitly
        const success = await fetchTrips(storedToken);
        if (!success) setAppState("auth");
      } else {
        setAppState("auth");
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (appState === "trip_selection" && token) {
      fetchTrips(token);
    }
  }, [appState, token]);

  // --- API Calls ---
  const getHeaders = (authToken = token) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  });

  const fetchTrips = async (authToken = token) => {
    try {
      const res = await fetch("/api/trips", { headers: getHeaders(authToken) });
      if (res.status === 401) {
        handleLogout();
        return false;
      }
      if (!res.ok) throw new Error("Failed to fetch trips");
      const data = await res.json();
      setTrips(data);
      setAppState("trip_selection");
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const [newTripDuration, setNewTripDuration] = useState("3");
  const [newTripDailyBudget, setNewTripDailyBudget] = useState("");

  const createTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName) return;
    try {
      const budget = newTripDailyBudget 
        ? Number(newTripDailyBudget) * Number(newTripDuration) 
        : Number(newTripBudget);

      const newTrip = {
        id: Date.now().toString(),
        name: newTripName,
        totalBudget: budget || 0,
        duration: Number(newTripDuration) || 3,
      };
      await fetch("/api/trips", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(newTrip),
      });
      // Refresh trips to get full data
      await fetchTrips();
      setIsCreatingTrip(false);
      setNewTripName("");
      setNewTripBudget("");
      setNewTripDuration("3");
      setNewTripDailyBudget("");
    } catch (err) {
      console.error(err);
    }
  };

  const selectTrip = async (trip: Trip) => {
    setCurrentTrip(trip);
    try {
      const res = await fetch(`/api/trips/${trip.id}/data`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch trip data");
      const data = await res.json();
      
      const t = data.trip;
      setTotalBudget(t.totalBudget || 0);
      setPlatinumTicket(t.platinumTicket || 0);
      setPendingPlatinum(t.pendingPlatinum || 0);
      setFlightTotal(t.flightTotal || 0);
      setMyFlightShare(t.myFlightShare || 0);
      setStay(t.stay || 0);
      setExpectedIncoming(t.expectedIncoming || 0);
      setBaseSavings(t.baseSavings || 0);
      setCustomCosts(t.customCosts || []);

      setExpenses(data.expenses || []);
      setIncomes(data.incomes || []);
      setPlaces(data.places || []);
      setSchedule(data.schedule || []);
      
      setAppState("main");
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTrip = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this trip?")) return;
    try {
      await fetch(`/api/trips/${id}`, { method: "DELETE", headers: getHeaders() });
      setTrips(trips.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const resetAllData = async () => {
    if (!window.confirm("WARNING: This will delete ALL your trips and data. This action cannot be undone. Are you sure?")) return;
    try {
      await fetch("/api/reset", { method: "POST", headers: getHeaders() });
      setTrips([]);
      setAppState("trip_selection");
    } catch (err) {
      console.error(err);
    }
  };

  const saveFinances = async () => {
    if (!currentTrip) return;
    try {
      await fetch(`/api/trips/${currentTrip.id}/finances`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          totalBudget,
          platinumTicket,
          pendingPlatinum,
          flightTotal,
          myFlightShare,
          stay,
          expectedIncoming,
          baseSavings,
          customCosts,
        }),
      });
    } catch (err) {
      console.error("Failed to save finances", err);
    }
  };

  useEffect(() => {
    if (appState === "main" && !isEditingTrip && !isEditingSavings) {
      saveFinances();
    }
  }, [isEditingTrip, isEditingSavings]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: authUsername,
          password: authPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      setToken(data.token);
      setUsername(data.username);
      
      // Fetch trips immediately with the new token
      const success = await fetchTrips(data.token);
      if (!success) throw new Error("Failed to load trips. Please try again.");
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername(null);
    setAppState("auth");
  };

  // --- Calculations ---
  const tripExpenses = expenses.filter((e) => e.accountId === "trip");
  const savingsExpenses = expenses.filter((e) => e.accountId === "savings");
  const tripIncomes = incomes.filter((i) => i.accountId === "trip");
  const savingsIncomes = incomes.filter((i) => i.accountId === "savings");

  const tripDynamicSpent = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
  const savingsDynamicSpent = savingsExpenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );

  const tripDynamicIncome = tripIncomes.reduce((sum, i) => sum + i.amount, 0);
  const savingsDynamicIncome = savingsIncomes.reduce(
    (sum, i) => sum + i.amount,
    0,
  );

  // Trip Math
  const customCostsTotal = customCosts.reduce((sum, c) => sum + c.amount, 0);
  const tripEffectiveSpent =
    customCostsTotal + tripDynamicSpent;
  const tripTotalIncoming = expectedIncoming + tripDynamicIncome;
  const tripRemainingBalance =
    totalBudget - tripEffectiveSpent + tripTotalIncoming;
  const safeDailySpend = Math.max(0, tripRemainingBalance / (currentTrip?.duration || 3));

  // Savings Math
  const totalSavingsBalance =
    baseSavings + savingsDynamicIncome - savingsDynamicSpent;

  // --- Components ---

  if (appState === "splash") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-zinc-900 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-zinc-800">
            <Compass className="w-10 h-10 text-indigo-500" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
            TripExpense
          </h1>
          <p className="text-zinc-400 mt-2 font-medium">
            Your trip, perfectly planned.
          </p>
        </motion.div>
      </div>
    );
  }

  if (appState === "auth") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
          <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 border border-zinc-700">
            <Compass className="w-6 h-6 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">
            {authMode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-zinc-400 text-sm mb-8">
            {authMode === "login"
              ? "Enter your details to access your trip."
              : "Start planning your next adventure."}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                {authError}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                Username
              </label>
              <input
                type="text"
                required
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="johndoe"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-semibold transition-colors mt-2"
            >
              {authMode === "login" ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthError("");
              }}
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              {authMode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appState === "trip_selection") {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-md mx-auto">
          <header className="flex justify-between items-center mb-8 pt-8">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Your Trips</h1>
              <p className="text-zinc-400 text-sm">Select a trip to manage</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-rose-500 shadow-sm border border-zinc-800"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </header>

          <div className="space-y-4">
            {trips.map((trip) => {
              // Calculate trip stats
              const customCostsTotal = (trip.customCosts || []).reduce(
                (sum, c) => sum + Number(c.amount),
                0,
              );
              const effectiveSpent =
                customCostsTotal + Number(trip.tripDynamicSpent || 0);
              const totalIncoming =
                Number(trip.expectedIncoming || 0) +
                Number(trip.tripDynamicIncome || 0);
              const remaining =
                Number(trip.totalBudget || 0) - effectiveSpent + totalIncoming;

              return (
                <motion.div
                  key={trip.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectTrip(trip)}
                  className="bg-zinc-900/50 p-5 rounded-2xl shadow-sm border border-zinc-800/50 flex justify-between items-center cursor-pointer group"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-100 text-lg mb-1">
                      {trip.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <p className="text-zinc-400">
                        Budget:{" "}
                        <span className="text-zinc-300">
                          {formatCurrency(trip.totalBudget)}
                        </span>
                      </p>
                      <p className="text-zinc-400">
                        Spent:{" "}
                        <span className="text-zinc-300">
                          {formatCurrency(effectiveSpent)}
                        </span>
                      </p>
                      <p className="text-zinc-400 col-span-2">
                        Remaining:{" "}
                        <span
                          className={
                            remaining < 0 ? "text-rose-400" : "text-emerald-400"
                          }
                        >
                          {formatCurrency(remaining)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-4 border-l border-zinc-800/50 ml-4">
                    <button
                      onClick={(e) => deleteTrip(trip.id, e)}
                      className="p-2 text-zinc-500 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                  </div>
                </motion.div>
              );
            })}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCreatingTrip(true)}
              className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 font-medium flex items-center justify-center gap-2 hover:border-indigo-500/50 hover:text-indigo-400 transition-colors"
            >
              <Plus className="w-5 h-5" /> Create New Trip
            </motion.button>
          </div>

          <div className="mt-12 pt-6 border-t border-zinc-800/50">
             <button
              onClick={resetAllData}
              className="w-full py-3 text-rose-500/80 text-sm font-medium flex items-center justify-center gap-2 hover:bg-rose-500/10 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Reset All Data
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isCreatingTrip && (
            <Modal title="New Trip" onClose={() => setIsCreatingTrip(false)}>
              <form onSubmit={createTrip} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                    Trip Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                    placeholder="e.g. Summer Vacation"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newTripDuration}
                      onChange={(e) => setNewTripDuration(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                      Daily Estimate
                    </label>
                    <input
                      type="number"
                      value={newTripDailyBudget}
                      onChange={(e) => setNewTripDailyBudget(e.target.value)}
                      placeholder="Optional"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                    Total Budget
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={
                        newTripDailyBudget
                          ? Number(newTripDailyBudget) * Number(newTripDuration)
                          : newTripBudget
                      }
                      onChange={(e) => {
                        setNewTripBudget(e.target.value);
                        setNewTripDailyBudget(""); // Clear daily if manual total entered
                      }}
                      placeholder="0"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-indigo-500"
                    />
                    {newTripDailyBudget && (
                      <span className="absolute right-4 top-3.5 text-xs text-zinc-500">
                        (Auto-calculated)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-semibold transition-colors"
                >
                  Create Trip
                </button>
              </form>
            </Modal>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <div className="max-w-md mx-auto min-h-screen relative flex flex-col">
        {/* Header */}
        <header className="px-6 pt-12 pb-6 flex items-center justify-between z-10 sticky top-0 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {currentTrip?.name || "TripExpense"}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">Overview</p>
          </div>
          <button
            onClick={() => setAppState("trip_selection")}
            className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Switch Trip
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 pt-6 overflow-y-auto no-scrollbar">
          {activeTab === "dashboard" && (
            <DashboardTab
              totalSavingsBalance={totalSavingsBalance}
              tripRemainingBalance={tripRemainingBalance}
              safeDailySpend={safeDailySpend}
              tripEffectiveSpent={tripEffectiveSpent}
              tripTotalIncoming={tripTotalIncoming}
              isEditingTrip={isEditingTrip}
              setIsEditingTrip={setIsEditingTrip}
              totalBudget={totalBudget}
              setTotalBudget={setTotalBudget}
              expectedIncoming={expectedIncoming}
              setExpectedIncoming={setExpectedIncoming}
              isEditingSavings={isEditingSavings}
              setIsEditingSavings={setIsEditingSavings}
              baseSavings={baseSavings}
              setBaseSavings={setBaseSavings}
              saveFinances={saveFinances}
              customCosts={customCosts}
              setCustomCosts={setCustomCosts}
            />
          )}
          {activeTab === "expenses" && (
            <ExpensesTab
              expenses={expenses}
              setExpenses={setExpenses}
              incomes={incomes}
              setIncomes={setIncomes}
              isAddExpenseOpen={isAddExpenseOpen}
              setIsAddExpenseOpen={setIsAddExpenseOpen}
              isAddIncomeOpen={isAddIncomeOpen}
              setIsAddIncomeOpen={setIsAddIncomeOpen}
              getHeaders={getHeaders}
              tripId={currentTrip?.id}
              tripName={currentTrip?.name}
            />
          )}
          {activeTab === "planner" && (
            <PlannerTab
              totalBudget={totalBudget}
              expectedIncoming={expectedIncoming}
              customCosts={customCosts}
              duration={currentTrip?.duration}
            />
          )}
          {activeTab === "explore" && (
            <ExploreTab
              places={places}
              setPlaces={setPlaces}
              schedule={schedule}
              setSchedule={setSchedule}
              getHeaders={getHeaders}
              tripId={currentTrip?.id}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/50 pb-safe pt-2 px-6 z-30">
          <div className="flex justify-between items-center pb-4">
            <NavButton
              icon={LayoutDashboard}
              label="Home"
              isActive={activeTab === "dashboard"}
              onClick={() => setActiveTab("dashboard")}
            />
            <NavButton
              icon={Receipt}
              label="Expenses"
              isActive={activeTab === "expenses"}
              onClick={() => setActiveTab("expenses")}
            />
            <NavButton
              icon={MapIcon}
              label="Planner"
              isActive={activeTab === "planner"}
              onClick={() => setActiveTab("planner")}
            />
            <NavButton
              icon={Compass}
              label="Explore"
              isActive={activeTab === "explore"}
              onClick={() => setActiveTab("explore")}
            />
          </div>
        </nav>
      </div>
    </div>
  );
}

const NavButton = ({ icon: Icon, label, isActive, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${isActive ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
  >
    <div
      className={`relative p-1.5 rounded-xl transition-all ${isActive ? "bg-indigo-500/10 text-indigo-400" : "bg-transparent"}`}
    >
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-[10px] font-medium tracking-wide">{label}</span>
  </button>
);

const FixedItem = ({
  label,
  value,
  setter,
  isEditing,
  className = "text-zinc-100",
}: any) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-zinc-500">{label}</span>
    {isEditing ? (
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => setter(Number(e.target.value))}
        className="w-24 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-right text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
      />
    ) : (
      <span className={`text-sm font-medium ${className}`}>
        {formatCurrency(value)}
      </span>
    )}
  </div>
);

const AllocationSlider = ({ label, pct, setPct, amount, color }: any) => (
  <div>
    <div className="flex justify-between text-sm mb-2">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-100 font-medium">
        {formatCurrency(amount)}
      </span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      value={pct}
      onChange={(e) => setPct(Number(e.target.value))}
      className={`w-full h-2 rounded-full appearance-none bg-zinc-800 accent-indigo-500`}
    />
  </div>
);

const RideEstimator = ({ icon: Icon, label, count, setCount }: any) => (
  <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/50 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm text-zinc-300">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      <button
        onClick={() => setCount(Math.max(0, count - 1))}
        className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-700"
      >
        -
      </button>
      <span className="w-4 text-center text-sm font-medium text-zinc-100">{count}</span>
      <button
        onClick={() => setCount(count + 1)}
        className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-700"
      >
        +
      </button>
    </div>
  </div>
);

const GuideCard = ({ icon: Icon, title, subtitle, items, suggestions, onAddSuggestion, onDelete }: any) => (
  <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 shadow-sm">
    <div className="flex justify-between items-center mb-3">
      <h4 className="font-medium text-zinc-100 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-zinc-400" />}
        {title}
      </h4>
      <span className="text-xs font-semibold text-zinc-500 bg-zinc-800 px-2 py-1 rounded-md">
        {subtitle}
      </span>
    </div>
    {items.length === 0 ? (
      <p className="text-sm text-zinc-500 italic">No places added yet.</p>
    ) : (
      <ul className="space-y-2 mb-4">
        {items.map((item: Place) => (
          <li
            key={item.id}
            className="text-sm text-zinc-400 flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              {item.title}
            </div>
            {onDelete && (
              <button
                onClick={() => onDelete(item.id)}
                className="text-zinc-600 hover:text-rose-500 transition-colors p-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
    )}
    
    {suggestions && suggestions.length > 0 && (
      <div className="mt-4 pt-4 border-t border-zinc-800/50">
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">Suggestions</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s: string) => (
            <button
              key={s}
              onClick={() => onAddSuggestion && onAddSuggestion(s)}
              className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> {s}
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);

const PlannerTab = ({
  totalBudget,
  expectedIncoming,
  customCosts,
  duration,
}: any) => {
  const [tripDays, setTripDays] = useState(duration || 3);

  // Daily Estimates
  const [dailyFood, setDailyFood] = useState(1200);
  const [dailyTransport, setDailyTransport] = useState(400);
  const [dailyMisc, setDailyMisc] = useState(500);
  const [dailyShopping, setDailyShopping] = useState(0);

  // Calculations
  const fixedCosts = customCosts.reduce(
    (sum: number, c: any) => sum + Number(c.amount),
    0,
  );
  const disposableBudget =
    Number(totalBudget || 0) +
    Number(expectedIncoming || 0) -
    fixedCosts;

  const dailyTotal = dailyFood + dailyTransport + dailyMisc + dailyShopping;
  const projectedTripCost = dailyTotal * tripDays + fixedCosts;
  const remainingBudget =
    Number(totalBudget || 0) +
    Number(expectedIncoming || 0) -
    projectedTripCost;

  const dailyLimit = disposableBudget / tripDays;
  const budgetHealth = (remainingBudget / (totalBudget || 1)) * 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-40">
      {/* Overview Card */}
      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              Budget Planner
            </h3>
            <p className="text-sm text-zinc-400">
              Plan your daily spending to stay on track.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-zinc-950 rounded-lg p-1 border border-zinc-800">
            <button
              onClick={() => setTripDays(Math.max(1, tripDays - 1))}
              className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors text-xs"
            >
              -
            </button>
            <span className="text-xs font-medium text-zinc-100 w-8 text-center">
              {tripDays}d
            </span>
            <button
              onClick={() => setTripDays(tripDays + 1)}
              className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors text-xs"
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">Projected Usage</span>
              <span
                className={`font-medium ${remainingBudget < 0 ? "text-rose-400" : "text-emerald-400"}`}
              >
                {remainingBudget < 0 ? "Over Budget" : "Within Budget"}
              </span>
            </div>
            <div className="h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, (projectedTripCost / (totalBudget || 1)) * 100)}%`,
                }}
                className={`h-full rounded-full ${remainingBudget < 0 ? "bg-rose-500" : "bg-emerald-500"}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                Disposable / Day
              </p>
              <p className="text-xl font-semibold text-zinc-100">
                {formatCurrency(dailyLimit)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                Projected Left
              </p>
              <p
                className={`text-xl font-semibold ${remainingBudget < 0 ? "text-rose-400" : "text-emerald-400"}`}
              >
                {remainingBudget > 0 ? "+" : ""}
                {formatCurrency(remainingBudget)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Allocations */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider pl-2">
          Daily Allocations
        </h3>

        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-4 space-y-4">
          <AllocationInput
            label="Food & Dining"
            icon={Coffee}
            value={dailyFood}
            setter={setDailyFood}
            color="text-orange-400"
            bgColor="bg-orange-500/10"
          />
          <AllocationInput
            label="Transport"
            icon={Car}
            value={dailyTransport}
            setter={setDailyTransport}
            color="text-blue-400"
            bgColor="bg-blue-500/10"
          />
          <AllocationInput
            label="Entertainment"
            icon={Wine}
            value={dailyMisc}
            setter={setDailyMisc}
            color="text-purple-400"
            bgColor="bg-purple-500/10"
          />
          <AllocationInput
            label="Shopping"
            icon={ShoppingBag}
            value={dailyShopping}
            setter={setDailyShopping}
            color="text-pink-400"
            bgColor="bg-pink-500/10"
          />

          <div className="pt-4 border-t border-zinc-800/50 flex justify-between items-center">
            <span className="text-sm font-medium text-zinc-300">
              Total Daily Spend
            </span>
            <span
              className={`text-lg font-bold ${dailyTotal > dailyLimit ? "text-rose-400" : "text-zinc-100"}`}
            >
              {formatCurrency(dailyTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Fixed Costs Summary */}
      <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-6">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
          Fixed Costs Breakdown
        </h3>
        <div className="space-y-3">
          {customCosts.map((cost: any) => (
            <div key={cost.id} className="flex justify-between text-sm">
              <span className="text-zinc-400">{cost.label}</span>
              <span className="text-zinc-200">
                {formatCurrency(cost.amount)}
              </span>
            </div>
          ))}
          <div className="pt-3 border-t border-zinc-800/50 flex justify-between font-medium">
            <span className="text-zinc-300">Total Fixed</span>
            <span className="text-zinc-100">{formatCurrency(fixedCosts)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AllocationInput = ({
  label,
  icon: Icon,
  value,
  setter,
  color,
  bgColor,
}: any) => (
  <div className="flex items-center gap-4">
    <div
      className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bgColor} ${color}`}
    >
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium text-zinc-200">{label}</p>
      <input
        type="range"
        min="0"
        max="5000"
        step="100"
        value={value}
        onChange={(e) => setter(Number(e.target.value))}
        className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none accent-indigo-500 mt-2"
      />
    </div>
    <div className="w-20">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => setter(Number(e.target.value))}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-right text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
      />
    </div>
  </div>
);

const ExploreTab = ({ places, setPlaces, schedule, setSchedule, getHeaders, tripId }: any) => {
  const [newPlaceTitle, setNewPlaceTitle] = useState("");
  const [newPlaceCat, setNewPlaceCat] = useState<PlaceCategory>("Street Food");

  // Schedule State
  const [schedulePlaceId, setSchedulePlaceId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");

  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceTitle) return;

    const newPlace: Place = {
      id: Date.now().toString(),
      title: newPlaceTitle,
      category: newPlaceCat,
      trip_id: tripId,
    };

    try {
      await fetch("/api/places", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(newPlace),
      });
      setPlaces([newPlace, ...places]);
      setNewPlaceTitle("");
    } catch (err) {
      console.error("Failed to add place", err);
    }
  };

  const handleDeletePlace = async (id: string) => {
    try {
      await fetch(`/api/places/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      setPlaces(places.filter((p: Place) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete place", err);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulePlaceId || !scheduleDate || !scheduleTime) return;

    const place = places.find((p: Place) => p.id === schedulePlaceId);
    if (!place) return;

    const newItem: ScheduleItem = {
      id: Date.now().toString(),
      trip_id: tripId,
      place_id: schedulePlaceId,
      date: scheduleDate,
      time: scheduleTime,
      notes: scheduleNotes,
      place_title: place.title,
      place_category: place.category,
    };

    try {
      await fetch("/api/schedule", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(newItem),
      });
      // Simple sort by date/time locally
      const newSchedule = [...schedule, newItem].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
      setSchedule(newSchedule);
      
      // Reset form
      setSchedulePlaceId("");
      setScheduleDate("");
      setScheduleTime("");
      setScheduleNotes("");
    } catch (err) {
      console.error("Failed to add schedule item", err);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await fetch(`/api/schedule/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      setSchedule(schedule.filter((s: ScheduleItem) => s.id !== id));
    } catch (err) {
      console.error("Failed to delete schedule item", err);
    }
  };

  const streetFood = places.filter((p: Place) => p.category === "Street Food");
  const casualDining = places.filter((p: Place) => p.category === "Casual Dining");
  const premium = places.filter((p: Place) => p.category === "Premium");
  const hotspots = places.filter((p: Place) => p.category === "Hotspot");

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-40">
      {/* Trip Timeline */}
      <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-6">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" /> Trip Timeline
        </h3>
        
        {/* Add Schedule Form */}
        <form onSubmit={handleAddSchedule} className="space-y-3 mb-6 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
          <div className="grid grid-cols-1 gap-3">
            <select
              value={schedulePlaceId}
              onChange={(e) => setSchedulePlaceId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 appearance-none"
              required
            >
              <option value="">Select a Place...</option>
              {places.map((p: Place) => (
                <option key={p.id} value={p.id}>{p.title} ({p.category})</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                required
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <input
              type="text"
              value={scheduleNotes}
              onChange={(e) => setScheduleNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-semibold transition-colors text-sm"
            >
              Add to Schedule
            </button>
          </div>
        </form>

        {/* Timeline View */}
        <div className="relative pl-4 border-l-2 border-zinc-800 space-y-6">
          {schedule.length === 0 && (
            <p className="text-sm text-zinc-500 italic pl-2">No schedule items added yet.</p>
          )}
          {schedule.map((item: ScheduleItem) => (
            <div key={item.id} className="relative pl-4 group">
              {/* Dot */}
              <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-zinc-950" />
              
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3 hover:border-indigo-500/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-zinc-100 text-sm">{item.place_title}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{item.date} • {item.time}</p>
                    {item.notes && <p className="text-xs text-zinc-500 mt-1 italic">"{item.notes}"</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteSchedule(item.id)}
                    className="text-zinc-600 hover:text-rose-500 transition-colors p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Location Form */}
      <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-6">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          Add Location
        </h3>
        <form onSubmit={handleAddPlace} className="space-y-3">
          <input
            type="text"
            required
            value={newPlaceTitle}
            onChange={(e) => setNewPlaceTitle(e.target.value)}
            placeholder="e.g. Chandni Chowk Parathas"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
          />
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "Street Food", label: "Street Food", icon: Coffee },
              { id: "Casual Dining", label: "Casual", icon: UtensilsCrossed },
              { id: "Premium", label: "Premium", icon: Wine },
              { id: "Hotspot", label: "Hotspot", icon: Camera },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setNewPlaceCat(cat.id as PlaceCategory)}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                  newPlaceCat === cat.id
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                <cat.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Add Location
          </button>
        </form>
      </div>

      {/* Food Guide */}
      <div>
        <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Utensils className="w-5 h-5 text-orange-400" /> Food Guide
        </h3>
        <div className="space-y-3">
          <GuideCard
            icon={Coffee}
            title="Street Food"
            subtitle="Under ₹300"
            items={streetFood}
            suggestions={[
              "Paranthe Wali Gali",
              "Natraj Dahi Bhalle",
              "Dolma Aunty Momos",
              "Karim's",
            ]}
            onAddSuggestion={(title: string) => {
              setNewPlaceTitle(title);
              setNewPlaceCat("Street Food");
            }}
            onDelete={handleDeletePlace}
          />
          <GuideCard
            icon={UtensilsCrossed}
            title="Casual Dining"
            subtitle="Under ₹800"
            items={casualDining}
            onDelete={handleDeletePlace}
          />
          <GuideCard
            icon={Wine}
            title="Premium"
            subtitle="₹1500+"
            items={premium}
            onDelete={handleDeletePlace}
          />
        </div>
      </div>

      {/* Hotspots */}
      <div>
        <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Compass className="w-5 h-5 text-emerald-400" /> Hotspots
        </h3>
        <div className="flex flex-wrap gap-2">
          {hotspots.length === 0 && (
            <p className="text-sm text-zinc-500 italic">
              No hotspots added yet.
            </p>
          )}
          {hotspots.map((spot: Place) => (
            <div
              key={spot.id}
              className="px-4 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-full text-sm text-zinc-300 flex items-center gap-2 group"
            >
              {spot.title}
              <button
                onClick={() => handleDeletePlace(spot.id)}
                className="text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ExpensesTab = ({
  expenses,
  setExpenses,
  incomes,
  setIncomes,
  isAddExpenseOpen,
  setIsAddExpenseOpen,
  isAddIncomeOpen,
  setIsAddIncomeOpen,
  getHeaders,
  tripId,
  tripName,
}: any) => {
  const [filter, setFilter] = useState<"all" | "trip" | "savings">("all");

  const [newExpTitle, setNewExpTitle] = useState("");
  const [newExpAmount, setNewExpAmount] = useState("");
  const [newExpCat, setNewExpCat] = useState<ExpenseCategory>("Food");
  const [newExpAccount, setNewExpAccount] = useState<AccountType>("trip");

  const [newIncTitle, setNewIncTitle] = useState("");
  const [newIncAmount, setNewIncAmount] = useState("");
  const [newIncCat, setNewIncCat] = useState<IncomeCategory>(
    "Friend reimbursement",
  );
  const [newIncAccount, setNewIncAccount] = useState<AccountType>("trip");

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle || !newExpAmount) return;

    const newExp: Expense = {
      id: Date.now().toString(),
      title: newExpTitle,
      amount: Number(newExpAmount),
      category: newExpCat,
      accountId: newExpAccount,
      date: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      trip_id: tripId,
    };

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(newExp),
      });
      if (!res.ok) throw new Error("Failed to save expense");
      setExpenses([newExp, ...expenses]);
      setIsAddExpenseOpen(false);
      setNewExpTitle("");
      setNewExpAmount("");
    } catch (err) {
      console.error("Failed to add expense", err);
      alert("Failed to save expense. Please try again.");
    }
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncTitle || !newIncAmount) return;

    const newInc: Income = {
      id: Date.now().toString(),
      title: newIncTitle,
      amount: Number(newIncAmount),
      category: newIncCat,
      accountId: newIncAccount,
      date: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      trip_id: tripId,
    };

    try {
      const res = await fetch("/api/incomes", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(newInc),
      });
      if (!res.ok) throw new Error("Failed to save income");
      setIncomes([newInc, ...incomes]);
      setIsAddIncomeOpen(false);
      setNewIncTitle("");
      setNewIncAmount("");
    } catch (err) {
      console.error("Failed to add income", err);
      alert("Failed to save income. Please try again.");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete expense");
      setExpenses(expenses.filter((e: Expense) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete expense", err);
      alert("Failed to delete expense. Please try again.");
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      const res = await fetch(`/api/incomes/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete income");
      setIncomes(incomes.filter((i: Income) => i.id !== id));
    } catch (err) {
      console.error("Failed to delete income", err);
      alert("Failed to delete income. Please try again.");
    }
  };

  const filteredExpenses =
    filter === "all"
      ? expenses
      : expenses.filter((e: Expense) => e.accountId === filter);
  const filteredIncomes =
    filter === "all"
      ? incomes
      : incomes.filter((i: Income) => i.accountId === filter);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 py-4 rounded-3xl font-medium transition-colors border border-rose-200"
        >
          <ArrowUpRight className="w-5 h-5" /> Add Expense
        </button>
        <button
          onClick={() => setIsAddIncomeOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 py-4 rounded-3xl font-medium transition-colors border border-emerald-200"
        >
          <ArrowDownRight className="w-5 h-5" /> Add Income
        </button>
      </div>

      {/* Filter */}
      <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800/50">
        {["all", "trip", "savings"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${filter === f ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {f === "trip" ? tripName || "Trip" : f}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 pl-2">
          Recent Activity
        </h3>
        <div className="space-y-3">
          {filteredExpenses.length === 0 && filteredIncomes.length === 0 && (
            <p className="text-zinc-500 text-center py-8 text-sm">
              No recent activity.
            </p>
          )}

          {filteredIncomes.map((inc: Income) => (
            <div
              key={inc.id}
              className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-100">
                      {inc.title}
                    </p>
                    {filter === "all" && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${inc.accountId === "trip" ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"}`}
                      >
                        {inc.accountId === "trip" ? tripName || "Trip" : inc.accountId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {inc.category} • {inc.date}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-semibold">
                  +{formatCurrency(inc.amount)}
                </span>
                <button
                  onClick={() => handleDeleteIncome(inc.id)}
                  className="p-1.5 text-zinc-600 hover:text-rose-500 transition-colors rounded-full hover:bg-rose-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredExpenses.map((exp: Expense) => {
            const cat = EXPENSE_CATEGORIES.find(
              (c) => c.name === exp.category,
            )!;
            const Icon = cat.icon;
            return (
              <div
                key={exp.id}
                className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${cat.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-100">
                        {exp.title}
                      </p>
                      {filter === "all" && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${exp.accountId === "trip" ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"}`}
                        >
                          {exp.accountId === "trip" ? tripName || "Trip" : exp.accountId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {exp.category} • {exp.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-100 font-semibold">
                    -{formatCurrency(exp.amount)}
                  </span>
                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="p-1.5 text-zinc-600 hover:text-rose-500 transition-colors rounded-full hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAddExpenseOpen && (
          <Modal
            onClose={() => setIsAddExpenseOpen(false)}
            title="New Expense"
          >
            <form onSubmit={handleAddExpense} className="space-y-4">
              {/* Account Selector */}
              <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setNewExpAccount("trip")}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${newExpAccount === "trip" ? "bg-indigo-500/20 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {tripName || "Trip"}
                </button>
                <button
                  type="button"
                  onClick={() => setNewExpAccount("savings")}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${newExpAccount === "savings" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Savings
                </button>
              </div>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={newExpAmount}
                onChange={(e) => setNewExpAmount(e.target.value)}
                placeholder="Amount (INR)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-xl font-semibold text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                required
                value={newExpTitle}
                onChange={(e) => setNewExpTitle(e.target.value)}
                placeholder="What was this for?"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-zinc-100 focus:outline-none focus:border-indigo-500"
              />

              <div className="grid grid-cols-4 gap-2">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setNewExpCat(cat.name)}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-colors ${newExpCat === cat.name ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900"}`}
                  >
                    <cat.icon className="w-5 h-5" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="w-full bg-zinc-100 text-zinc-900 py-4 rounded-2xl font-semibold mt-2"
              >
                Save Expense
              </button>
            </form>
          </Modal>
        )}

        {isAddIncomeOpen && (
          <Modal onClose={() => setIsAddIncomeOpen(false)} title="New Income">
            <form onSubmit={handleAddIncome} className="space-y-4">
              {/* Account Selector */}
              <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setNewIncAccount("trip")}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${newIncAccount === "trip" ? "bg-indigo-500/20 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {tripName || "Trip"}
                </button>
                <button
                  type="button"
                  onClick={() => setNewIncAccount("savings")}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${newIncAccount === "savings" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Savings
                </button>
              </div>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={newIncAmount}
                onChange={(e) => setNewIncAmount(e.target.value)}
                placeholder="Amount (INR)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-xl font-semibold text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                required
                value={newIncTitle}
                onChange={(e) => setNewIncTitle(e.target.value)}
                placeholder="Source description"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
              <select
                value={newIncCat}
                onChange={(e) =>
                  setNewIncCat(e.target.value as IncomeCategory)
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-zinc-100 focus:outline-none focus:border-emerald-500 appearance-none"
              >
                {INCOME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full bg-emerald-500 text-zinc-950 py-4 rounded-2xl font-semibold mt-2"
              >
                Save Income
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

const DashboardTab = ({
  totalSavingsBalance,
  tripRemainingBalance,
  safeDailySpend,
  tripEffectiveSpent,
  tripTotalIncoming,
  isEditingTrip,
  setIsEditingTrip,
  totalBudget,
  setTotalBudget,
  platinumTicket,
  setPlatinumTicket,
  pendingPlatinum,
  setPendingPlatinum,
  flightTotal,
  setFlightTotal,
  myFlightShare,
  setMyFlightShare,
  stay,
  setStay,
  expectedIncoming,
  setExpectedIncoming,
  isEditingSavings,
  setIsEditingSavings,
  baseSavings,
  setBaseSavings,
  saveFinances,
  customCosts = [],
  setCustomCosts,
  tripName,
}: any) => (
  <div className="space-y-6 animate-in fade-in duration-500 pb-40">
    {/* Savings Overview */}
    <div className="bg-zinc-900/50 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-5 shadow-lg flex justify-between items-center">
      <div>
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">
          Total Savings
        </p>
        <h2 className="text-2xl font-semibold text-emerald-400">
          {formatCurrency(totalSavingsBalance)}
        </h2>
      </div>
      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
        <Wallet className="w-5 h-5 text-emerald-400" />
      </div>
    </div>

    {/* Trip Overview */}
    <div className="bg-zinc-900/50 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-6 shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-zinc-400 text-sm font-medium mb-1">
            Trip Balance
          </p>
          <h2 className="text-4xl font-semibold text-zinc-50 tracking-tight">
            {formatCurrency(tripRemainingBalance)}
          </h2>
        </div>
        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-indigo-400" />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded-lg font-medium">
          {formatCurrency(safeDailySpend)} / day
        </span>
        <span className="text-zinc-500">safe spend</span>
      </div>
    </div>

    {/* Trip Stats */}
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-zinc-900/50 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-5 shadow-lg">
        <div className="flex items-center gap-2 text-zinc-400 mb-2">
          <ArrowUpRight className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Trip Spent
          </span>
        </div>
        <p className="text-xl font-semibold text-zinc-100">
          {formatCurrency(tripEffectiveSpent)}
        </p>
      </div>

      <div className="bg-zinc-900/50 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-5 shadow-lg">
        <div className="flex items-center gap-2 text-zinc-400 mb-2">
          <ArrowDownRight className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Trip In
          </span>
        </div>
        <p className="text-xl font-semibold text-zinc-100">
          {formatCurrency(tripTotalIncoming)}
        </p>
      </div>
    </div>

    {/* Trip Finances */}
    <div className="bg-zinc-900/50 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-zinc-100">
          {tripName || "Trip"} Finances
        </h3>
        <button
          onClick={() => {
            if (isEditingTrip) saveFinances();
            setIsEditingTrip(!isEditingTrip);
          }}
          className="p-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
        >
          {isEditingTrip ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Edit2 className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="space-y-4">
        <FixedItem
          label="Total Budget"
          value={totalBudget}
          setter={setTotalBudget}
          isEditing={isEditingTrip}
        />
        <div className="h-px bg-zinc-800/50 my-2" />
        <FixedItem
          label="Ticket Cost"
          value={platinumTicket}
          setter={setPlatinumTicket}
          isEditing={isEditingTrip}
        />
        <FixedItem
          label="Pending Ticket Cost"
          value={pendingPlatinum}
          setter={setPendingPlatinum}
          isEditing={isEditingTrip}
          className="text-rose-400"
        />
        <FixedItem
          label="Flight Cost"
          value={flightTotal}
          setter={setFlightTotal}
          isEditing={isEditingTrip}
        />
        <FixedItem
          label="My Flight Share"
          value={myFlightShare}
          setter={setMyFlightShare}
          isEditing={isEditingTrip}
        />
        <FixedItem
          label="Stay Cost"
          value={stay}
          setter={setStay}
          isEditing={isEditingTrip}
        />

        {/* Custom Costs */}
        {customCosts.map((cost: any, index: number) => (
          <div key={cost.id} className="flex justify-between items-center">
            {isEditingTrip ? (
              <div className="flex gap-2 w-full items-center">
                <input
                  type="text"
                  value={cost.label}
                  onChange={(e) => {
                    const newCosts = [...customCosts];
                    newCosts[index].label = e.target.value;
                    setCustomCosts(newCosts);
                  }}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                  placeholder="Label"
                />
                <input
                  type="number"
                  value={cost.amount}
                  onChange={(e) => {
                    const newCosts = [...customCosts];
                    newCosts[index].amount = Number(e.target.value);
                    setCustomCosts(newCosts);
                  }}
                  className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-right text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                  placeholder="0"
                />
                <button
                  onClick={() => {
                    const newCosts = customCosts.filter(
                      (_: any, i: number) => i !== index,
                    );
                    setCustomCosts(newCosts);
                  }}
                  className="p-1 text-zinc-500 hover:text-rose-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm text-zinc-500">{cost.label}</span>
                <span className="text-sm font-medium text-zinc-100">
                  {formatCurrency(cost.amount)}
                </span>
              </>
            )}
          </div>
        ))}

        {isEditingTrip && (
          <button
            onClick={() =>
              setCustomCosts([
                ...customCosts,
                { id: Date.now().toString(), label: "New Cost", amount: 0 },
              ])
            }
            className="w-full py-2 border border-dashed border-zinc-700 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            + Add Fixed Cost
          </button>
        )}

        <div className="h-px bg-zinc-800/50 my-2" />
        <FixedItem
          label="Expected Incoming"
          value={expectedIncoming}
          setter={setExpectedIncoming}
          isEditing={isEditingTrip}
          className="text-emerald-400"
        />
      </div>
    </div>

    {/* Savings Finances */}
    <div className="bg-zinc-900/50 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-zinc-100">
          Savings Finances
        </h3>
        <button
          onClick={() => {
            if (isEditingSavings) saveFinances();
            setIsEditingSavings(!isEditingSavings);
          }}
          className="p-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
        >
          {isEditingSavings ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Edit2 className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="space-y-4">
        <FixedItem
          label="Base Savings"
          value={baseSavings}
          setter={setBaseSavings}
          isEditing={isEditingSavings}
          className="text-emerald-400"
        />
      </div>
    </div>
  </div>
);
