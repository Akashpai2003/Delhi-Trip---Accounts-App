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

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  time: string;
  accountId: AccountType;
}

interface Income {
  id: string;
  title: string;
  amount: number;
  category: IncomeCategory;
  date: string;
  accountId: AccountType;
}

interface Place {
  id: string;
  title: string;
  category: PlaceCategory;
}

// --- Constants ---
const EXPENSE_CATEGORIES: {
  name: ExpenseCategory;
  icon: any;
  color: string;
}[] = [
  { name: "Food", icon: Coffee, color: "text-orange-500 bg-orange-500/10" },
  { name: "Alcohol", icon: Wine, color: "text-purple-500 bg-purple-500/10" },
  { name: "Metro", icon: Train, color: "text-blue-500 bg-blue-500/10" },
  { name: "Auto", icon: Navigation, color: "text-yellow-500 bg-yellow-500/10" },
  { name: "Cab", icon: Car, color: "text-indigo-500 bg-indigo-500/10" },
  {
    name: "Attractions",
    icon: Ticket,
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    name: "Shopping",
    icon: ShoppingBag,
    color: "text-pink-500 bg-pink-500/10",
  },
  { name: "Misc", icon: MoreHorizontal, color: "text-zinc-500 bg-zinc-500/10" },
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

export default function App() {
  // --- App State ---
  const [appState, setAppState] = useState<"splash" | "auth" | "main">(
    "splash",
  );
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

  // Fixed Finances State (Savings)
  const [baseSavings, setBaseSavings] = useState(0);

  // Dynamic Entries State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  // UI State
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [isEditingSavings, setIsEditingSavings] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    // Splash screen timer
    const timer = setTimeout(() => {
      if (token) {
        setAppState("main");
        fetchData();
      } else {
        setAppState("auth");
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [token]);

  // --- API Calls ---
  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  const fetchData = async () => {
    try {
      const res = await fetch("/api/data", { headers: getHeaders() });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();

      if (data.finances) {
        setTotalBudget(data.finances.totalBudget || 0);
        setPlatinumTicket(data.finances.platinumTicket || 0);
        setPendingPlatinum(data.finances.pendingPlatinum || 0);
        setFlightTotal(data.finances.flightTotal || 0);
        setMyFlightShare(data.finances.myFlightShare || 0);
        setStay(data.finances.stay || 0);
        setExpectedIncoming(data.finances.expectedIncoming || 0);
        setBaseSavings(data.finances.baseSavings || 0);
      }
      if (data.expenses) setExpenses(data.expenses);
      if (data.incomes) setIncomes(data.incomes);
      if (data.places) setPlaces(data.places);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  const saveFinances = async () => {
    try {
      await fetch("/api/finances", {
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
      setAppState("main");
      fetchData();
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
  const tripEffectiveSpent =
    platinumTicket - pendingPlatinum + myFlightShare + stay + tripDynamicSpent;
  const tripTotalIncoming = expectedIncoming + tripDynamicIncome;
  const tripRemainingBalance =
    totalBudget - tripEffectiveSpent - pendingPlatinum + tripTotalIncoming;
  const safeDailySpend = Math.max(0, tripRemainingBalance / 3); // 28th to 30th = 3 days

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
          <div className="w-20 h-20 bg-indigo-500/20 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-indigo-500/30">
            <Compass className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
            WanderSync
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            Your trip, perfectly planned.
          </p>
        </motion.div>
      </div>
    );
  }

  if (appState === "auth") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-zinc-900/50 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
            <Compass className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">
            {authMode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-zinc-500 text-sm mb-8">
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
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
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
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
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
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3.5 rounded-xl font-semibold transition-colors mt-2"
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
              className="text-sm text-zinc-400 hover:text-zinc-300"
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

  const DashboardTab = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
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

      {/* Delhi Trip Finances */}
      <div className="bg-zinc-900/50 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-zinc-100">
            Delhi Trip Finances
          </h3>
          <button
            onClick={() => setIsEditingTrip(!isEditingTrip)}
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
            label="Platinum Ticket"
            value={platinumTicket}
            setter={setPlatinumTicket}
            isEditing={isEditingTrip}
          />
          <FixedItem
            label="Pending Platinum"
            value={pendingPlatinum}
            setter={setPendingPlatinum}
            isEditing={isEditingTrip}
            className="text-rose-400"
          />
          <FixedItem
            label="Flight Total"
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
            label="Stay"
            value={stay}
            setter={setStay}
            isEditing={isEditingTrip}
          />
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
            onClick={() => setIsEditingSavings(!isEditingSavings)}
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

  const FixedItem = ({
    label,
    value,
    setter,
    isEditing,
    className = "text-zinc-100",
  }: any) => (
    <div className="flex justify-between items-center">
      <span className="text-sm text-zinc-400">{label}</span>
      {isEditing ? (
        <input
          type="number"
          value={value}
          onChange={(e) => setter(Number(e.target.value))}
          className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-right text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
        />
      ) : (
        <span className={`text-sm font-medium ${className}`}>
          {formatCurrency(value)}
        </span>
      )}
    </div>
  );

  const ExpensesTab = () => {
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
      };

      try {
        await fetch("/api/expenses", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(newExp),
        });
        setExpenses([newExp, ...expenses]);
        setIsAddExpenseOpen(false);
        setNewExpTitle("");
        setNewExpAmount("");
      } catch (err) {
        console.error("Failed to add expense", err);
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
      };

      try {
        await fetch("/api/incomes", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(newInc),
        });
        setIncomes([newInc, ...incomes]);
        setIsAddIncomeOpen(false);
        setNewIncTitle("");
        setNewIncAmount("");
      } catch (err) {
        console.error("Failed to add income", err);
      }
    };

    const filteredExpenses =
      filter === "all"
        ? expenses
        : expenses.filter((e) => e.accountId === filter);
    const filteredIncomes =
      filter === "all"
        ? incomes
        : incomes.filter((i) => i.accountId === filter);

    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-24">
        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-4 rounded-3xl font-medium transition-colors border border-rose-500/20"
          >
            <ArrowUpRight className="w-5 h-5" /> Add Expense
          </button>
          <button
            onClick={() => setIsAddIncomeOpen(true)}
            className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-4 rounded-3xl font-medium transition-colors border border-emerald-500/20"
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
              {f}
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

            {filteredIncomes.map((inc) => (
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
                          {inc.accountId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {inc.category} • {inc.date}
                    </p>
                  </div>
                </div>
                <span className="text-emerald-400 font-semibold">
                  +{formatCurrency(inc.amount)}
                </span>
              </div>
            ))}

            {filteredExpenses.map((exp) => {
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
                            {exp.accountId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {exp.category} • {exp.time}
                      </p>
                    </div>
                  </div>
                  <span className="text-zinc-100 font-semibold">
                    -{formatCurrency(exp.amount)}
                  </span>
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
                    Delhi Trip
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
                  type="number"
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
                    Delhi Trip
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
                  type="number"
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

  const PlannerTab = () => {
    const [foodPct, setFoodPct] = useState(40);
    const [alcoholPct, setAlcoholPct] = useState(20);
    const [transportPct, setTransportPct] = useState(20);
    const bufferPct = 100 - foodPct - alcoholPct - transportPct;

    const [metroRides, setMetroRides] = useState(4);
    const [autoRides, setAutoRides] = useState(2);
    const [cabRides, setCabRides] = useState(1);

    const transportCost = metroRides * 40 + autoRides * 150 + cabRides * 400;

    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-24">
        {/* Smart Allocation */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-6">
            Smart Daily Allocation
          </h3>
          <div className="space-y-6">
            <AllocationSlider
              label="Food & Dining"
              pct={foodPct}
              setPct={setFoodPct}
              amount={(safeDailySpend * foodPct) / 100}
              color="bg-orange-500"
            />
            <AllocationSlider
              label="Alcohol & Nightlife"
              pct={alcoholPct}
              setPct={setAlcoholPct}
              amount={(safeDailySpend * alcoholPct) / 100}
              color="bg-purple-500"
            />
            <AllocationSlider
              label="Transport"
              pct={transportPct}
              setPct={setTransportPct}
              amount={(safeDailySpend * transportPct) / 100}
              color="bg-blue-500"
            />

            <div className="pt-4 border-t border-zinc-800/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">
                  Buffer / Misc ({bufferPct}%)
                </span>
                <span className="text-zinc-100 font-medium">
                  {formatCurrency((safeDailySpend * bufferPct) / 100)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transport Estimator */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-zinc-100">
              Transport Estimator
            </h3>
            <span className="text-indigo-400 font-semibold">
              {formatCurrency(transportCost)}/day
            </span>
          </div>
          <div className="space-y-4">
            <RideEstimator
              icon={Train}
              label="Metro (~₹40)"
              count={metroRides}
              setCount={setMetroRides}
            />
            <RideEstimator
              icon={Navigation}
              label="Auto (~₹150)"
              count={autoRides}
              setCount={setAutoRides}
            />
            <RideEstimator
              icon={Car}
              label="Cab (~₹400)"
              count={cabRides}
              setCount={setCabRides}
            />
          </div>
        </div>
      </div>
    );
  };

  const AllocationSlider = ({ label, pct, setPct, amount, color }: any) => (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-zinc-300">{label}</span>
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
        className={`w-full h-2 rounded-full appearance-none bg-zinc-800 accent-zinc-100`}
      />
    </div>
  );

  const RideEstimator = ({ icon: Icon, label, count, setCount }: any) => (
    <div className="flex items-center justify-between bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800/50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-zinc-300">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCount(Math.max(0, count - 1))}
          className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center"
        >
          -
        </button>
        <span className="w-4 text-center text-sm font-medium">{count}</span>
        <button
          onClick={() => setCount(count + 1)}
          className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );

  const ExploreTab = () => {
    const [newPlaceTitle, setNewPlaceTitle] = useState("");
    const [newPlaceCat, setNewPlaceCat] =
      useState<PlaceCategory>("Street Food");

    const handleAddPlace = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPlaceTitle) return;

      const newPlace: Place = {
        id: Date.now().toString(),
        title: newPlaceTitle,
        category: newPlaceCat,
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

    const streetFood = places.filter((p) => p.category === "Street Food");
    const casualDining = places.filter((p) => p.category === "Casual Dining");
    const premium = places.filter((p) => p.category === "Premium");
    const hotspots = places.filter((p) => p.category === "Hotspot");

    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-24">
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
            <div className="flex gap-2">
              <select
                value={newPlaceCat}
                onChange={(e) =>
                  setNewPlaceCat(e.target.value as PlaceCategory)
                }
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 appearance-none"
              >
                <option value="Street Food">Street Food (&lt;₹300)</option>
                <option value="Casual Dining">Casual Dining (&lt;₹800)</option>
                <option value="Premium">Premium (₹1500+)</option>
                <option value="Hotspot">Hotspot / Attraction</option>
              </select>
              <button
                type="submit"
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 rounded-xl font-semibold transition-colors"
              >
                Add
              </button>
            </div>
          </form>
        </div>

        {/* Food Guide */}
        <div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-orange-400" /> Food Guide
          </h3>
          <div className="space-y-3">
            <GuideCard
              title="Street Food"
              subtitle="Under ₹300"
              items={streetFood}
            />
            <GuideCard
              title="Casual Dining"
              subtitle="Under ₹800"
              items={casualDining}
            />
            <GuideCard title="Premium" subtitle="₹1500+" items={premium} />
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
            {hotspots.map((spot) => (
              <span
                key={spot.id}
                className="px-4 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-full text-sm text-zinc-300"
              >
                {spot.title}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const GuideCard = ({ title, subtitle, items }: any) => (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-zinc-100">{title}</h4>
        <span className="text-xs font-semibold text-zinc-500 bg-zinc-800 px-2 py-1 rounded-md">
          {subtitle}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">No places added yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item: Place) => (
            <li
              key={item.id}
              className="text-sm text-zinc-300 flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

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
        className="fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-[2.5rem] z-50 p-6 border-t border-zinc-800 max-w-md mx-auto"
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30 dark">
      <div className="max-w-md mx-auto min-h-screen relative flex flex-col">
        {/* Header */}
        <header className="px-6 pt-12 pb-6 flex items-center justify-between z-10 sticky top-0 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900/50">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              WanderSync
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">Welcome, {username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-zinc-800"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 pt-6 overflow-y-auto no-scrollbar">
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "expenses" && <ExpensesTab />}
          {activeTab === "planner" && <PlannerTab />}
          {activeTab === "explore" && <ExploreTab />}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-900/50 pb-safe pt-2 px-6 z-30">
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
    className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${isActive ? "text-zinc-100" : "text-zinc-600 hover:text-zinc-400"}`}
  >
    <div
      className={`relative p-1.5 rounded-xl transition-all ${isActive ? "bg-zinc-800 text-zinc-100" : "bg-transparent"}`}
    >
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-[10px] font-medium tracking-wide">{label}</span>
  </button>
);
