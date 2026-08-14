"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Vendor = "Amazon" | "Flipkart" | "Local dealer" | "Other";

type ModelVariant = {
  model: string;
  price: number;
  link: string;
};

type MachineRow = {
  id: string;
  machineType: string;
  machineModel: string;
  altMachineModel: string;
  altMachineModelPrice: number;
  modelVariants: ModelVariant[];
  qty: number;
  priority: "critical" | "important" | "optional";
  platform: Vendor;
  location: string;
  price1: number;
  price2: number;
  price3: number;
  chosenPrice: number;
  productUrl: string;
  imageUrl: string;
  notes: string;
};

type FormState = {
  machineType: string;
  machineTypeOther: string;
  machineModel: string;
  altMachineModel: string;
  altMachineModelPrice: string;
  modelVariants: Array<{ model: string; price: string; link: string }>;
  qty: string;
  priority: "critical" | "important" | "optional";
  platform: Vendor;
  location: string;
  price1: string;
  price2: string;
  price3: string;
  chosenPrice: string;
  productUrl: string;
  imageUrl: string;
  notes: string;
};

type ReportMeta = {
  projectTitle: string;
  workshopName: string;
  ownerName: string;
  location: string;
  bankName: string;
  branch: string;
  accountPurpose: string;
  reportDate: string;
  requestedLoanInr: string;
  ownContributionInr: string;
  expectedMonthlyRevenueInr: string;
  expectedMonthlyOperatingCostInr: string;
  repaymentMonths: string;
  annualInterestRate: string;
  bankTemplate: "standard" | "sbi" | "hdfc" | "icici" | "nbfc";
  currentJobsPerMonth: string;
  projectedJobsPerMonth: string;
  avgTicketSizeInr: string;
  projectedRevenueGrowthPct: string;
  projectedCostGrowthPct: string;
  signatoryName: string;
  remarks: string;
};

type UiTheme = "professional" | "midnight" | "teal";
type WorkspaceMode = "builder" | "analysis" | "board";
type ProjectDraft = {
  id: string;
  name: string;
  meta: ReportMeta;
  form: FormState;
  rows: MachineRow[];
  uiTheme: UiTheme;
  showOnlyWithLinks: boolean;
  compactMachineRows: boolean;
  presentationMode: boolean;
  workspaceMode: WorkspaceMode;
  scenario: { capexShockPct: number; revenueShockPct: number; costShockPct: number };
};

const emptyForm: FormState = {
  machineType: "",
  machineTypeOther: "",
  machineModel: "",
  altMachineModel: "",
  altMachineModelPrice: "",
  modelVariants: [
    { model: "", price: "", link: "" },
    { model: "", price: "", link: "" },
  ],
  qty: "1",
  priority: "critical",
  platform: "Amazon",
  location: "",
  price1: "",
  price2: "",
  price3: "",
  chosenPrice: "",
  productUrl: "",
  imageUrl: "",
  notes: "",
};

const defaultMeta: ReportMeta = {
  projectTitle: "Service Center Modernization Project",
  workshopName: "",
  ownerName: "",
  location: "",
  bankName: "",
  branch: "",
  accountPurpose: "Machinery purchase and workshop capacity enhancement",
  reportDate: new Date().toISOString().slice(0, 10),
  requestedLoanInr: "",
  ownContributionInr: "",
  expectedMonthlyRevenueInr: "",
  expectedMonthlyOperatingCostInr: "",
  repaymentMonths: "36",
  annualInterestRate: "12",
  bankTemplate: "standard",
  currentJobsPerMonth: "",
  projectedJobsPerMonth: "",
  avgTicketSizeInr: "",
  projectedRevenueGrowthPct: "12",
  projectedCostGrowthPct: "8",
  signatoryName: "",
  remarks: "",
};

const STORAGE_KEY = "adminProjectReportDraftV1";
const PROJECT_STORAGE_KEY = "adminProjectReportProjectsV1";
const LAST_PROJECT_KEY = "adminProjectReportLastProjectIdV1";

const MACHINE_TYPE_OPTIONS = [
  "AC recovery machine",
  "Air compressor",
  "Alignment machine",
  "Alternator tester",
  "Battery analyzer",
  "Battery charger",
  "Brake lathe machine",
  "Car diagnostic scanner",
  "Car washer pressure pump",
  "Coolant flushing machine",
  "Dent puller machine",
  "Engine analyzer",
  "Foam wash machine",
  "Fuel injector cleaning machine",
  "Hydraulic lift",
  "Nitrogen tyre inflator",
  "OBD scanner",
  "Oil extractor machine",
  "Paint booth machine",
  "Polisher machine",
  "Steam cleaner machine",
  "Tyre changer machine",
  "Tyre inflator",
  "Wheel balancer machine",
  "Wheel alignment lift",
  "Welding machine",
  "Other",
].sort((a, b) => a.localeCompare(b));

function toInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );
}

function toNumber(raw: string) {
  const val = Number(raw);
  return Number.isFinite(val) && val >= 0 ? val : 0;
}

function extractAmazonAsin(url: string) {
  const m = url.match(/(?:\/dp\/|\/gp\/product\/|\/product\/)([A-Z0-9]{10})/i);
  return m?.[1]?.toUpperCase() || "";
}

function autoImageFromLink(platform: Vendor, productUrl: string) {
  const url = productUrl.trim();
  if (!url) return "";
  if (platform === "Amazon") {
    const asin = extractAmazonAsin(url);
    if (asin) {
      return `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL300_&ID=AsinImage&MarketPlace=IN&ServiceVersion=20070822&WS=1`;
    }
  }
  return "";
}

