"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/audioSound";

export interface BayJob {
  id: string;
  vehicleNo: string;
  model: string;
  customerName: string;
  phone: string;
  servicePackage: string;
  technician: string;
  odometerKm: number;
  bayName: string;
  stage: "intake" | "inspection" | "service" | "quality_check" | "ready";
  createdAt: string;
  estimatedHours: number;
  notes?: string;
}

const DEFAULT_BAYS = [
  { id: "bay-1", name: "Bay 1 • Two-Post Hydraulic Lift", type: "Mechanical & Brakes", icon: "🔧" },
  { id: "bay-2", name: "Bay 2 • Wheel Alignment & Suspension", type: "Precision Alignment", icon: "📐" },
  { id: "bay-3", name: "Bay 3 • Ceramic & Paint Booth", type: "Detailing & Wrap", icon: "✨" },
  { id: "bay-4", name: "Bay 4 • Foam Wash & Steam Deck", type: "Wash & Detailing", icon: "🚿" },
  { id: "bay-5", name: "Bay 5 • Quick Intake & Diagnostic Ramp", type: "Inspection & OBD2", icon: "⚡" },
];

const STAGES: { key: BayJob["stage"]; label: string; color: string; badge: string }[] = [
  { key: "intake", label: "1. Intake & Check-In", color: "border-blue-500/40 bg-blue-500/10 text-blue-400", badge: "📥 Received" },
  { key: "inspection", label: "2. Lift Inspection", color: "border-amber-500/40 bg-amber-500/10 text-amber-400", badge: "🔍 Inspecting" },
  { key: "service", label: "3. Parts & Detailing", color: "border-purple-500/40 bg-purple-500/10 text-purple-400", badge: "⚙️ In Progress" },
  { key: "quality_check", label: "4. QC & Foam Wash", color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400", badge: "✨ Quality Check" },
  { key: "ready", label: "5. Ready for Delivery", color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400", badge: "✅ Ready" },
];

const INITIAL_JOBS: BayJob[] = [
  {
    id: "JOB-101",
    vehicleNo: "KA 01 MG 9420",
    model: "BMW M340i xDrive",
    customerName: "Vikram Malhotra",
    phone: "9880011223",
    servicePackage: "Full Synthetic Service + Ceramic Coating",
    technician: "Ramesh (Master Tech)",
    odometerKm: 42500,
    bayName: "Bay 3 • Ceramic & Paint Booth",
    stage: "service",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    estimatedHours: 4,
    notes: "Customer requested extra gloss finish on front bumper wrap",
  },
  {
    id: "JOB-102",
    vehicleNo: "MH 02 CZ 4401",
    model: "Mercedes-Benz E220d",
    customerName: "Aditya Roy",
    phone: "9820155432",
    servicePackage: "Brake Pad Replacement & Disc Skimming",
    technician: "Anand (Brakes Specialist)",
    odometerKm: 68000,
    bayName: "Bay 1 • Two-Post Hydraulic Lift",
    stage: "inspection",
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    estimatedHours: 2.5,
    notes: "Front right sensor warning check",
  },
  {
    id: "JOB-103",
    vehicleNo: "DL 08 CC 7799",
    model: "Porsche Macan GTS",
    customerName: "Siddharth Verma",
    phone: "9811099887",
    servicePackage: "Full Studio Detailing & Underbody Shield",
    technician: "Karan (Detailing Lead)",
    odometerKm: 31000,
    bayName: "Bay 4 • Foam Wash & Steam Deck",
    stage: "ready",
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    estimatedHours: 5,
    notes: "Delivered complimentary air freshener & car cover",
  },
];

export default function AutomotiveBayBoard() {
  const [jobs, setJobs] = useState<BayJob[]>([]);
  const [activeTab, setActiveTab] = useState<"kanban" | "floorplan">("kanban");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Form State for New Job Card
  const [vehicleNo, setVehicleNo] = useState("");
  const [model, setModel] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [servicePackage, setServicePackage] = useState("Full Engine Service & Diagnostic");
  const [technician, setTechnician] = useState("Ramesh (Master Tech)");
  const [odometerKm, setOdometerKm] = useState(35000);
  const [bayName, setBayName] = useState(DEFAULT_BAYS[0].name);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("DREAMLANE_BAY_JOBS_V1");
      if (stored) {
        setJobs(JSON.parse(stored));
      } else {
        setJobs(INITIAL_JOBS);
        localStorage.setItem("DREAMLANE_BAY_JOBS_V1", JSON.stringify(INITIAL_JOBS));
      }
    } catch {
      setJobs(INITIAL_JOBS);
    }
  }, []);

  const saveJobs = (updated: BayJob[]) => {
    setJobs(updated);
    try {
      localStorage.setItem("DREAMLANE_BAY_JOBS_V1", JSON.stringify(updated));
    } catch {
      // Local storage fallback
    }
  };

  const advanceStage = (jobId: string) => {
    const stageOrder: BayJob["stage"][] = ["intake", "inspection", "service", "quality_check", "ready"];
    const updated = jobs.map((job) => {
      if (job.id === jobId) {
        const currentIndex = stageOrder.indexOf(job.stage);
        const nextStage = stageOrder[Math.min(currentIndex + 1, stageOrder.length - 1)];
        if (nextStage === "ready") {
          sound.carReady();
        } else {
          sound.stageBump();
        }
        return { ...job, stage: nextStage };
      }
      return job;
    });
    saveJobs(updated);
  };

  const createJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNo || !model || !customerName || !phone) return;

    const newJob: BayJob = {
      id: `JOB-${Math.floor(100 + Math.random() * 900)}`,
      vehicleNo: vehicleNo.toUpperCase(),
      model,
      customerName,
      phone,
      servicePackage,
      technician,
      odometerKm: Number(odometerKm) || 0,
      bayName,
      stage: "intake",
      createdAt: new Date().toISOString(),
      estimatedHours: 3,
      notes,
    };

    saveJobs([newJob, ...jobs]);
    sound.bookingReceived();

    // Reset Form
    setVehicleNo("");
    setModel("");
    setCustomerName("");
    setPhone("");
    setNotes("");
    setIsModalOpen(false);
  };

  const printThermalJobCard = (job: BayJob) => {
    sound.invoicePrint();
    const nextServiceKm = (job.odometerKm || 0) + 10000;
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>JOB CARD • ${job.vehicleNo}</title>
          <style>
            @page { size: 80mm auto; margin: 5mm; }
            body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; padding: 10px; max-width: 320px; margin: auto; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .badge { border: 1px solid #000; padding: 2px 4px; font-size: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">DREAMLANE AUTO STUDIO</div>
          <div class="center" style="font-size: 10px;">Premium Detailing & Service Workshop</div>
          <div class="center" style="font-size: 10px;">Offline Workshop Job Card</div>
          <div class="divider"></div>
          <div class="row"><span class="bold">JOB ID:</span> <span>${job.id}</span></div>
          <div class="row"><span class="bold">VEHICLE NO:</span> <span class="bold badge">${job.vehicleNo}</span></div>
          <div class="row"><span class="bold">CAR MODEL:</span> <span>${job.model}</span></div>
          <div class="row"><span class="bold">CUSTOMER:</span> <span>${job.customerName}</span></div>
          <div class="row"><span class="bold">PHONE:</span> <span>${job.phone}</span></div>
          <div class="row"><span class="bold">ODOMETER:</span> <span>${job.odometerKm.toLocaleString()} KM</span></div>
          <div class="row"><span class="bold">ASSIGNED BAY:</span> <span>${job.bayName}</span></div>
          <div class="row"><span class="bold">LEAD TECH:</span> <span>${job.technician}</span></div>
          <div class="divider"></div>
          <div class="bold">SERVICE PACKAGE:</div>
          <div>• ${job.servicePackage}</div>
          ${job.notes ? `<div style="margin-top:4px;"><span class="bold">NOTES:</span> ${job.notes}</div>` : ""}
          <div class="divider"></div>
          <div class="row"><span class="bold">NEXT SERVICE DUE:</span> <span class="bold">${nextServiceKm.toLocaleString()} KM</span></div>
          <div class="row"><span class="bold">EST. INTERVAL:</span> <span>6 Months / 10,000 KM</span></div>
          <div class="divider"></div>
          <div class="center" style="font-size: 10px; margin-top: 10px;">✓ Quality Checked by Dreamlane Studio</div>
          <div class="center" style="font-size: 9px; margin-top: 4px;">Thank you for trusting us with your car!</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const occupiedBays = new Set(jobs.filter((j) => j.stage !== "ready").map((j) => j.bayName));
  const activeJobsCount = jobs.filter((j) => j.stage !== "ready").length;
  const readyJobsCount = jobs.filter((j) => j.stage === "ready").length;

  return (
    <div className="space-y-6">
      {/* KPI Top Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Bay Lift Jobs</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{activeJobsCount}</span>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">In Workshop</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Ready for Delivery</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{readyJobsCount}</span>
            <span className="text-xs font-semibold text-emerald-600">QC Passed</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Bay Lift Utilization</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {Math.round((occupiedBays.size / DEFAULT_BAYS.length) * 100)}%
            </span>
            <span className="text-xs text-zinc-500">{occupiedBays.size}/{DEFAULT_BAYS.length} Lifts</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Offline Sound Chimes</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {audioEnabled ? "🔊 Chimes ON" : "🔇 Muted"}
            </span>
            <button
              type="button"
              onClick={() => setAudioEnabled(sound.toggle())}
              className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Toggle
            </button>
          </div>
        </div>
      </div>

      {/* Control Strip */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setActiveTab("kanban")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "kanban"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            🏎️ 5-Stage Kanban Bay Pipeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("floorplan")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "floorplan"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            🪑 Interactive Bay Lift Floorplan
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow-md shadow-amber-500/20 transition hover:bg-amber-400 active:scale-95"
        >
          <span>+</span> Create New Vehicle Job Card
        </button>
      </div>

      {/* TAB 1: 5-Stage Kanban Bay Pipeline */}
      {activeTab === "kanban" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {STAGES.map((stage) => {
            const stageJobs = jobs.filter((j) => j.stage === stage.key);
            return (
              <div
                key={stage.key}
                className="flex flex-col rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/60"
              >
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{stage.label}</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                    {stageJobs.length}
                  </span>
                </div>

                <div className="mt-2 flex flex-1 flex-col gap-3">
                  {stageJobs.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-300/70 p-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
                      No vehicles in this bay stage
                    </div>
                  ) : (
                    stageJobs.map((job) => (
                      <div
                        key={job.id}
                        className="group relative flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm transition hover:border-amber-500/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="rounded-md border border-zinc-300/80 bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                              {job.vehicleNo}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {job.odometerKm.toLocaleString()} KM
                            </span>
                          </div>

                          <h4 className="mt-2 text-xs font-bold text-zinc-900 dark:text-zinc-50">{job.model}</h4>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {job.servicePackage}
                          </p>

                          <div className="mt-2.5 flex items-center justify-between border-t border-zinc-100 pt-2 text-[10px] text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
                            <span>👤 {job.technician.split(" ")[0]}</span>
                            <span className="truncate text-amber-600 dark:text-amber-400">{job.bayName.split("•")[0]}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => printThermalJobCard(job)}
                            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            title="Print 80mm thermal slip"
                          >
                            🖨️ Print
                          </button>
                          {job.stage !== "ready" ? (
                            <button
                              type="button"
                              onClick={() => advanceStage(job.id)}
                              className="flex-1 rounded-lg bg-amber-500 py-1 text-[11px] font-semibold text-black hover:bg-amber-400 active:scale-95"
                            >
                              Bump ➔
                            </button>
                          ) : (
                            <span className="flex-1 text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Interactive Lift Bays & Detailing Decks */}
      {activeTab === "floorplan" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEFAULT_BAYS.map((bay) => {
            const currentJob = jobs.find((j) => j.bayName === bay.name && j.stage !== "ready");
            return (
              <div
                key={bay.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition ${
                  currentJob
                    ? "border-amber-500/50 bg-gradient-to-br from-amber-500/5 via-white to-white dark:from-amber-500/10 dark:via-zinc-900 dark:to-zinc-900"
                    : "border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{bay.icon}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        currentJob
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {currentJob ? "🔴 Lift Occupied" : "🟢 Lift Available"}
                    </span>
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">{bay.name}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{bay.type}</p>

                  {currentJob ? (
                    <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-50/50 p-3 dark:border-amber-500/30 dark:bg-amber-950/20">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                          {currentJob.vehicleNo}
                        </span>
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          {currentJob.stage.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-zinc-800 dark:text-zinc-200">{currentJob.model}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">Tech: {currentJob.technician}</p>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center justify-center rounded-xl border border-dashed border-zinc-200 p-4 text-xs text-zinc-400 dark:border-zinc-800">
                      Ready for next intake
                    </div>
                  )}
                </div>

                {currentJob && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => advanceStage(currentJob.id)}
                      className="w-full rounded-xl bg-amber-500 py-2 text-xs font-semibold text-black transition hover:bg-amber-400"
                    >
                      Advance Bay Stage ➔
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Create New Vehicle Job Card */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">🏎️ Create Vehicle Job Card</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={createJob} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Vehicle Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KA 01 MG 9420"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-mono font-bold uppercase focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Car Make & Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BMW M340i / Swift"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Customer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Current Odometer (KM)</label>
                  <input
                    type="number"
                    value={odometerKm}
                    onChange={(e) => setOdometerKm(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Assign Bay Lift</label>
                  <select
                    value={bayName}
                    onChange={(e) => setBayName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    {DEFAULT_BAYS.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Service Package</label>
                <input
                  type="text"
                  value={servicePackage}
                  onChange={(e) => setServicePackage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Technician Assigned</label>
                <select
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="Ramesh (Master Tech)">Ramesh (Master Tech)</option>
                  <option value="Anand (Brakes Specialist)">Anand (Brakes Specialist)</option>
                  <option value="Karan (Detailing Lead)">Karan (Detailing Lead)</option>
                  <option value="Pooja (Diagnostic Engineer)">Pooja (Diagnostic Engineer)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-semibold text-black shadow-md shadow-amber-500/20 hover:bg-amber-400 active:scale-95"
                >
                  Save & Punch Job Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
