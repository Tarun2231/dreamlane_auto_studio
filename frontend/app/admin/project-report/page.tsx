"use client";

import { useEffect, useMemo, useState } from "react";

type Vendor = "Amazon" | "Flipkart" | "Local dealer" | "Other";

type MachineRow = {
  id: string;
  machineType: string;
  machineModel: string;
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
  machineModel: string;
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

type ChecklistState = {
  gstCertificate: boolean;
  registrationProof: boolean;
  rentAgreement: boolean;
  ownerId: boolean;
  supplierQuotations: boolean;
  bankStatements: boolean;
};

type RiskRow = {
  id: string;
  area: string;
  likelihood: "Low" | "Medium" | "High";
  impact: "Low" | "Medium" | "High";
  mitigation: string;
};

const emptyForm: FormState = {
  machineType: "",
  machineModel: "",
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

const defaultChecklist: ChecklistState = {
  gstCertificate: false,
  registrationProof: false,
  rentAgreement: false,
  ownerId: false,
  supplierQuotations: false,
  bankStatements: false,
};

const defaultRisks: RiskRow[] = [
  { id: "risk-1", area: "Supplier delay", likelihood: "Medium", impact: "Medium", mitigation: "Keep alternate suppliers and buffer stock." },
  { id: "risk-2", area: "Demand fluctuation", likelihood: "Medium", impact: "High", mitigation: "Maintain repeat-customer campaigns and service packages." },
  { id: "risk-3", area: "Cash flow pressure", likelihood: "Low", impact: "High", mitigation: "Phase purchases and hold working-capital reserve." },
];

const STORAGE_KEY = "adminProjectReportDraftV1";

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

function csvLines(lines: string[][]) {
  return lines.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function toMachineCsv(rows: MachineRow[]) {
  const head = [
    "Machine type",
    "Model",
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
  const [meta, setMeta] = useState<ReportMeta>(defaultMeta);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [rows, setRows] = useState<MachineRow[]>([]);
  const [checklist, setChecklist] = useState<ChecklistState>(defaultChecklist);
  const [risks, setRisks] = useState<RiskRow[]>(defaultRisks);
  const [msg, setMsg] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          meta?: ReportMeta;
          form?: FormState;
          rows?: MachineRow[];
          checklist?: ChecklistState;
          risks?: RiskRow[];
        };
        if (parsed.meta) setMeta({ ...defaultMeta, ...parsed.meta });
        if (parsed.form) setForm({ ...emptyForm, ...parsed.form });
        if (Array.isArray(parsed.rows)) {
          setRows(
            parsed.rows.map((r) => ({
              ...r,
              qty: Number.isFinite(Number(r.qty)) && Number(r.qty) > 0 ? Math.round(Number(r.qty)) : 1,
              priority:
                r.priority === "critical" || r.priority === "important" || r.priority === "optional"
                  ? r.priority
                  : "critical",
              productUrl: typeof r.productUrl === "string" ? r.productUrl : "",
              imageUrl: typeof r.imageUrl === "string" ? r.imageUrl : "",
            }))
          );
        }
        if (parsed.checklist) setChecklist({ ...defaultChecklist, ...parsed.checklist });
        if (Array.isArray(parsed.risks)) setRisks(parsed.risks);
      }
    } catch {
      // ignore corrupt draft
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ meta, form, rows, checklist, risks }));
  }, [meta, form, rows, checklist, risks, hydrated]);

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

  const checklistScore = useMemo(() => {
    const vals = Object.values(checklist);
    const done = vals.filter(Boolean).length;
    const total = vals.length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [checklist]);

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
  }, [finance, meta.workshopName, totals]);

  const submission = useMemo(() => {
    const missing: string[] = [];
    if (!meta.workshopName.trim()) missing.push("Workshop name");
    if (!meta.ownerName.trim()) missing.push("Owner / applicant");
    if (!meta.location.trim()) missing.push("Project location");
    if (!meta.bankName.trim()) missing.push("Bank name");
    if (!meta.branch.trim()) missing.push("Bank branch");
    if (toNumber(meta.requestedLoanInr) <= 0) missing.push("Requested loan amount");
    if (toNumber(meta.repaymentMonths) <= 0) missing.push("Repayment tenure");
    if (rows.length === 0) missing.push("At least one machine line item");
    if (checklistScore.done < checklistScore.total) missing.push("Complete compliance checklist");
    if (!meta.signatoryName.trim()) missing.push("Authorized signatory");
    if (finance.dscrLike < 1.2) missing.push("Coverage ratio below 1.20");
    return { ready: missing.length === 0, missing };
  }, [meta, rows.length, checklistScore, finance.dscrLike]);

  const projection = useMemo(() => {
    const y1Revenue = finance.projectedRevenueByCapacity || finance.monthlyRevenue * 12;
    const y1Cost = finance.monthlyCost * 12;
    const revGrowth = toNumber(meta.projectedRevenueGrowthPct) / 100;
    const costGrowth = toNumber(meta.projectedCostGrowthPct) / 100;
    const y2Revenue = y1Revenue * (1 + revGrowth);
    const y3Revenue = y2Revenue * (1 + revGrowth);
    const y2Cost = y1Cost * (1 + costGrowth);
    const y3Cost = y2Cost * (1 + costGrowth);
    return {
      y1: { revenue: y1Revenue, cost: y1Cost, profit: y1Revenue - y1Cost },
      y2: { revenue: y2Revenue, cost: y2Cost, profit: y2Revenue - y2Cost },
      y3: { revenue: y3Revenue, cost: y3Cost, profit: y3Revenue - y3Cost },
    };
  }, [finance, meta.projectedRevenueGrowthPct, meta.projectedCostGrowthPct]);

  const addRow = () => {
    setMsg(null);
    const machineType = form.machineType.trim();
    const machineModel = form.machineModel.trim();
    const location = form.location.trim();
    if (!machineType || !machineModel || !location) {
      setMsg("Please fill machine type, model, and location.");
      return;
    }
    const price1 = toNumber(form.price1);
    const price2 = toNumber(form.price2);
    const price3 = toNumber(form.price3);
    const chosenPrice = toNumber(form.chosenPrice);
    if (chosenPrice <= 0) {
      setMsg("Please enter a valid chosen/final price.");
      return;
    }
    const row: MachineRow = {
      id: crypto.randomUUID(),
      machineType,
      machineModel,
      qty: Math.max(1, Math.round(toNumber(form.qty) || 1)),
      priority: form.priority,
      platform: form.platform,
      location,
      price1,
      price2,
      price3,
      chosenPrice,
      productUrl: form.productUrl.trim(),
      imageUrl: form.imageUrl.trim() || autoImageFromLink(form.platform, form.productUrl),
      notes: form.notes.trim(),
    };
    setRows((prev) => [row, ...prev]);
    setForm(emptyForm);
    setMsg("Machine entry added.");
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const resetReport = () => {
    setMeta(defaultMeta);
    setRows([]);
    setForm(emptyForm);
    setChecklist(defaultChecklist);
    setRisks(defaultRisks);
    localStorage.removeItem(STORAGE_KEY);
    setMsg("Project report reset.");
  };

  const addRisk = () => {
    setRisks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), area: "", likelihood: "Medium", impact: "Medium", mitigation: "" },
    ]);
  };

  const updateRisk = (id: string, patch: Partial<RiskRow>) => {
    setRisks((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRisk = (id: string) => {
    setRisks((prev) => prev.filter((r) => r.id !== id));
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
      ["Compliance", "Checklist Completion", `${checklistScore.done}/${checklistScore.total} (${checklistScore.pct}%)`],
      ["Ops", "Monthly Revenue", String(finance.monthlyRevenue)],
      ["Ops", "Monthly Operating Cost", String(finance.monthlyCost)],
      ["Ops", "Monthly Surplus", String(finance.monthlySurplus)],
      ["Ops", "Repayment Months", String(finance.repaymentMonths)],
      ["Ops", "Estimated EMI", String(Math.round(finance.emi))],
      ["Ops", "Coverage Ratio", finance.dscrLike.toFixed(2)],
      ["Ops", "Capacity Uplift Revenue", String(Math.round(finance.upliftRevenue))],
      ["Submission", "Readiness", submission.ready ? "Ready" : "Not Ready"],
      ["Submission", "Missing Count", String(submission.missing.length)],
      ["Projection", "Y1 Profit", String(Math.round(projection.y1.profit))],
      ["Projection", "Y2 Profit", String(Math.round(projection.y2.profit))],
      ["Projection", "Y3 Profit", String(Math.round(projection.y3.profit))],
    ]);

    const machineCsv = toMachineCsv(rows);
    const checklistCsv = csvLines([
      ["Checklist Item", "Status"],
      ["GST certificate", checklist.gstCertificate ? "Yes" : "No"],
      ["Business registration proof", checklist.registrationProof ? "Yes" : "No"],
      ["Shop rent/ownership proof", checklist.rentAgreement ? "Yes" : "No"],
      ["Owner ID proof", checklist.ownerId ? "Yes" : "No"],
      ["Supplier quotations", checklist.supplierQuotations ? "Yes" : "No"],
      ["Recent bank statements", checklist.bankStatements ? "Yes" : "No"],
    ]);
    const riskCsv = csvLines([
      ["Risk Area", "Likelihood", "Impact", "Mitigation"],
      ...risks.map((r) => [r.area, r.likelihood, r.impact, r.mitigation]),
    ]);
    const projectionCsv = csvLines([
      ["Year", "Revenue", "Cost", "Profit"],
      ["Year 1", String(Math.round(projection.y1.revenue)), String(Math.round(projection.y1.cost)), String(Math.round(projection.y1.profit))],
      ["Year 2", String(Math.round(projection.y2.revenue)), String(Math.round(projection.y2.cost)), String(Math.round(projection.y2.profit))],
      ["Year 3", String(Math.round(projection.y3.revenue)), String(Math.round(projection.y3.cost)), String(Math.round(projection.y3.profit))],
    ]);
    const combined = `${profile}\n\n${checklistCsv}\n\n${riskCsv}\n\n${projectionCsv}\n\n${machineCsv}\n\n${csvLines([["Remarks"], [meta.remarks || ""]])}`;
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
    <div className="mx-auto max-w-7xl space-y-5 animate-[fade-in_.35s_ease-out]">
      <style jsx global>{`
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
      <header className="print-card rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-5 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:from-zinc-900/90 dark:to-zinc-900/70">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Project report</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Bank-ready report for service-center funding: machine comparison, capital requirement, and repayment readiness.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <InfoCard label="Total units" value={String(totals.totalUnits)} />
          <InfoCard label="Machines" value={String(totals.machineCount)} />
          <InfoCard label="Chosen CAPEX" value={toInr(totals.totalChosen)} tone="emerald" />
          <InfoCard label="Lowest CAPEX" value={toInr(totals.totalLowest)} tone="blue" />
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
        </div>
        <p className="mt-3 rounded-xl border border-zinc-200 bg-white/70 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
          <strong>Executive summary:</strong> {executiveSummary}
        </p>
      </header>
      <section className="print-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Submission readiness</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              submission.ready
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            {submission.ready ? "Ready for bank submission" : "Not ready"}
          </span>
        </div>
        {submission.ready ? (
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
            All key sections are complete and this report is ready to share.
          </p>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">Missing or needs attention:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
              {submission.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="print-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/70">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Project profile for bank submission</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Bank template</span>
            <select
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={meta.bankTemplate}
              onChange={(e) => setMeta((m) => ({ ...m, bankTemplate: e.target.value as ReportMeta["bankTemplate"] }))}
            >
              <option value="standard">Standard format</option>
              <option value="sbi">SBI style</option>
              <option value="hdfc">HDFC style</option>
              <option value="icici">ICICI style</option>
              <option value="nbfc">NBFC style</option>
            </select>
          </label>
          <TextField label="Project title" value={meta.projectTitle} onChange={(v) => setMeta((m) => ({ ...m, projectTitle: v }))} />
          <TextField label="Workshop name" value={meta.workshopName} onChange={(v) => setMeta((m) => ({ ...m, workshopName: v }))} />
          <TextField label="Owner / applicant" value={meta.ownerName} onChange={(v) => setMeta((m) => ({ ...m, ownerName: v }))} />
          <TextField label="Project location" value={meta.location} onChange={(v) => setMeta((m) => ({ ...m, location: v }))} />
          <TextField label="Bank name" value={meta.bankName} onChange={(v) => setMeta((m) => ({ ...m, bankName: v }))} />
          <TextField label="Branch" value={meta.branch} onChange={(v) => setMeta((m) => ({ ...m, branch: v }))} />
          <TextField label="Purpose" value={meta.accountPurpose} onChange={(v) => setMeta((m) => ({ ...m, accountPurpose: v }))} />
          <TextField label="Report date" type="date" value={meta.reportDate} onChange={(v) => setMeta((m) => ({ ...m, reportDate: v }))} />
          <NumberField label="Requested loan (INR)" value={meta.requestedLoanInr} onChange={(v) => setMeta((m) => ({ ...m, requestedLoanInr: v }))} />
          <NumberField label="Own contribution (INR)" value={meta.ownContributionInr} onChange={(v) => setMeta((m) => ({ ...m, ownContributionInr: v }))} />
          <NumberField
            label="Expected monthly revenue (INR)"
            value={meta.expectedMonthlyRevenueInr}
            onChange={(v) => setMeta((m) => ({ ...m, expectedMonthlyRevenueInr: v }))}
          />
          <NumberField
            label="Expected monthly operating cost (INR)"
            value={meta.expectedMonthlyOperatingCostInr}
            onChange={(v) => setMeta((m) => ({ ...m, expectedMonthlyOperatingCostInr: v }))}
          />
          <NumberField label="Repayment tenure (months)" value={meta.repaymentMonths} onChange={(v) => setMeta((m) => ({ ...m, repaymentMonths: v }))} />
          <NumberField label="Annual interest rate (%)" value={meta.annualInterestRate} onChange={(v) => setMeta((m) => ({ ...m, annualInterestRate: v }))} />
          <NumberField label="Current jobs / month" value={meta.currentJobsPerMonth} onChange={(v) => setMeta((m) => ({ ...m, currentJobsPerMonth: v }))} />
          <NumberField label="Projected jobs / month" value={meta.projectedJobsPerMonth} onChange={(v) => setMeta((m) => ({ ...m, projectedJobsPerMonth: v }))} />
          <NumberField label="Avg ticket size (INR)" value={meta.avgTicketSizeInr} onChange={(v) => setMeta((m) => ({ ...m, avgTicketSizeInr: v }))} />
          <NumberField label="Revenue growth % (yearly)" value={meta.projectedRevenueGrowthPct} onChange={(v) => setMeta((m) => ({ ...m, projectedRevenueGrowthPct: v }))} />
          <NumberField label="Cost growth % (yearly)" value={meta.projectedCostGrowthPct} onChange={(v) => setMeta((m) => ({ ...m, projectedCostGrowthPct: v }))} />
          <TextField label="Authorized signatory" value={meta.signatoryName} onChange={(v) => setMeta((m) => ({ ...m, signatoryName: v }))} />
        </div>
        <textarea
          className="mt-3 min-h-[84px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          placeholder="Remarks for bank manager: collateral, business history, current throughput, expected increase after purchase..."
          value={meta.remarks}
          onChange={(e) => setMeta((m) => ({ ...m, remarks: e.target.value }))}
        />
      </section>

      <section className="print-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/70">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Compliance checklist</h2>
          <span className="rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
            {checklistScore.done}/{checklistScore.total} complete ({checklistScore.pct}%)
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ChecklistToggle label="GST certificate" checked={checklist.gstCertificate} onChange={(v) => setChecklist((c) => ({ ...c, gstCertificate: v }))} />
          <ChecklistToggle label="Business registration proof" checked={checklist.registrationProof} onChange={(v) => setChecklist((c) => ({ ...c, registrationProof: v }))} />
          <ChecklistToggle label="Shop rent / ownership proof" checked={checklist.rentAgreement} onChange={(v) => setChecklist((c) => ({ ...c, rentAgreement: v }))} />
          <ChecklistToggle label="Owner ID proof" checked={checklist.ownerId} onChange={(v) => setChecklist((c) => ({ ...c, ownerId: v }))} />
          <ChecklistToggle label="Supplier quotations" checked={checklist.supplierQuotations} onChange={(v) => setChecklist((c) => ({ ...c, supplierQuotations: v }))} />
          <ChecklistToggle label="Recent bank statements" checked={checklist.bankStatements} onChange={(v) => setChecklist((c) => ({ ...c, bankStatements: v }))} />
        </div>
      </section>

      <section className="print-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/70">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add machine requirement</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800" placeholder="Machine type" value={form.machineType} onChange={(e) => setForm((f) => ({ ...f, machineType: e.target.value }))} />
          <input className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800" placeholder="Machine model" value={form.machineModel} onChange={(e) => setForm((f) => ({ ...f, machineModel: e.target.value }))} />
          <input type="number" min={1} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800" placeholder="Qty" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} />
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
          <input type="number" min={0} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800" placeholder="Price option 1" value={form.price1} onChange={(e) => setForm((f) => ({ ...f, price1: e.target.value }))} />
          <input type="number" min={0} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800" placeholder="Price option 2" value={form.price2} onChange={(e) => setForm((f) => ({ ...f, price2: e.target.value }))} />
          <input type="number" min={0} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800" placeholder="Price option 3" value={form.price3} onChange={(e) => setForm((f) => ({ ...f, price3: e.target.value }))} />
          <input type="number" min={0} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800" placeholder="Chosen final price" value={form.chosenPrice} onChange={(e) => setForm((f) => ({ ...f, chosenPrice: e.target.value }))} />
          <input
            type="url"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 lg:col-span-2"
            placeholder="Product URL (Amazon / Flipkart / supplier website)"
            value={form.productUrl}
            onChange={(e) => {
              const productUrl = e.target.value;
              const auto = autoImageFromLink(form.platform, productUrl);
              setForm((f) => ({ ...f, productUrl, imageUrl: f.imageUrl || auto }));
            }}
          />
          <input
            type="url"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 lg:col-span-2"
            placeholder="Product image URL (auto-fills for Amazon ASIN links when possible)"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          />
        </div>
        <textarea
          className="mt-3 min-h-[72px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          placeholder="Notes: warranty, delivery timeline, why this quote selected..."
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900" onClick={addRow}>
            Add machine
          </button>
          <button type="button" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200" onClick={downloadBankCsv}>
            Download bank report
          </button>
          <button type="button" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200" onClick={resetReport}>
            Reset report
          </button>
        </div>
        {!submission.ready ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            You can download now, but complete all readiness items for stronger bank submission.
          </p>
        ) : null}
        {msg ? <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{msg}</p> : null}
      </section>

      <section className="print-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/70">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Funding and viability checks</h2>
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
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Coverage ratio above 1.20 is typically stronger for loan review. Current: {finance.dscrLike.toFixed(2)}.
        </p>
      </section>

      <section className="print-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/70">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">3-year projection</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400">
                <th className="px-3 py-2 font-medium">Year</th>
                <th className="px-3 py-2 font-medium">Revenue</th>
                <th className="px-3 py-2 font-medium">Cost</th>
                <th className="px-3 py-2 font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {([
                ["Year 1", projection.y1],
                ["Year 2", projection.y2],
                ["Year 3", projection.y3],
              ] as const).map(([label, row]) => (
                <tr key={label} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-2 font-semibold">{label}</td>
                  <td className="px-3 py-2">{toInr(row.revenue)}</td>
                  <td className="px-3 py-2">{toInr(row.cost)}</td>
                  <td className="px-3 py-2 font-semibold">{toInr(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="print-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/70">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Risk mitigation matrix</h2>
          <button
            type="button"
            className="no-print rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            onClick={addRisk}
          >
            Add risk
          </button>
        </div>
        <div className="space-y-2">
          {risks.map((r) => (
            <div key={r.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
              <div className="grid gap-2 md:grid-cols-4">
                <input
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  placeholder="Risk area"
                  value={r.area}
                  onChange={(e) => updateRisk(r.id, { area: e.target.value })}
                />
                <select
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  value={r.likelihood}
                  onChange={(e) => updateRisk(r.id, { likelihood: e.target.value as RiskRow["likelihood"] })}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
                <select
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  value={r.impact}
                  onChange={(e) => updateRisk(r.id, { impact: e.target.value as RiskRow["impact"] })}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
                <button
                  type="button"
                  className="no-print rounded-lg border border-rose-300 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                  onClick={() => removeRisk(r.id)}
                >
                  Remove
                </button>
              </div>
              <textarea
                className="mt-2 min-h-[54px] w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                placeholder="Mitigation plan"
                value={r.mitigation}
                onChange={(e) => updateRisk(r.id, { mitigation: e.target.value })}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="print-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/70">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Machine comparison schedule</h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No machines added yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
            <table className="min-w-full text-left text-sm bg-white dark:bg-zinc-900/60">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400">
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Model</th>
                  <th className="px-2 py-2 font-medium">Qty</th>
                  <th className="px-2 py-2 font-medium">Priority</th>
                  <th className="px-2 py-2 font-medium">Image</th>
                  <th className="px-2 py-2 font-medium">Platform</th>
                  <th className="px-2 py-2 font-medium">Location</th>
                  <th className="px-2 py-2 font-medium">Product link</th>
                  <th className="px-2 py-2 font-medium">Compared (1 / 2 / 3)</th>
                  <th className="px-2 py-2 font-medium">Lowest</th>
                  <th className="px-2 py-2 font-medium">Highest</th>
                  <th className="px-2 py-2 font-medium">Gap</th>
                  <th className="px-2 py-2 font-medium">Chosen</th>
                  <th className="px-2 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-2 py-2">{r.machineType}</td>
                    <td className="px-2 py-2">{r.machineModel}</td>
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
                    <td className="px-2 py-2">
                      {toInr(r.price1)} / {toInr(r.price2)} / {toInr(r.price3)}
                    </td>
                    <td className="px-2 py-2 text-emerald-700 dark:text-emerald-300">{toInr(rowMin(r))}</td>
                    <td className="px-2 py-2 text-violet-700 dark:text-violet-300">{toInr(rowMax(r))}</td>
                    <td className="px-2 py-2 font-medium text-amber-700 dark:text-amber-300">{toInr(Math.max(0, rowMax(r) - rowMin(r)))}</td>
                    <td className="px-2 py-2 font-semibold">{toInr(r.chosenPrice * r.qty)}</td>
                    <td className="px-2 py-2">
                      <button type="button" className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:text-rose-300" onClick={() => removeRow(r.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="print-card rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Declaration</h2>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          I hereby confirm that this project report and machine pricing details are true to the best of my knowledge and are prepared for bank funding assessment for service-center business expansion.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Authorized signatory</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{meta.signatoryName || "—"}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Date</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{meta.reportDate || "—"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "emerald" | "blue" | "violet" | "amber";
}) {
  const tones: Record<string, string> = {
    default: "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60",
    emerald: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30",
    blue: "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30",
    violet: "border-violet-200 bg-violet-50 dark:border-violet-900/50 dark:bg-violet-950/30",
    amber: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone] || tones.default}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function ChecklistToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-zinc-400" />
      {label}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date";
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      <input
        type={type}
        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      <input
        type="number"
        min={0}
        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