function rowAverage(r: MachineRow) {
  const nums = [r.price1, r.price2, r.price3].filter((v) => v > 0);
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function rowMin(r: MachineRow) {
  const nums = [r.price1, r.price2, r.price3].filter((v) => v > 0);
  if (!nums.length) return 0;
  return Math.min(...nums);
}

function rowMax(r: MachineRow) {
  const nums = [r.price1, r.price2, r.price3].filter((v) => v > 0);
  if (!nums.length) return 0;
  return Math.max(...nums);
}

function modeVariant(
  r: MachineRow,
  mode: "lowest" | "highest"
): { model: string; price: number; link: string } {
  const variants = Array.isArray(r.modelVariants)
    ? r.modelVariants.filter((mv) => String(mv.model || "").trim() && Number(mv.price) > 0)
    : [];
  if (variants.length > 0) {
    const picked = variants.reduce((best, curr) =>
      mode === "lowest" ? (curr.price < best.price ? curr : best) : curr.price > best.price ? curr : best
    );
    return { model: picked.model, price: picked.price, link: picked.link || "" };
  }
  const fallbackPrice = mode === "lowest" ? rowMin(r) : rowMax(r);
  return {
    model: String(r.machineModel || "").trim() || r.machineType,
    price: fallbackPrice,
    link: String(r.productUrl || "").trim(),
  };
}

function csvLines(lines: string[][]) {
  return lines.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function toMachineCsv(rows: MachineRow[]) {
  const head = [
    "Machine type",
    "Model",
    "Alt model",
    "Alt model price",
    "Model options detail",
    "Qty",
    "Priority",
    "Platform",
    "Location",
    "Price 1",
    "Price 2",
    "Price 3",
    "Lowest",
    "Highest",
    "Gap",
    "Average",
    "Chosen Price",
    "Chosen Total",
    "Notes",
  ];
  const body = rows.map((r) => [
    r.machineType,
    r.machineModel,
    r.altMachineModel,
    String(r.altMachineModelPrice || 0),
    (r.modelVariants || []).map((mv) => `${mv.model}:${mv.price}:${mv.link || ""}`).join(" | "),
    String(r.qty),
    r.priority,
    r.platform,
    r.location,
    String(r.price1),
    String(r.price2),
    String(r.price3),
    String(Math.round(rowMin(r))),
    String(Math.round(rowMax(r))),
    String(Math.round(Math.max(0, rowMax(r) - rowMin(r)))),
    String(Math.round(rowAverage(r))),
    String(r.chosenPrice),
    String(r.chosenPrice * r.qty),
    r.notes.replace(/\r?\n/g, " "),
  ]);
  return csvLines([head, ...body]);
}

export default function AdminProjectReportPage() {
  const [projects, setProjects] = useState<ProjectDraft[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [newProjectName, setNewProjectName] = useState("");
  const [meta, setMeta] = useState<ReportMeta>(defaultMeta);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [rows, setRows] = useState<MachineRow[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [machineListView, setMachineListView] = useState<"all" | "lowest" | "highest">("all");
  const [machineSearch, setMachineSearch] = useState("");
  const [machinePriorityFilter, setMachinePriorityFilter] = useState<"all" | MachineRow["priority"]>("all");
  const [machineSortBy, setMachineSortBy] = useState<"chosen" | "lowest" | "highest" | "gap">("chosen");
  const [uiTheme, setUiTheme] = useState<UiTheme>("professional");
  const [showOnlyWithLinks, setShowOnlyWithLinks] = useState(false);
  const [compactMachineRows, setCompactMachineRows] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("builder");
  const [scenario, setScenario] = useState({
    capexShockPct: 0,
    revenueShockPct: 0,
    costShockPct: 0,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const addMachineSectionRef = useRef<HTMLElement | null>(null);
  const machineListSectionRef = useRef<HTMLElement | null>(null);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const snapshotCurrent = useMemo(
    () => ({
      meta,
      form,
      rows,
      uiTheme,
      showOnlyWithLinks,
      compactMachineRows,
      presentationMode,
      workspaceMode,
      scenario,
    }),
    [meta, form, rows, uiTheme, showOnlyWithLinks, compactMachineRows, presentationMode, workspaceMode, scenario]
  );

  function buildProjectDraft(name: string): ProjectDraft {
    return {
      id: crypto.randomUUID(),
      name: name.trim() || `Project ${new Date().toLocaleDateString()}`,
      meta: { ...defaultMeta, projectTitle: name.trim() || defaultMeta.projectTitle },
      form: { ...emptyForm },
      rows: [],
      uiTheme: "professional",
      showOnlyWithLinks: false,
      compactMachineRows: false,
      presentationMode: false,
      workspaceMode: "builder",
      scenario: { capexShockPct: 0, revenueShockPct: 0, costShockPct: 0 },
    };
  }

  function hydrateFromProject(project: ProjectDraft) {
    setMeta({ ...defaultMeta, ...project.meta });
    setForm({ ...emptyForm, ...project.form });
    setRows(Array.isArray(project.rows) ? project.rows : []);
    setUiTheme(project.uiTheme || "professional");
    setShowOnlyWithLinks(Boolean(project.showOnlyWithLinks));
    setCompactMachineRows(Boolean(project.compactMachineRows));
    setPresentationMode(Boolean(project.presentationMode));
    setWorkspaceMode(project.workspaceMode || "builder");
    setScenario(project.scenario || { capexShockPct: 0, revenueShockPct: 0, costShockPct: 0 });
  }

  useEffect(() => {
    try {
      const projectsRaw = localStorage.getItem(PROJECT_STORAGE_KEY);
      if (projectsRaw) {
        const parsedProjects = JSON.parse(projectsRaw) as ProjectDraft[];
        if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
          setProjects(parsedProjects);
          const lastId = localStorage.getItem(LAST_PROJECT_KEY);
          const initial = parsedProjects.find((p) => p.id === lastId) || parsedProjects[0];
          setActiveProjectId(initial.id);
          hydrateFromProject(initial);
          return;
        }
      }
      const legacyRaw = localStorage.getItem(STORAGE_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw) as Partial<ProjectDraft>;
        const migrated: ProjectDraft = {
          ...buildProjectDraft(parsed?.meta?.projectTitle || "Project 1"),
          id: crypto.randomUUID(),
          name: parsed?.meta?.projectTitle || "Project 1",
          meta: { ...defaultMeta, ...(parsed.meta || {}) },
          form: { ...emptyForm, ...(parsed.form || {}) },
          rows: Array.isArray(parsed.rows) ? parsed.rows : [],
          uiTheme: parsed.uiTheme || "professional",
          showOnlyWithLinks: Boolean(parsed.showOnlyWithLinks),
          compactMachineRows: Boolean(parsed.compactMachineRows),
          presentationMode: Boolean(parsed.presentationMode),
          workspaceMode: parsed.workspaceMode || "builder",
          scenario: parsed.scenario || { capexShockPct: 0, revenueShockPct: 0, costShockPct: 0 },
        };
        setProjects([migrated]);
        setActiveProjectId(migrated.id);
        hydrateFromProject(migrated);
      } else {
        const starter = buildProjectDraft("Project 1");
        setProjects([starter]);
        setActiveProjectId(starter.id);
        hydrateFromProject(starter);
      }
    } catch {
      // ignore corrupt draft
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !activeProjectId) return;
    setProjects((prev) => {
      let changed = false;
      const next = prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const same =
          JSON.stringify({
            meta: p.meta,
            form: p.form,
            rows: p.rows,
            uiTheme: p.uiTheme,
            showOnlyWithLinks: p.showOnlyWithLinks,
            compactMachineRows: p.compactMachineRows,
            presentationMode: p.presentationMode,
            workspaceMode: p.workspaceMode,
            scenario: p.scenario,
          }) === JSON.stringify(snapshotCurrent);
        if (same) return p;
        changed = true;
        return { ...p, ...snapshotCurrent };
      });
      if (changed) {
        localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(next));
      }
      return changed ? next : prev;
    });
    localStorage.setItem(LAST_PROJECT_KEY, activeProjectId);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...snapshotCurrent,
      })
    );
  }, [snapshotCurrent, hydrated, activeProjectId]);

  const createProject = () => {
    const next = buildProjectDraft(newProjectName || `Project ${projects.length + 1}`);
    const merged = [next, ...projects];
    setProjects(merged);
    setActiveProjectId(next.id);
    hydrateFromProject(next);
    setNewProjectName("");
    setMsg("New project created.");
  };

  const switchProject = (projectId: string) => {
    const selected = projects.find((p) => p.id === projectId);
    if (!selected) return;
    setActiveProjectId(projectId);
    hydrateFromProject(selected);
    setMsg(`Switched to ${selected.name}.`);
  };

  const renameProject = (name: string) => {
    if (!activeProjectId) return;
    const clean = name.trim() || "Untitled project";
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId ? { ...p, name: clean, meta: { ...p.meta, projectTitle: clean } } : p
      )
    );
    setMeta((m) => ({ ...m, projectTitle: clean }));
  };

  const duplicateProject = () => {
    if (!activeProject) return;
    const copy: ProjectDraft = {
      ...activeProject,
      id: crypto.randomUUID(),
      name: `${activeProject.name} (copy)`,
      meta: { ...activeProject.meta, projectTitle: `${activeProject.meta.projectTitle} (copy)` },
    };
    setProjects((prev) => [copy, ...prev]);
    setActiveProjectId(copy.id);
    hydrateFromProject(copy);
    setMsg("Project duplicated.");
  };

  const deleteProject = () => {
    if (!activeProjectId || projects.length <= 1) {
      setMsg("At least one project must remain.");
      return;
    }
    const remaining = projects.filter((p) => p.id !== activeProjectId);
    const next = remaining[0];
    setProjects(remaining);
    setActiveProjectId(next.id);
    hydrateFromProject(next);
    setMsg("Project deleted.");
  };

  const totals = useMemo(() => {
    const machineCount = rows.length;
    const totalUnits = rows.reduce((sum, r) => sum + r.qty, 0);
    const totalChosen = rows.reduce((sum, r) => sum + r.chosenPrice * r.qty, 0);
    const totalLowest = rows.reduce((sum, r) => sum + rowMin(r) * r.qty, 0);
    const totalHighest = rows.reduce((sum, r) => sum + rowMax(r) * r.qty, 0);
    const potentialSavings = Math.max(0, totalChosen - totalLowest);
    const priceSpread = Math.max(0, totalHighest - totalLowest);
    return { machineCount, totalUnits, totalChosen, totalLowest, totalHighest, potentialSavings, priceSpread };
  }, [rows]);

  const rankedRows = useMemo(() => {
    const valueForSort = (r: MachineRow) => {
      if (machineSortBy === "lowest") return rowMin(r) * r.qty;
      if (machineSortBy === "highest") return rowMax(r) * r.qty;
      if (machineSortBy === "gap") return Math.max(0, rowMax(r) - rowMin(r)) * r.qty;
      if (machineListView === "lowest") return rowMin(r) * r.qty;
      if (machineListView === "highest") return rowMax(r) * r.qty;
      return r.chosenPrice * r.qty;
    };
    return [...rows].sort((a, b) => valueForSort(b) - valueForSort(a));
  }, [rows, machineListView, machineSortBy]);

  const visibleMachineRows = useMemo(() => {
    const query = machineSearch.trim().toLowerCase();
    return rankedRows.filter((r) => {
      const matchesPriority = machinePriorityFilter === "all" || r.priority === machinePriorityFilter;
      const hasLink = !!(r.productUrl || (r.modelVariants || []).some((mv) => mv.link));
      const matchesLinkFilter = !showOnlyWithLinks || hasLink;
      const haystack = [
        r.machineType,
        r.platform,
        r.location,
        r.machineModel,
        ...(r.modelVariants || []).map((mv) => `${mv.model} ${mv.link || ""}`),
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesPriority && matchesQuery && matchesLinkFilter;
    });
  }, [rankedRows, machinePriorityFilter, machineSearch, showOnlyWithLinks]);

  const visibleMachineTotal = useMemo(() => {
    return visibleMachineRows.reduce((sum, r) => {
      if (machineListView === "highest") return sum + rowMax(r) * r.qty;
      if (machineListView === "lowest") return sum + rowMin(r) * r.qty;
      return sum + r.chosenPrice * r.qty;
    }, 0);
  }, [visibleMachineRows, machineListView]);

  const machineInsights = useMemo(() => {
    if (!rows.length) return { bestRow: null as MachineRow | null, bestSaving: 0, avgSpread: 0 };
    let bestRow: MachineRow | null = null;
    let bestSaving = 0;
    let spreadSum = 0;
    for (const r of rows) {
      const spread = Math.max(0, rowMax(r) - rowMin(r));
      spreadSum += spread;
      const rowSaving = spread * Math.max(1, r.qty || 1);
      if (rowSaving > bestSaving) {
        bestSaving = rowSaving;
        bestRow = r;
      }
    }
    return {
      bestRow,
      bestSaving,
      avgSpread: spreadSum / rows.length,
    };
  }, [rows]);

  const themeClass = useMemo(() => {
    if (uiTheme === "midnight") {
      return {
        page: "from-slate-950 to-zinc-950",
        panel: "border-slate-700/80 bg-slate-900/70",
        header: "from-slate-900 to-zinc-900",
      };
    }
    if (uiTheme === "teal") {
      return {
        page: "from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20",
        panel: "border-teal-200/70 bg-white/90 dark:border-teal-900/50 dark:bg-zinc-900/70",
        header: "from-teal-50 to-cyan-50 dark:from-teal-950/25 dark:to-cyan-950/20",
      };
    }
    return {
      page: "from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-950",
      panel: "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/70",
      header: "from-white to-zinc-50 dark:from-zinc-900/90 dark:to-zinc-900/70",
    };
  }, [uiTheme]);

  const finance = useMemo(() => {
    const requestedLoan = toNumber(meta.requestedLoanInr);
    const ownContribution = toNumber(meta.ownContributionInr);
    const totalProjectCost = totals.totalChosen;
    const monthlyRevenue = toNumber(meta.expectedMonthlyRevenueInr);
    const monthlyCost = toNumber(meta.expectedMonthlyOperatingCostInr);
    const monthlySurplus = Math.max(0, monthlyRevenue - monthlyCost);
    const repaymentMonths = Math.max(1, Math.round(toNumber(meta.repaymentMonths) || 1));
    const annualRatePct = toNumber(meta.annualInterestRate);
    const monthlyRate = annualRatePct > 0 ? annualRatePct / 12 / 100 : 0;
    const emi =
      requestedLoan > 0
        ? monthlyRate > 0
          ? (requestedLoan * monthlyRate * Math.pow(1 + monthlyRate, repaymentMonths)) /
            (Math.pow(1 + monthlyRate, repaymentMonths) - 1)
          : requestedLoan / repaymentMonths
        : 0;
    const dscrLike = emi > 0 ? monthlySurplus / emi : 0;
    const fundingGap = Math.max(0, totalProjectCost - (requestedLoan + ownContribution));
    const currentJobs = toNumber(meta.currentJobsPerMonth);
    const projectedJobs = toNumber(meta.projectedJobsPerMonth);
    const avgTicket = toNumber(meta.avgTicketSizeInr);
    const projectedRevenueByCapacity = projectedJobs * avgTicket;
    const currentRevenueByCapacity = currentJobs * avgTicket;
    const upliftRevenue = Math.max(0, projectedRevenueByCapacity - currentRevenueByCapacity);
    return {
      requestedLoan,
      ownContribution,
      totalProjectCost,
      monthlyRevenue,
      monthlyCost,
      monthlySurplus,
      repaymentMonths,
      emi,
      dscrLike,
      fundingGap,
      annualRatePct,
      currentJobs,
      projectedJobs,
      avgTicket,
      projectedRevenueByCapacity,
      currentRevenueByCapacity,
      upliftRevenue,
    };
  }, [meta, totals.totalChosen]);

  const fundingUi = useMemo(() => {
    const totalFund = finance.requestedLoan + finance.ownContribution;
    const coveragePct = finance.totalProjectCost > 0 ? Math.min(200, (totalFund / finance.totalProjectCost) * 100) : 0;
    const emiLoadPct = finance.monthlyRevenue > 0 ? Math.min(100, (finance.emi / finance.monthlyRevenue) * 100) : 0;
    const surplusMarginPct = finance.monthlyRevenue > 0 ? Math.max(0, (finance.monthlySurplus / finance.monthlyRevenue) * 100) : 0;
    return {
      coveragePct,
      emiLoadPct,
      surplusMarginPct,
      totalFund,
    };
  }, [finance]);

  const scenarioFinance = useMemo(() => {
    const capexMultiplier = 1 + scenario.capexShockPct / 100;
    const revenueMultiplier = 1 + scenario.revenueShockPct / 100;
    const costMultiplier = 1 + scenario.costShockPct / 100;
    const stressedCapex = Math.max(0, totals.totalChosen * capexMultiplier);
    const stressedRevenue = Math.max(0, finance.monthlyRevenue * revenueMultiplier);
    const stressedCost = Math.max(0, finance.monthlyCost * costMultiplier);
    const stressedSurplus = Math.max(0, stressedRevenue - stressedCost);
    const stressedFundingGap = Math.max(0, stressedCapex - (finance.requestedLoan + finance.ownContribution));
    const stressedDscr = finance.emi > 0 ? stressedSurplus / finance.emi : 0;
    return {
      stressedCapex,
      stressedRevenue,
      stressedCost,
      stressedSurplus,
      stressedFundingGap,
      stressedDscr,
      riskLevel: stressedDscr >= 1.3 ? "Low" : stressedDscr >= 1 ? "Medium" : "High",
    };
  }, [scenario, totals.totalChosen, finance]);

  const procurementIntel = useMemo(() => {
    const ranked = [...rows]
      .map((r) => ({
        id: r.id,
        machineType: r.machineType,
        total: r.chosenPrice * r.qty,
        spreadTotal: Math.max(0, rowMax(r) - rowMin(r)) * r.qty,
        priority: r.priority,
      }))
      .sort((a, b) => b.total - a.total);
    const concentrationTop3 = ranked.length
      ? (ranked.slice(0, 3).reduce((sum, r) => sum + r.total, 0) / Math.max(1, totals.totalChosen)) * 100
      : 0;
    const highSpreadCount = ranked.filter((r) => r.spreadTotal > 0).length;
    return {
      topRows: ranked.slice(0, 5),
      concentrationTop3,
      highSpreadCount,
    };
  }, [rows, totals.totalChosen]);

  const modeDetailRows = useMemo(() => {
    if (machineListView === "all") return [];
    return visibleMachineRows.map((r) => {
      const selected = modeVariant(r, machineListView);
      return {
        id: r.id,
        machineType: r.machineType,
        qty: r.qty,
        model: selected.model,
        unit: selected.price,
        total: selected.price * r.qty,
        link: selected.link,
      };
    });
  }, [visibleMachineRows, machineListView]);

  const executiveSummary = useMemo(() => {
    const topPriority = rows.filter((r) => r.priority === "critical").length;
    return `This report requests ${toInr(finance.requestedLoan)} for upgrading ${
      meta.workshopName || "the service center"
    } with ${totals.totalUnits} machine units across ${totals.machineCount} line items (${topPriority} critical). ` +
      `Total selected CAPEX is ${toInr(totals.totalChosen)} with potential sourcing savings of ${toInr(
        totals.potentialSavings
      )}. ` +
      `Expected monthly surplus is ${toInr(finance.monthlySurplus)} and estimated EMI at ${
        finance.annualRatePct
      }% for ${finance.repaymentMonths} months is ${toInr(finance.emi)} (coverage ${finance.dscrLike.toFixed(2)}).`;
  }, [finance, meta.workshopName, totals, rows]);

  const formVariantSummary = useMemo(() => {
    const variants = form.modelVariants
      .map((mv) => ({ model: String(mv.model || "").trim(), price: toNumber(String(mv.price || "")) }))
      .filter((mv) => mv.model && mv.price > 0);
    const qty = Math.max(1, Math.round(toNumber(form.qty) || 1));
    if (variants.length === 0) return null;
    const prices = variants.map((v) => v.price);
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    return {
      count: variants.length,
      lowest,
      highest,
      gap: Math.max(0, highest - lowest),
      chosenTotal: lowest * qty,
    };
  }, [form.modelVariants, form.qty]);

  const addRow = () => {
    setMsg(null);
    const machineType = (form.machineType === "Other" ? form.machineTypeOther : form.machineType).trim();
    const location = form.location.trim() || meta.location.trim() || "Not specified";
    const parsedVariants = form.modelVariants
      .map((mv) => ({
        model: String(mv.model || "").trim(),
        price: toNumber(String(mv.price || "")),
        link: String(mv.link || "").trim(),
      }))
      .filter((mv) => mv.model && mv.price > 0);
    if (!machineType) {
      setMsg("Please select machine type.");
      return;
    }
    if (parsedVariants.length < 1) {
      setMsg("Add at least 1 model with price.");
      return;
    }
    const machineModel = parsedVariants[0]?.model || "";
    const altMachineModel = parsedVariants[1]?.model || "";
    const altMachineModelPrice = parsedVariants[1]?.price || 0;
    const price1 = parsedVariants[0]?.price || 0;
    const price2 = parsedVariants[1]?.price || 0;
    const price3 = parsedVariants[2]?.price || 0;
    const chosenPrice = parsedVariants.reduce((min, mv) => Math.min(min, mv.price), Number.POSITIVE_INFINITY);
    const row: MachineRow = {
      id: editingRowId || crypto.randomUUID(),
      machineType,
      machineModel,
      altMachineModel,
      altMachineModelPrice,
      modelVariants: parsedVariants,
      qty: Math.max(1, Math.round(toNumber(form.qty) || 1)),
      priority: form.priority,
      platform: form.platform,
      location,
      price1,
      price2,
      price3,
      chosenPrice: Number.isFinite(chosenPrice) ? chosenPrice : 0,
      productUrl: parsedVariants[0]?.link || form.productUrl.trim(),
      imageUrl: form.imageUrl.trim() || autoImageFromLink(form.platform, parsedVariants[0]?.link || form.productUrl),
      notes: form.notes.trim(),
    };
    if (editingRowId) {
      setRows((prev) => prev.map((existing) => (existing.id === editingRowId ? row : existing)));
    } else {
      setRows((prev) => [row, ...prev]);
    }
    setForm(emptyForm);
    setEditingRowId(null);
    setMsg(editingRowId ? "Machine entry updated." : "Machine entry added.");
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (editingRowId === id) {
      setEditingRowId(null);
      setForm(emptyForm);
      setMsg("Editing cancelled because row was removed.");
    }
  };

  const duplicateRow = (id: string) => {
    setRows((prev) => {
      const src = prev.find((r) => r.id === id);
      if (!src) return prev;
      const copy: MachineRow = {
        ...src,
        id: crypto.randomUUID(),
        machineType: `${src.machineType} (copy)`,
      };
      return [copy, ...prev];
    });
    setMsg("Machine duplicated.");
  };

  const beginEditRow = (r: MachineRow) => {
    setMachineListView("all");
    setEditingRowId(r.id);
    setForm({
      ...emptyForm,
      machineType: MACHINE_TYPE_OPTIONS.includes(r.machineType) ? r.machineType : "Other",
      machineTypeOther: MACHINE_TYPE_OPTIONS.includes(r.machineType) ? "" : r.machineType,
      machineModel: r.machineModel || "",
      altMachineModel: r.altMachineModel || "",
      altMachineModelPrice: r.altMachineModelPrice ? String(r.altMachineModelPrice) : "",
      modelVariants:
        Array.isArray(r.modelVariants) && r.modelVariants.length > 0
          ? r.modelVariants.map((mv) => ({
              model: String(mv.model || ""),
              price: mv.price ? String(mv.price) : "",
              link: String(mv.link || ""),
            }))
          : [
              { model: r.machineModel || "", price: r.price1 ? String(r.price1) : "", link: r.productUrl || "" },
              { model: r.altMachineModel || "", price: r.altMachineModelPrice ? String(r.altMachineModelPrice) : "", link: "" },
            ].filter((mv) => mv.model || mv.price || mv.link),
      qty: String(r.qty || 1),
      priority: r.priority,
      platform: r.platform,
      location: r.location || "",
      price1: r.price1 ? String(r.price1) : "",
      price2: r.price2 ? String(r.price2) : "",
      price3: r.price3 ? String(r.price3) : "",
      chosenPrice: r.chosenPrice ? String(r.chosenPrice) : "",
      productUrl: r.productUrl || "",
      imageUrl: r.imageUrl || "",
      notes: r.notes || "",
    });
    setMsg("Editing machine entry. Update and save.");
    requestAnimationFrame(() => {
      addMachineSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const cancelEditRow = () => {
    setEditingRowId(null);
    setForm(emptyForm);
    setMsg("Edit cancelled.");
  };

  const focusMachineList = (view: "lowest" | "highest") => {
    setMachineListView(view);
    requestAnimationFrame(() => {
      machineListSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const resetReport = () => {
    setMeta(defaultMeta);
    setRows([]);
    setForm(emptyForm);
    localStorage.removeItem(STORAGE_KEY);
    setMsg("Project report reset.");
  };

  const downloadBankCsv = () => {
    if (!rows.length) {
      setMsg("Add at least one machine before downloading.");
      return;
    }
    const stamp = meta.reportDate || new Date().toISOString().slice(0, 10);

    const profile = csvLines([
      ["Section", "Field", "Value"],
      ["Project", "Project Title", meta.projectTitle],
      ["Project", "Workshop Name", meta.workshopName],
      ["Project", "Owner / Applicant", meta.ownerName],
      ["Project", "Location", meta.location],
      ["Project", "Template", meta.bankTemplate.toUpperCase()],
      ["Bank", "Bank Name", meta.bankName],
      ["Bank", "Branch", meta.branch],
      ["Bank", "Purpose", meta.accountPurpose],
      ["Finance", "Requested Loan", String(finance.requestedLoan)],
      ["Finance", "Own Contribution", String(finance.ownContribution)],
      ["Finance", "Total Project Cost", String(finance.totalProjectCost)],
      ["Finance", "Funding Gap", String(finance.fundingGap)],
      ["Finance", "Annual Interest %", String(finance.annualRatePct)],
      ["Ops", "Monthly Revenue", String(finance.monthlyRevenue)],
      ["Ops", "Monthly Operating Cost", String(finance.monthlyCost)],
      ["Ops", "Monthly Surplus", String(finance.monthlySurplus)],
      ["Ops", "Repayment Months", String(finance.repaymentMonths)],
      ["Ops", "Estimated EMI", String(Math.round(finance.emi))],
      ["Ops", "Coverage Ratio", finance.dscrLike.toFixed(2)],
      ["Ops", "Capacity Uplift Revenue", String(Math.round(finance.upliftRevenue))],
    ]);

    const machineCsv = toMachineCsv(rows);
    const combined = `${profile}\n\n${machineCsv}\n\n${csvLines([["Remarks"], [meta.remarks || ""]])}`;
    const blob = new Blob([combined], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bank-project-report-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Bank-ready project report downloaded.");
  };

  return (
    <div className={`mx-auto max-w-[1400px] space-y-5 rounded-3xl bg-gradient-to-b p-3 animate-[fade-in_.35s_ease-out] ${themeClass.page}`}>
      <style jsx global>{`
        @keyframes rise-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .ui-rise-in {
          animation: rise-in 280ms ease-out;
        }
        .ui-soft-lift {
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }
        .ui-soft-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px -16px rgba(0, 0, 0, 0.45);
        }
        .ui-value-pulse {
          transition: color 180ms ease, text-shadow 180ms ease;
        }
        .ui-value-pulse:hover {
          text-shadow: 0 0 0.45rem rgba(59, 130, 246, 0.25);
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .print-card {
            break-inside: avoid;
            box-shadow: none !important;
          }
          body {
            background: #fff !important;
          }
        }
      `}</style>
      <header className={`print-card ui-rise-in relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-sm transition hover:shadow-md ${themeClass.panel} ${themeClass.header}`}>
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-blue-200/30 blur-2xl dark:bg-blue-700/20" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-violet-200/30 blur-2xl dark:bg-violet-700/20" />
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Project report</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Project report for service-center planning: machine comparison, capital requirement, and profitability overview.
        </p>
        <div className="no-print mt-3 rounded-xl border border-zinc-200 bg-white/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Project workspace</p>
          <div className="mt-2 grid gap-2 md:grid-cols-[220px_minmax(0,1fr)_auto_auto_auto]">
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={activeProjectId}
              onChange={(e) => switchProject(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              placeholder="New project name (e.g. EV Wash Bay Setup)"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <button
              type="button"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
              onClick={createProject}
            >
              Create project
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              onClick={duplicateProject}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
              onClick={deleteProject}
            >
              Delete
            </button>
          </div>
          {activeProject ? (
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Active project name:
              <input
                className="ml-2 w-[300px] max-w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                value={activeProject.name}
                onChange={(e) => renameProject(e.target.value)}
              />
            </div>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <InfoCard label="Total units" value={String(totals.totalUnits)} />
          <InfoCard label="Machines" value={String(totals.machineCount)} />
          <InfoCard label="Chosen CAPEX" value={toInr(totals.totalChosen)} tone="emerald" />
          <InfoCard
            label="Lowest CAPEX"
            value={toInr(totals.totalLowest)}
            tone="blue"
            onClick={() => focusMachineList("lowest")}
            active={machineListView === "lowest"}
            hint={rows.length ? "Open lowest-value machines" : undefined}
          />
          <InfoCard
            label="Highest CAPEX"
            value={toInr(totals.totalHighest)}
            tone="violet"
            onClick={() => focusMachineList("highest")}
            active={machineListView === "highest"}
            hint={rows.length ? "Open highest-value machines" : undefined}
          />
          <InfoCard label="Potential Savings" value={toInr(totals.potentialSavings)} tone="amber" />
          <InfoCard label="Monthly Surplus" value={toInr(finance.monthlySurplus)} tone="violet" />
          <InfoCard label="Coverage Ratio" value={finance.dscrLike > 0 ? finance.dscrLike.toFixed(2) : "0.00"} />
        </div>
        <div className="no-print mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            onClick={() => window.print()}
          >
            Print / Save PDF
          </button>
          <span className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
            Auto-save draft enabled
          </span>
          <button
            type="button"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            onClick={() => addMachineSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            Jump to add machine
          </button>
          <button
            type="button"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            onClick={() => machineListSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            Jump to machine list
          </button>
          <div className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/60">
            {(["professional", "midnight", "teal"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  uiTheme === t
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
                onClick={() => setUiTheme(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 rounded-xl border border-zinc-200 bg-white/70 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
          <strong>Executive summary:</strong> {executiveSummary}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
            <strong>Top saving opportunity:</strong>{" "}
            {machineInsights.bestRow
              ? `${machineInsights.bestRow.machineType} (${toInr(machineInsights.bestSaving)})`
              : "Add machines to calculate"}
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
            <strong>Average price spread:</strong> {toInr(machineInsights.avgSpread)}
          </div>
        </div>
      </header>

      <section className={`no-print ui-rise-in rounded-2xl border p-3 shadow-sm ${themeClass.panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              onClick={() => addMachineSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Machine input
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              onClick={() => machineListSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Comparison schedule
            </button>
          </div>
          <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
            Live total: {toInr(totals.totalChosen)}
          </div>
        </div>
        <div className="mt-2 inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/60">
          {(["builder", "analysis", "board"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                workspaceMode === mode
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
              onClick={() => setWorkspaceMode(mode)}
            >
              {mode === "builder" ? "Builder mode" : mode === "analysis" ? "Analysis mode" : "Decision board"}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
              showOnlyWithLinks
                ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
                : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            }`}
            onClick={() => setShowOnlyWithLinks((v) => !v)}
          >
            {showOnlyWithLinks ? "Links only: ON" : "Links only: OFF"}
          </button>
          <button
            type="button"
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
              compactMachineRows
                ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300"
                : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            }`}
            onClick={() => setCompactMachineRows((v) => !v)}
          >
            {compactMachineRows ? "Compact rows: ON" : "Compact rows: OFF"}
          </button>
          <button
            type="button"
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
              presentationMode
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            }`}
            onClick={() => setPresentationMode((v) => !v)}
          >
            {presentationMode ? "Presentation: ON" : "Presentation: OFF"}
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
      {!presentationMode && workspaceMode !== "analysis" ? (
      <section ref={addMachineSectionRef} className={`print-card ui-rise-in rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${themeClass.panel}`}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {editingRowId ? "Edit machine requirement" : "Add machine requirement"}
          </h2>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
            Entry workspace
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Add machine options, compare prices quickly, and keep totals synced automatically.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
            Quick picks
          </span>
          {["Air compressor", "AC recovery machine", "Battery charger", "Car diagnostic scanner"].map((preset) => (
            <button
              key={preset}
              type="button"
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              onClick={() => setForm((f) => ({ ...f, machineType: preset, machineTypeOther: "" }))}
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <select
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            value={form.machineType}
            onChange={(e) => setForm((f) => ({ ...f, machineType: e.target.value }))}
          >
            <option value="">Machine type</option>
            {MACHINE_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {form.machineType === "Other" ? (
            <input
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              placeholder="Type machine name manually"
              value={form.machineTypeOther}
              onChange={(e) => setForm((f) => ({ ...f, machineTypeOther: e.target.value }))}
            />
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
              Models and prices are managed below
            </div>
          )}
          <input
            type="number"
            min={1}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            placeholder="Qty"
            value={form.qty}
            onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
          />
          <select className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as FormState["priority"] }))}>
            <option value="critical">Critical</option>
            <option value="important">Important</option>
            <option value="optional">Optional</option>
          </select>
          <select className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800" value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as Vendor }))}>
            <option>Amazon</option>
            <option>Flipkart</option>
            <option>Local dealer</option>
            <option>Other</option>
          </select>
          <input className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800" placeholder="Location / seller city" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 lg:col-span-2">
            Use buying link per model in the section below
          </div>
          <input
            type="url"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 lg:col-span-2"
            placeholder="Product image URL (auto-fills for Amazon ASIN links when possible)"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Total calculations are linked to model variants below. Lowest model price is used as budget-safe chosen price automatically.
        </p>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Same machine - different models and prices</p>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  modelVariants: [...f.modelVariants, { model: "", price: "", link: "" }],
                }))
              }
            >
              Add model
            </button>
          </div>
          <div className="space-y-2">
            {form.modelVariants.map((mv, idx) => (
              <div key={`mv-${idx}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)_auto]">
                <input
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  placeholder={`Model ${idx + 1} (e.g. 50 liter)`}
                  value={mv.model}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      modelVariants: f.modelVariants.map((x, i) => (i === idx ? { ...x, model: e.target.value } : x)),
                    }))
                  }
                />
                <input
                  type="text"
                  inputMode="decimal"
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  placeholder={`Price for model ${idx + 1}`}
                  value={mv.price}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      modelVariants: f.modelVariants.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)),
                    }))
                  }
                />
                <input
                  type="url"
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  placeholder={`Buying link for model ${idx + 1}`}
                  value={mv.link}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      modelVariants: f.modelVariants.map((x, i) => (i === idx ? { ...x, link: e.target.value } : x)),
                    }))
                  }
                />
                <button
                  type="button"
                  className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      modelVariants: f.modelVariants.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            You can remove all default rows and add your own manually. Add one or more models (example: 50L @ 15000, 100L @ 20000), then choose based on available amount.
          </p>
          {formVariantSummary ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800/60">
                Models: <span className="font-semibold">{formVariantSummary.count}</span>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800/60">
                Lowest: <span className="font-semibold">{toInr(formVariantSummary.lowest)}</span>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800/60">
                Gap: <span className="font-semibold">{toInr(formVariantSummary.gap)}</span>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800/60">
                Qty total: <span className="font-semibold">{toInr(formVariantSummary.chosenTotal)}</span>
              </div>
            </div>
          ) : null}
        </div>
        <textarea
          className="mt-3 min-h-[72px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          placeholder="Notes: warranty, delivery timeline, why this quote selected..."
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <div className="sticky bottom-2 z-10 mt-3 flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white/90 p-2 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-zinc-700 dark:bg-zinc-900/80">
          <button type="button" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900" onClick={addRow}>
            {editingRowId ? "Update machine" : "Add machine"}
          </button>
          {editingRowId ? (
            <button
              type="button"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              onClick={cancelEditRow}
            >
              Cancel edit
            </button>
          ) : null}
          <button type="button" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700" onClick={downloadBankCsv}>
            Download bank report
          </button>
          <button type="button" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200" onClick={resetReport}>
            Reset report
          </button>
        </div>
        {msg ? (
          <p
            className={`mt-2 rounded-lg border px-2.5 py-1.5 text-xs ${
              msg.toLowerCase().includes("please") || msg.toLowerCase().includes("add at least")
                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
            }`}
          >
            {msg}
          </p>
        ) : null}
      </section>
      ) : null}

      <section className={`print-card ui-rise-in rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${themeClass.panel}`}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Funding and viability checks</h2>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
            Auto-calculated
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Live financial health indicators based on current machine entries.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Funding gap" value={toInr(finance.fundingGap)} tone={finance.fundingGap > 0 ? "amber" : "emerald"} />
          <InfoCard label="Estimated EMI" value={toInr(finance.emi)} />
          <InfoCard label="Monthly surplus" value={toInr(finance.monthlySurplus)} tone="blue" />
          <InfoCard label="Coverage ratio" value={finance.dscrLike.toFixed(2)} tone={finance.dscrLike >= 1.2 ? "emerald" : "amber"} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <InfoCard label="Current capacity revenue" value={toInr(finance.currentRevenueByCapacity)} />
          <InfoCard label="Projected capacity revenue" value={toInr(finance.projectedRevenueByCapacity)} tone="violet" />
          <InfoCard label="Revenue uplift potential" value={toInr(finance.upliftRevenue)} tone="emerald" />
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <MetricBar label="Funding coverage" value={`${fundingUi.coveragePct.toFixed(0)}%`} pct={Math.min(100, fundingUi.coveragePct)} tone="emerald" />
          <MetricBar label="EMI load vs revenue" value={`${fundingUi.emiLoadPct.toFixed(0)}%`} pct={fundingUi.emiLoadPct} tone="amber" />
          <MetricBar label="Surplus margin" value={`${fundingUi.surplusMarginPct.toFixed(0)}%`} pct={fundingUi.surplusMarginPct} tone="blue" />
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Coverage ratio above 1.20 is typically stronger for loan review. Current: {finance.dscrLike.toFixed(2)}.
        </p>
      </section>
      </div>

      {workspaceMode !== "builder" ? (
        <section className={`print-card ui-rise-in rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${themeClass.panel}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Scenario Lab (stress test)</h2>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
              What-if simulation
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="rounded-xl border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="font-semibold text-zinc-700 dark:text-zinc-200">CAPEX shock %</p>
              <input type="range" min={-20} max={40} value={scenario.capexShockPct} onChange={(e) => setScenario((s) => ({ ...s, capexShockPct: Number(e.target.value) }))} className="mt-2 w-full" />
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">{scenario.capexShockPct}%</p>
            </label>
            <label className="rounded-xl border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="font-semibold text-zinc-700 dark:text-zinc-200">Revenue shock %</p>
              <input type="range" min={-40} max={40} value={scenario.revenueShockPct} onChange={(e) => setScenario((s) => ({ ...s, revenueShockPct: Number(e.target.value) }))} className="mt-2 w-full" />
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">{scenario.revenueShockPct}%</p>
            </label>
            <label className="rounded-xl border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="font-semibold text-zinc-700 dark:text-zinc-200">Cost shock %</p>
              <input type="range" min={-20} max={50} value={scenario.costShockPct} onChange={(e) => setScenario((s) => ({ ...s, costShockPct: Number(e.target.value) }))} className="mt-2 w-full" />
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">{scenario.costShockPct}%</p>
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard label="Stressed CAPEX" value={toInr(scenarioFinance.stressedCapex)} tone="amber" />
            <InfoCard label="Stressed surplus" value={toInr(scenarioFinance.stressedSurplus)} tone="blue" />
            <InfoCard label="Stressed DSCR" value={scenarioFinance.stressedDscr.toFixed(2)} tone={scenarioFinance.stressedDscr >= 1.2 ? "emerald" : "amber"} />
            <InfoCard label="Risk band" value={scenarioFinance.riskLevel} tone={scenarioFinance.riskLevel === "Low" ? "emerald" : "amber"} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="font-semibold text-zinc-700 dark:text-zinc-200">Funding gap under stress</p>
              <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{toInr(scenarioFinance.stressedFundingGap)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="font-semibold text-zinc-700 dark:text-zinc-200">Procurement concentration (Top 3)</p>
              <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{procurementIntel.concentrationTop3.toFixed(0)}%</p>
            </div>
          </div>
        </section>
      ) : null}

      {workspaceMode === "board" ? (
        <section className={`print-card ui-rise-in rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${themeClass.panel}`}>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Procurement intelligence board</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {procurementIntel.topRows.map((r, idx) => (
              <div key={`${r.id}-intel`} className="rounded-xl border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900/50">
                <p className="font-semibold text-zinc-800 dark:text-zinc-100">
                  #{idx + 1} {r.machineType}
                </p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-300">Chosen outlay: {toInr(r.total)}</p>
                <p className="text-zinc-600 dark:text-zinc-300">Potential optimization: {toInr(r.spreadTotal)}</p>
                <p className="text-zinc-500 dark:text-zinc-400">Priority: {r.priority}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            High spread items: {procurementIntel.highSpreadCount}. Prioritize negotiation on rows with high optimization value.
          </p>
        </section>
      ) : null}

      <section ref={machineListSectionRef} className={`print-card ui-rise-in rounded-3xl border p-5 shadow-sm transition hover:shadow-md ${themeClass.panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Machine comparison schedule</h2>
          <div className="flex flex-wrap items-center gap-2">
            {machineListView !== "all" ? (
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                onClick={() => setMachineListView("all")}
              >
                Show all machines
              </button>
            ) : null}
            {(machineSearch || machinePriorityFilter !== "all") ? (
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  setMachineSearch("");
                  setMachinePriorityFilter("all");
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-2 inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/60">
          {(["all", "lowest", "highest"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                machineListView === mode
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
              onClick={() => setMachineListView(mode)}
            >
              {mode === "all" ? "Chosen view" : mode === "lowest" ? "Lowest view" : "Highest view"}
            </button>
          ))}
        </div>
        {machineListView !== "all" ? (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Showing {machineListView} value for each machine.
          </p>
        ) : null}
        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_170px_auto]">
          <input
            type="text"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            placeholder="Search machine, model, platform, location..."
            value={machineSearch}
            onChange={(e) => setMachineSearch(e.target.value)}
          />
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            value={machinePriorityFilter}
            onChange={(e) => setMachinePriorityFilter(e.target.value as "all" | MachineRow["priority"])}
          >
            <option value="all">All priorities</option>
            <option value="critical">Critical</option>
            <option value="important">Important</option>
            <option value="optional">Optional</option>
          </select>
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            value={machineSortBy}
            onChange={(e) => setMachineSortBy(e.target.value as "chosen" | "lowest" | "highest" | "gap")}
          >
            <option value="chosen">Sort: chosen</option>
            <option value="lowest">Sort: lowest</option>
            <option value="highest">Sort: highest</option>
            <option value="gap">Sort: gap</option>
          </select>
          <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
            Showing {visibleMachineRows.length} / {rows.length} · {toInr(visibleMachineTotal)}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No machines added yet.</p>
        ) : (
          <>
          <div className="mt-3 space-y-3 md:hidden">
            {visibleMachineRows.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
                No machines match current filters.
              </div>
            ) : (
              visibleMachineRows.map((r, idx) => (
                <div
                  key={`${r.id}-mobile`}
                  className={`ui-soft-lift rounded-xl border border-zinc-200 bg-white ${compactMachineRows ? "p-2.5" : "p-3"} shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60 ${
                    editingRowId === r.id ? "ring-2 ring-blue-400/40" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">#{idx + 1}</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{r.machineType}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{r.platform} · {r.location}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      r.priority === "critical"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                        : r.priority === "important"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}>
                      {r.priority}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800/60">
                      <p className="text-zinc-500 dark:text-zinc-400">Qty</p>
                      <p className="font-semibold">{r.qty}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800/60">
                      <p className="text-zinc-500 dark:text-zinc-400">{machineListView === "all" ? "Chosen" : machineListView === "highest" ? "Highest total" : "Lowest total"}</p>
                      <p className="ui-value-pulse font-semibold">
                        {machineListView === "highest"
                          ? toInr(rowMax(r) * r.qty)
                          : machineListView === "lowest"
                          ? toInr(rowMin(r) * r.qty)
                          : toInr(r.chosenPrice * r.qty)}
                      </p>
                    </div>
                    {machineListView !== "highest" ? (
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-emerald-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-emerald-300">
                        <p className="text-zinc-500 dark:text-zinc-400">Lowest</p>
                        <p className="font-semibold">{toInr(rowMin(r))}</p>
                      </div>
                    ) : null}
                    {machineListView !== "lowest" ? (
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-violet-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-violet-300">
                        <p className="text-zinc-500 dark:text-zinc-400">Highest</p>
                        <p className="font-semibold">{toInr(rowMax(r))}</p>
                      </div>
                    ) : null}
                  </div>
                  {machineListView !== "all" ? (
                    <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800/60">
                      <p className="text-zinc-500 dark:text-zinc-400">
                        {machineListView === "lowest" ? "Lowest model" : "Highest model"}
                      </p>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-100">
                        {modeVariant(r, machineListView).model} - {toInr(modeVariant(r, machineListView).price)}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!presentationMode ? (
                      <>
                        <button
                          type="button"
                          className="rounded-lg border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:text-blue-300"
                          onClick={() => beginEditRow(r)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
                          onClick={() => duplicateRow(r.id)}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:text-rose-300"
                          onClick={() => removeRow(r.id)}
                        >
                          Remove
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 hidden overflow-x-auto rounded-xl border border-zinc-200 md:block dark:border-zinc-700">
            <table className="min-w-full text-left text-sm bg-white dark:bg-zinc-900/60">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-400">
                  <th className="px-2 py-2 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Model options</th>
                  <th className="px-2 py-2 font-medium">Qty</th>
                  <th className="px-2 py-2 font-medium">Priority</th>
                  <th className="px-2 py-2 font-medium">Image</th>
                  <th className="px-2 py-2 font-medium">Platform</th>
                  <th className="px-2 py-2 font-medium">Location</th>
                  <th className="px-2 py-2 font-medium">Product link</th>
                  {machineListView === "all" ? <th className="px-2 py-2 font-medium">Compared (1 / 2 / 3)</th> : null}
                  {machineListView !== "highest" ? <th className="px-2 py-2 font-medium">Lowest</th> : null}
                  {machineListView !== "lowest" ? <th className="px-2 py-2 font-medium">Highest</th> : null}
                  {machineListView === "all" ? <th className="px-2 py-2 font-medium">Gap</th> : null}
                  <th className="px-2 py-2 font-medium">
                    {machineListView === "all" ? "Chosen" : machineListView === "highest" ? "Highest total" : "Lowest total"}
                  </th>
                  {!presentationMode ? <th className="px-2 py-2 font-medium">Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {visibleMachineRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      No machines match current filters.
                    </td>
                  </tr>
                ) : (
                  visibleMachineRows.map((r, idx) => (
                  <tr key={r.id} className={`ui-soft-lift border-b border-zinc-100 dark:border-zinc-800 ${compactMachineRows ? "align-top" : ""} ${idx % 2 === 1 ? "bg-zinc-50/40 dark:bg-zinc-900/20" : ""} ${editingRowId === r.id ? "bg-blue-50/60 dark:bg-blue-950/20" : ""}`}>
                    <td className="px-2 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{r.machineType}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{r.platform}</p>
                    </td>
                    <td className="px-2 py-2">
                      {machineListView !== "all" ? (
                        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800/60">
                          <span className="font-medium">{modeVariant(r, machineListView).model}</span> - {toInr(modeVariant(r, machineListView).price)}
                        </div>
                      ) : Array.isArray(r.modelVariants) && r.modelVariants.length > 0 ? (
                        <div className="space-y-1">
                          {r.modelVariants.map((mv, idx) => (
                            <div key={`${r.id}-mv-${idx}`} className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800/60">
                              <span className="font-medium">{mv.model}</span> - {toInr(mv.price)}
                              {mv.link ? (
                                <>
                                  {" "}
                                  ·{" "}
                                  <a href={mv.link} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline dark:text-blue-400">
                                    Buy
                                  </a>
                                </>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">{r.machineModel || "—"}</span>
                      )}
                    </td>
                    <td className="px-2 py-2">{r.qty}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        r.priority === "critical"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                          : r.priority === "important"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.imageUrl} alt={r.machineModel || r.machineType} className="h-12 w-12 rounded-lg border border-zinc-200 object-cover dark:border-zinc-700" />
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2">{r.platform}</td>
                    <td className="px-2 py-2">{r.location}</td>
                    <td className="px-2 py-2">
                      {r.productUrl ? (
                        <a href={r.productUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400">
                          Open
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    {machineListView === "all" ? (
                      <td className="px-2 py-2">
                        <div className="space-y-0.5 text-xs">
                          <p>{toInr(r.price1)}</p>
                          <p>{toInr(r.price2)}</p>
                          <p>{toInr(r.price3)}</p>
                        </div>
                      </td>
                    ) : null}
                    {machineListView !== "highest" ? (
                      <td className={`ui-value-pulse px-2 py-2 text-emerald-700 dark:text-emerald-300 ${machineListView === "lowest" ? "font-bold underline decoration-emerald-400/70 underline-offset-2" : ""}`}>
                        {toInr(rowMin(r))}
                      </td>
                    ) : null}
                    {machineListView !== "lowest" ? (
                      <td className={`ui-value-pulse px-2 py-2 text-violet-700 dark:text-violet-300 ${machineListView === "highest" ? "font-bold underline decoration-violet-400/70 underline-offset-2" : ""}`}>
                        {toInr(rowMax(r))}
                      </td>
                    ) : null}
                    {machineListView === "all" ? (
                      <td className="ui-value-pulse px-2 py-2 font-medium text-amber-700 dark:text-amber-300">{toInr(Math.max(0, rowMax(r) - rowMin(r)))}</td>
                    ) : null}
                    <td className="ui-value-pulse px-2 py-2 font-semibold">
                      {machineListView === "highest"
                        ? toInr(rowMax(r) * r.qty)
                        : machineListView === "lowest"
                        ? toInr(rowMin(r) * r.qty)
                        : toInr(r.chosenPrice * r.qty)}
                    </td>
                    {!presentationMode ? (
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:text-blue-300"
                            onClick={() => beginEditRow(r)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
                            onClick={() => duplicateRow(r.id)}
                          >
                            Duplicate
                          </button>
                          <button type="button" className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:text-rose-300" onClick={() => removeRow(r.id)}>
                            Remove
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {machineListView !== "all" ? (
            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                  {machineListView === "lowest" ? "Lowest selection summary" : "Highest selection summary"}
                </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Total: {toInr(modeDetailRows.reduce((sum, r) => sum + r.total, 0))}
                </p>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {modeDetailRows.map((r) => (
                  <div key={`${r.id}-${machineListView}`} className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800/70">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100">{r.machineType}</p>
                    <p className="mt-0.5 text-zinc-600 dark:text-zinc-300">
                      {r.model} · {toInr(r.unit)} x {r.qty} = <span className="font-semibold">{toInr(r.total)}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function InfoCard({
  label,
  value,
  tone = "default",
  onClick,
  active = false,
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "emerald" | "blue" | "violet" | "amber";
  onClick?: () => void;
  active?: boolean;
  hint?: string;
}) {
  const tones: Record<string, string> = {
    default: "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60",
    emerald: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30",
    blue: "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30",
    violet: "border-violet-200 bg-violet-50 dark:border-violet-900/50 dark:bg-violet-950/30",
    amber: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={hint}
      className={`rounded-2xl border p-3 text-left transition ${tones[tone] || tones.default} ${
        onClick ? "cursor-pointer hover:shadow-sm" : "cursor-default"
      } ${active ? "ring-2 ring-zinc-400/50 dark:ring-zinc-500/60" : ""} ui-soft-lift`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
    </button>
  );
}

function MetricBar({
  label,
  value,
  pct,
  tone = "blue",
}: {
  label: string;
  value: string;
  pct: number;
  tone?: "emerald" | "amber" | "blue";
}) {
  const track = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-blue-500";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between gap-2 text-xs">
        <p className="font-semibold text-zinc-700 dark:text-zinc-200">{label}</p>
        <p className="font-semibold text-zinc-600 dark:text-zinc-300">{value}</p>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div className={`h-full ${track}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}
