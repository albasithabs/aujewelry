"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Trash2, RotateCcw, Copy, Check, Info, ChevronDown, ChevronUp } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HargaPresetItem {
  berat: string;
  harga: number;
}

interface HargaPresetGroup {
  id: string;
  nama: string;
  items: HargaPresetItem[];
}

interface AddonItem {
  id: string;
  nama: string;
  harga: number;
}

interface AcrylicItem {
  id: string;
  nama: string;
  harga: number;
  includeBox: boolean;
}

interface BarisItem {
  id: string;
  label: string;
  hargaPerGram: number | "";
  berat: number | "";
  hargaEmas: number | "";
  addonId: string;
  acrylicId: string;
  designFee: number | "";
}

interface HasilBaris {
  id: string;
  label: string;
  hargaPerGram?: number;
  berat?: number;
  hargaNota: number;
  addonNama: string;
  addonHarga: number;
  acrylicNama: string;
  acrylicHarga: number;
  designFee: number;
  totalModal: number;
  // Fee breakdown
  biayaAdmin: number;
  biayaAdminRate: number;
  biayaGoXtra: number;
  biayaPromoXtra: number;
  biayaLiveXtra: number;
  biayaPreOrder: number;
  biayaProses: number;
  totalBiaya: number;
  chargeRate: number;
  hargaJualFinal: number;
  danaDiterima: number;
}

// ---------------------------------------------------------------------------
// Program rates
// ---------------------------------------------------------------------------

const SHOPEE_GO_XTRA_RATE = 1.5;
const SHOPEE_PROMO_XTRA_RATE = 4.5;
const SHOPEE_LIVE_XTRA_RATE = 3;
const SHOPEE_LIVE_XTRA_RATE_WITH_PROMO = 2;
const SHOPEE_PRE_ORDER_RATE = 3;
const SHOPEE_BIAYA_PROSES = 1250;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRupiah(num: number): string {
  return "Rp " + Math.round(num).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatThousand(num: number | ""): string {
  if (num === "" || num === 0) return "";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseThousand(str: string): number | "" {
  const cleaned = str.replace(/\./g, "");
  if (cleaned === "") return "";
  const num = Number(cleaned);
  return isNaN(num) ? "" : num;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 transition hover:bg-gray-50 hover:text-gray-700" title="Copy harga">
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function RupiahInput({ value, onChange, placeholder }: { value: number | ""; onChange: (val: number | "") => void; placeholder?: string }) {
  const [displayValue, setDisplayValue] = useState(formatThousand(value));

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "").replace(/\./g, "");
    if (raw === "") { setDisplayValue(""); onChange(""); return; }
    const num = Number(raw);
    if (!isNaN(num)) {
      setDisplayValue(num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."));
      onChange(num === 0 ? "" : num);
    }
  }, [onChange]);

  const formatted = formatThousand(value);
  if (formatted !== displayValue && value !== parseThousand(displayValue)) {
    setDisplayValue(formatted);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
      <input type="text" inputMode="numeric" value={displayValue} onChange={handleChange} placeholder={placeholder || "0"} className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-base sm:text-sm text-gray-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
    </div>
  );
}

function ToggleOption({ label, checked, onChange, detail }: { label: string; checked: boolean; onChange: (v: boolean) => void; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <span className="text-sm text-gray-700">{label}</span>
        {detail && <span className="ml-1 text-xs text-gray-400">({detail})</span>}
      </div>
      <button type="button" onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-teal-600" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function KalkulatorEmasPage() {
  // Base charge (sudah include admin + buffer)
  const [baseCharge, setBaseCharge] = useState(6);

  // Program toggles (menambah charge)
  const [ikutGoXtra, setIkutGoXtra] = useState(false);
  const [ikutPromoXtra, setIkutPromoXtra] = useState(false);
  const [ikutLiveXtra, setIkutLiveXtra] = useState(false);
  const [isPreOrder, setIsPreOrder] = useState(false);

  // Mode
  const [mode, setMode] = useState<"normal" | "akrilik">("normal");

  // Collapsible settings
  const [showSettings, setShowSettings] = useState(true);

  // Preset harga emas
  const [hargaPresets, setHargaPresets] = useState<HargaPresetGroup[]>([
    { id: "16k", nama: "16K", items: [{ berat: "0.5 gr", harga: 1066500 }, { berat: "1 gr", harga: 2033000 }, { berat: "2 gr", harga: 4066000 }, { berat: "3 gr", harga: 6099000 }, { berat: "5 gr", harga: 10165000 }, { berat: "10 gr", harga: 20330000 }] },
    { id: "antam-classic", nama: "Antam 24K (Classic)", items: [{ berat: "1 gr", harga: 3142000 }, { berat: "2 gr", harga: 6264000 }, { berat: "3 gr", harga: 9219000 }, { berat: "5 gr", harga: 15410000 }] },
    { id: "antam-press", nama: "Antam 24K (Press)", items: [{ berat: "0.5 gr", harga: 1660000 }, { berat: "1 gr", harga: 3304000 }, { berat: "2 gr", harga: 6616000 }, { berat: "3 gr", harga: 9805000 }, { berat: "5 gr", harga: 16349000 }] },
    { id: "ubs-press", nama: "UBS 24K (Press)", items: [{ berat: "0.5 gr", harga: 1510000 }, { berat: "1 gr", harga: 2830000 }, { berat: "2 gr", harga: 5699000 }] },
  ]);
  const [showHargaPresets, setShowHargaPresets] = useState(false);

  // Addon box
  const [addonList, setAddonList] = useState<AddonItem[]>([
    { id: "box-au", nama: "BOX AU", harga: 26000 },
    { id: "box-au-press", nama: "BOX AU PRESS", harga: 31000 },
    { id: "shanghai-set", nama: "SHANGHAI SET", harga: 31000 },
    { id: "box-exclusive", nama: "BOX EXCLUSIVE", harga: 80000 },
  ]);
  const [showAddonSettings, setShowAddonSettings] = useState(false);

  // Akrilik
  const [acrylicList, setAcrylicList] = useState<AcrylicItem[]>([
    { id: "grafit", nama: "Acrylic Grafit", harga: 150000, includeBox: false },
    { id: "uv", nama: "Acrylic + UV", harga: 175000, includeBox: false },
    { id: "cutting", nama: "Acrylic Cutting", harga: 200000, includeBox: false },
    { id: "case-box", nama: "Acrylic Case Box", harga: 140000, includeBox: true },
    { id: "uv-photo", nama: "Acrylic UV + Photo", harga: 275000, includeBox: false },
    { id: "standing", nama: "Standing Acrylic", harga: 250000, includeBox: false },
    { id: "custom", nama: "Custom Acrylic", harga: 285000, includeBox: false },
  ]);
  const [showAcrylicSettings, setShowAcrylicSettings] = useState(false);
  const [defaultDesignFee, setDefaultDesignFee] = useState(75000);

  // Rows
  const [rows, setRows] = useState<BarisItem[]>([
    { id: generateId(), label: "", hargaPerGram: "", berat: "", hargaEmas: "", addonId: "", acrylicId: "", designFee: "" },
  ]);

  // ---------------------------------------------------------------------------
  // Computed total charge
  // ---------------------------------------------------------------------------

  const totalCharge = useMemo(() => {
    let rate = baseCharge;
    if (ikutGoXtra) rate += SHOPEE_GO_XTRA_RATE;
    if (ikutPromoXtra) rate += SHOPEE_PROMO_XTRA_RATE;
    if (ikutLiveXtra) {
      rate += ikutPromoXtra ? SHOPEE_LIVE_XTRA_RATE_WITH_PROMO : SHOPEE_LIVE_XTRA_RATE;
    }
    if (isPreOrder) rate += SHOPEE_PRE_ORDER_RATE;
    return rate;
  }, [baseCharge, ikutGoXtra, ikutPromoXtra, ikutLiveXtra, isPreOrder]);

  // ---------------------------------------------------------------------------
  // Row management
  // ---------------------------------------------------------------------------

  const addRow = () => {
    setRows((prev) => [...prev, { id: generateId(), label: "", hargaPerGram: "", berat: "", hargaEmas: "", addonId: "", acrylicId: "", designFee: "" }]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof BarisItem, value: string | number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === "label" || field === "addonId" || field === "acrylicId") return { ...r, [field]: value as string };
        const num = value === "" ? "" : Number(value);
        return { ...r, [field]: num === 0 ? "" : num };
      })
    );
  };

  const resetAll = () => {
    setRows([{ id: generateId(), label: "", hargaPerGram: "", berat: "", hargaEmas: "", addonId: "", acrylicId: "", designFee: "" }]);
  };

  // Addon management
  const addAddon = () => setAddonList((prev) => [...prev, { id: generateId(), nama: "", harga: 0 }]);
  const removeAddon = (id: string) => {
    setAddonList((prev) => prev.filter((a) => a.id !== id));
    setRows((prev) => prev.map((r) => (r.addonId === id ? { ...r, addonId: "" } : r)));
  };
  const updateAddon = (id: string, field: "nama" | "harga", value: string | number) => {
    setAddonList((prev) => prev.map((a) => (a.id !== id ? a : field === "nama" ? { ...a, nama: value as string } : { ...a, harga: Number(value) || 0 })));
  };

  // ---------------------------------------------------------------------------
  // Calculation: Total Modal x (1 + totalCharge%) → bulatkan ke ribuan ke atas
  // ---------------------------------------------------------------------------

  function calculateRow(row: BarisItem, idx: number): HasilBaris | null {
    let hargaNota = 0;
    let hargaPerGramVal: number | undefined;
    let beratVal: number | undefined;

    if (mode === "normal") {
      const harga = typeof row.hargaPerGram === "number" ? row.hargaPerGram : 0;
      const berat = typeof row.berat === "number" ? row.berat : 0;
      if (harga <= 0 || berat <= 0) return null;
      hargaNota = Math.round(harga * berat);
      hargaPerGramVal = harga;
      beratVal = berat;
    } else {
      const hargaEmas = typeof row.hargaEmas === "number" ? row.hargaEmas : 0;
      if (hargaEmas <= 0) return null;
      hargaNota = hargaEmas;
    }

    const addon = row.addonId ? addonList.find((a) => a.id === row.addonId) : null;
    let addonHarga = addon ? addon.harga : 0;
    const addonNama = addon ? addon.nama : "";

    const acrylic = mode === "akrilik" && row.acrylicId ? acrylicList.find((a) => a.id === row.acrylicId) : null;
    const acrylicHarga = acrylic ? acrylic.harga : 0;
    const acrylicNama = acrylic ? acrylic.nama : "";

    const designFee = mode === "akrilik" ? (typeof row.designFee === "number" ? row.designFee : defaultDesignFee) : 0;

    // Jika akrilik sudah include box, addon box = 0
    if (acrylic?.includeBox) addonHarga = 0;

    const totalModal = hargaNota + addonHarga + acrylicHarga + designFee;

    // Reverse calc: cari harga jual supaya setelah dipotong semua biaya, dana diterima >= total modal
    // Dana diterima = hargaJual - (hargaJual × totalCharge%) - biayaProses
    // totalModal = hargaJual × (1 - totalCharge/100) - biayaProses
    // hargaJual = (totalModal + biayaProses) / (1 - totalCharge/100)
    const biayaProses = SHOPEE_BIAYA_PROSES;
    const hargaJualRaw = (totalModal + biayaProses) / (1 - totalCharge / 100);
    const hargaJualFinal = Math.ceil(hargaJualRaw / 1000) * 1000;

    // Hitung rincian biaya dari harga jual final
    const biayaAdminRate = baseCharge;
    const biayaAdmin = hargaJualFinal * (baseCharge / 100);
    const biayaGoXtra = ikutGoXtra ? hargaJualFinal * (SHOPEE_GO_XTRA_RATE / 100) : 0;
    const biayaPromoXtra = ikutPromoXtra ? hargaJualFinal * (SHOPEE_PROMO_XTRA_RATE / 100) : 0;
    const liveRate = ikutLiveXtra ? (ikutPromoXtra ? SHOPEE_LIVE_XTRA_RATE_WITH_PROMO : SHOPEE_LIVE_XTRA_RATE) : 0;
    const biayaLiveXtra = hargaJualFinal * (liveRate / 100);
    const biayaPreOrder = isPreOrder ? hargaJualFinal * (SHOPEE_PRE_ORDER_RATE / 100) : 0;
    const totalBiaya = biayaAdmin + biayaGoXtra + biayaPromoXtra + biayaLiveXtra + biayaPreOrder + biayaProses;
    const danaDiterima = hargaJualFinal - totalBiaya;

    return {
      id: row.id,
      label: row.label || `Baris ${idx + 1}`,
      hargaPerGram: hargaPerGramVal,
      berat: beratVal,
      hargaNota,
      addonNama,
      addonHarga,
      acrylicNama,
      acrylicHarga,
      designFee,
      totalModal,
      biayaAdmin,
      biayaAdminRate,
      biayaGoXtra,
      biayaPromoXtra,
      biayaLiveXtra,
      biayaPreOrder,
      biayaProses,
      totalBiaya,
      chargeRate: totalCharge,
      hargaJualFinal,
      danaDiterima,
    };
  }

  const results = useMemo(
    () => rows.map((r, i) => calculateRow(r, i)).filter(Boolean) as HasilBaris[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, totalCharge, mode, addonList, acrylicList, defaultDesignFee, baseCharge, ikutGoXtra, ikutPromoXtra, ikutLiveXtra, isPreOrder]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kalkulator Harga Emas</h1>
        <p className="mt-1 text-sm text-gray-500">Hitung harga jual emas di Shopee — Total Modal + Charge% dibulatkan ke ribuan</p>
      </div>

      {/* Penjelasan */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-xs text-blue-700">
          <strong>Fungsi:</strong> Menentukan <strong>harga jual</strong> yang harus kamu pasang di Shopee, supaya setelah dipotong semua biaya platform, dana yang kamu terima tetap ≥ modal.
        </p>
        <p className="mt-1 text-[11px] text-blue-600">
          💡 Beda dengan Kalkulator Shopee yang fungsinya untuk <em>mengecek potongan</em> dari harga yang sudah ditentukan.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
        <button onClick={() => setMode("normal")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${mode === "normal" ? "bg-amber-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>Normal</button>
        <button onClick={() => setMode("akrilik")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${mode === "akrilik" ? "bg-violet-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>Akrilik PO</button>
      </div>

      {/* Settings */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <button type="button" onClick={() => setShowSettings(!showSettings)} className="flex w-full items-center justify-between px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-800">Pengaturan</h2>
          </div>
          {showSettings ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {showSettings && (
          <div className="border-t border-gray-100 px-3 pb-4 sm:px-5 sm:pb-5 space-y-5">

            {/* Charge % */}
            <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">%</div>
                <span className="text-sm font-bold text-gray-800">Charge Shopee</span>
              </div>

              {/* Base charge */}
              <div className="mb-3">
                <p className="mb-2 text-xs text-gray-600">Base Charge (admin + buffer fluktuasi harga):</p>
                <div className="flex flex-wrap items-center gap-3">
                  <input type="number" step="0.5" min={0} max={50} value={baseCharge} onChange={(e) => setBaseCharge(Number(e.target.value) || 0)} className="w-20 rounded-lg border border-teal-300 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
                  <span className="text-sm text-gray-600">%</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[4.5, 5, 6, 7, 8].map((v) => (
                      <button key={v} onClick={() => setBaseCharge(v)} className={`rounded-md px-2 py-1 text-xs font-medium transition ${baseCharge === v ? "bg-teal-600 text-white" : "border border-teal-200 bg-white text-teal-700 hover:bg-teal-50"}`}>{v}%</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Program tambahan */}
              <div className="border-t border-teal-200/50 pt-3 space-y-2.5">
                <p className="text-xs font-medium text-gray-600">Program Tambahan (otomatis nambah ke charge):</p>
                <ToggleOption label="GO XTRA" detail={`+${SHOPEE_GO_XTRA_RATE}%`} checked={ikutGoXtra} onChange={setIkutGoXtra} />
                <ToggleOption label="Promo XTRA" detail={`+${SHOPEE_PROMO_XTRA_RATE}%`} checked={ikutPromoXtra} onChange={setIkutPromoXtra} />
                <ToggleOption label="Live XTRA" detail={ikutPromoXtra ? `+${SHOPEE_LIVE_XTRA_RATE_WITH_PROMO}% (diskon karena ikut Promo XTRA)` : `+${SHOPEE_LIVE_XTRA_RATE}%`} checked={ikutLiveXtra} onChange={setIkutLiveXtra} />
                <ToggleOption label="Pre Order" detail={`+${SHOPEE_PRE_ORDER_RATE}%`} checked={isPreOrder} onChange={setIsPreOrder} />
              </div>

              {/* Total charge summary */}
              <div className="mt-3 rounded-md bg-teal-100 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-teal-800">Total Charge:</span>
                  <span className="text-sm font-bold text-teal-800">{totalCharge}%</span>
                </div>
                <p className="mt-1 text-[10px] text-teal-600">
                  Rumus: Harga Jual = Total Modal x {(1 + totalCharge / 100).toFixed(4)} → bulatkan ke ribuan ke atas
                </p>
              </div>
            </div>

            {/* Harga Emas Hari Ini - hanya mode Akrilik */}
            {mode === "akrilik" && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-500 text-xs font-bold text-white">H</div>
                    <span className="text-sm font-bold text-gray-800">Harga Emas Hari Ini</span>
                  </div>
                  <button onClick={() => setShowHargaPresets(!showHargaPresets)} className="text-xs text-yellow-700 hover:text-yellow-900 font-medium">{showHargaPresets ? "Tutup" : "Edit Harga"}</button>
                </div>
                <p className="mb-3 text-xs text-gray-500">Update harga emas di awal hari.</p>

                {!showHargaPresets && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {hargaPresets.map((group) => (
                      <div key={group.id} className="rounded-md bg-yellow-100/60 px-3 py-2">
                        <p className="text-xs font-semibold text-yellow-800 mb-1">{group.nama}</p>
                        <div className="space-y-0.5">
                          {group.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-[11px]">
                              <span className="text-yellow-700">{item.berat}</span>
                              <span className="font-medium text-yellow-900">{formatRupiah(item.harga)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showHargaPresets && (
                  <div className="space-y-4 border-t border-yellow-200 pt-3">
                    {hargaPresets.map((group, gIdx) => (
                      <div key={group.id} className="rounded-md border border-yellow-200 bg-white p-3">
                        <input type="text" value={group.nama} onChange={(e) => { const u = [...hargaPresets]; u[gIdx] = { ...u[gIdx], nama: e.target.value }; setHargaPresets(u); }} className="mb-2 w-full rounded border border-yellow-200 px-2 py-1 text-sm font-semibold text-gray-800 outline-none focus:border-yellow-400" />
                        <div className="space-y-1.5">
                          {group.items.map((item, iIdx) => (
                            <div key={iIdx} className="flex items-center gap-2">
                              <input type="text" value={item.berat} onChange={(e) => { const u = [...hargaPresets]; u[gIdx].items[iIdx] = { ...item, berat: e.target.value }; setHargaPresets(u); }} className="w-20 rounded border border-yellow-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-yellow-400" />
                              <div className="relative flex-1">
                                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">Rp</span>
                                <input type="number" min={0} value={item.harga} onChange={(e) => { const u = [...hargaPresets]; u[gIdx].items[iIdx] = { ...item, harga: Number(e.target.value) || 0 }; setHargaPresets(u); }} className="w-full rounded border border-yellow-200 py-1 pl-7 pr-2 text-xs text-gray-800 outline-none focus:border-yellow-400" />
                              </div>
                              <button onClick={() => { const u = [...hargaPresets]; u[gIdx].items.splice(iIdx, 1); setHargaPresets(u); }} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={12} /></button>
                            </div>
                          ))}
                          <button onClick={() => { const u = [...hargaPresets]; u[gIdx].items.push({ berat: "", harga: 0 }); setHargaPresets(u); }} className="text-[11px] text-yellow-600 hover:text-yellow-800 font-medium">+ Tambah berat</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setHargaPresets((prev) => [...prev, { id: generateId(), nama: "Kategori Baru", items: [{ berat: "1 gr", harga: 0 }] }])} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-yellow-300 px-3 py-2 text-xs font-medium text-yellow-600 transition hover:bg-yellow-100"><Plus size={14} />Tambah Kategori</button>
                  </div>
                )}
              </div>
            )}

            {/* Addon Box */}
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500 text-xs font-bold text-white">B</div>
                  <span className="text-sm font-bold text-gray-800">Addon / Box</span>
                </div>
                <button onClick={() => setShowAddonSettings(!showAddonSettings)} className="text-xs text-purple-600 hover:text-purple-800 font-medium">{showAddonSettings ? "Tutup" : "Edit Addon"}</button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {addonList.map((addon) => (
                  <span key={addon.id} className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">{addon.nama}: {formatRupiah(addon.harga)}</span>
                ))}
              </div>
              {showAddonSettings && (
                <div className="space-y-2 border-t border-purple-200 pt-3">
                  {addonList.map((addon) => (
                    <div key={addon.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input type="text" value={addon.nama} onChange={(e) => updateAddon(addon.id, "nama", e.target.value)} placeholder="Nama addon" className="flex-1 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                        <input type="number" min={0} value={addon.harga} onChange={(e) => updateAddon(addon.id, "harga", e.target.value)} className="w-full sm:w-32 rounded-lg border border-purple-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
                      </div>
                      <button onClick={() => removeAddon(addon.id)} className="self-end sm:self-auto rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button onClick={addAddon} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-purple-300 px-3 py-2 text-xs font-medium text-purple-600 transition hover:bg-purple-100"><Plus size={14} />Tambah Addon Baru</button>
                </div>
              )}
            </div>

            {/* Akrilik Settings */}
            {mode === "akrilik" && (
              <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500 text-xs font-bold text-white">A</div>
                    <span className="text-sm font-bold text-gray-800">Pengaturan Akrilik</span>
                  </div>
                  <button onClick={() => setShowAcrylicSettings(!showAcrylicSettings)} className="text-xs text-violet-600 hover:text-violet-800 font-medium">{showAcrylicSettings ? "Tutup" : "Edit Akrilik"}</button>
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="text-xs text-gray-600">Default Design Fee:</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                    <input type="number" min={0} value={defaultDesignFee} onChange={(e) => setDefaultDesignFee(Number(e.target.value) || 0)} className="w-36 rounded-lg border border-violet-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {acrylicList.map((ac) => (
                    <span key={ac.id} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">{ac.nama}: {formatRupiah(ac.harga)}{ac.includeBox ? " (incl. box)" : ""}</span>
                  ))}
                </div>
                {showAcrylicSettings && (
                  <div className="space-y-2 border-t border-violet-200 pt-3">
                    {acrylicList.map((ac) => (
                      <div key={ac.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input type="text" value={ac.nama} onChange={(e) => setAcrylicList((prev) => prev.map((a) => a.id === ac.id ? { ...a, nama: e.target.value } : a))} placeholder="Nama akrilik" className="flex-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                          <input type="number" min={0} value={ac.harga} onChange={(e) => setAcrylicList((prev) => prev.map((a) => a.id === ac.id ? { ...a, harga: Number(e.target.value) || 0 } : a))} className="w-full sm:w-32 rounded-lg border border-violet-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-[10px] text-violet-600 whitespace-nowrap">
                            <input type="checkbox" checked={ac.includeBox} onChange={(e) => setAcrylicList((prev) => prev.map((a) => a.id === ac.id ? { ...a, includeBox: e.target.checked } : a))} className="h-3.5 w-3.5 accent-violet-600" />
                            Incl. Box
                          </label>
                          <button onClick={() => setAcrylicList((prev) => prev.filter((a) => a.id !== ac.id))} className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setAcrylicList((prev) => [...prev, { id: generateId(), nama: "", harga: 0, includeBox: false }])} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-violet-300 px-3 py-2 text-xs font-medium text-violet-600 transition hover:bg-violet-100"><Plus size={14} />Tambah Tipe Akrilik</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Rows */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Data Produk</h2>
          <div className="flex gap-2">
            <button onClick={addRow} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 active:scale-[0.98]"><Plus size={14} />Tambah Baris</button>
            <button onClick={resetAll} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"><RotateCcw size={14} />Reset</button>
          </div>
        </div>

        {/* Quick Karat Presets - mode normal */}
        {mode === "normal" && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-gray-500">Karat Preset:</p>
            <div className="flex flex-wrap gap-1.5">
              {["6K", "8K", "9K", "16K", "17K", "18K", "22K", "24K"].map((k) => {
                const isUsed = rows.some((r) => r.label === k);
                return (
                  <button key={k} onClick={() => setRows((prev) => [...prev, { id: generateId(), label: k, hargaPerGram: "", berat: "", hargaEmas: "", addonId: "", acrylicId: "", designFee: "" }])} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${isUsed ? "border-teal-500 bg-teal-500 text-white" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"}`}>
                    {k} {isUsed && "✓"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Table Header */}
        {mode === "normal" ? (
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_0.8fr_1fr_40px] sm:gap-3 sm:px-1 sm:pb-2">
            <span className="text-xs font-medium text-gray-400">Label</span>
            <span className="text-xs font-medium text-gray-400">Harga/Gram</span>
            <span className="text-xs font-medium text-gray-400">Berat</span>
            <span className="text-xs font-medium text-gray-400">Box</span>
            <span></span>
          </div>
        ) : (
          <div className="hidden sm:grid sm:grid-cols-[1fr_1.2fr_1fr_40px] sm:gap-3 sm:px-1 sm:pb-2">
            <span className="text-xs font-medium text-gray-400">Label</span>
            <span className="text-xs font-medium text-gray-400">Harga Emas</span>
            <span className="text-xs font-medium text-gray-400">Box</span>
            <span></span>
          </div>
        )}

        {/* Rows */}
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={row.id} className={`grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3 sm:items-center sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 ${mode === "normal" ? "sm:grid-cols-[1fr_1fr_0.8fr_1fr_40px]" : "sm:grid-cols-[1fr_1.2fr_1fr_40px]"}`}>
              <div>
                <label className="mb-1 block text-xs text-gray-400 sm:hidden">Label</label>
                <input type="text" list={`karat-list-${row.id}`} value={row.label} onChange={(e) => updateRow(row.id, "label", e.target.value)} placeholder="Misal: 17K" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm text-gray-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                <datalist id={`karat-list-${row.id}`}>{["6K", "8K", "9K", "16K", "17K", "18K", "22K", "24K"].map((k) => <option key={k} value={k} />)}</datalist>
              </div>

              {mode === "normal" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400 sm:hidden">Harga/Gram</label>
                    <RupiahInput value={row.hargaPerGram} onChange={(val) => updateRow(row.id, "hargaPerGram", val === "" ? "" : val)} placeholder="1.640.000" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400 sm:hidden">Berat (gram)</label>
                    <div className="relative">
                      <input type="number" min={0} step="0.01" value={row.berat} onChange={(e) => updateRow(row.id, "berat", e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-8 text-base sm:text-sm text-gray-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">gr</span>
                    </div>
                  </div>
                </>
              )}

              {mode === "akrilik" && (
                <div>
                  <label className="mb-1 block text-xs text-gray-400 sm:hidden">Harga Emas</label>
                  <select value={row.hargaEmas === "" ? "" : row.hargaEmas.toString()} onChange={(e) => updateRow(row.id, "hargaEmas", e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm text-gray-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
                    <option value="">Pilih Harga Emas</option>
                    {hargaPresets.map((group) => (
                      <optgroup key={group.id} label={group.nama}>
                        {group.items.map((item, i) => <option key={`${group.id}-${i}`} value={item.harga}>{group.nama} {item.berat} - {formatRupiah(item.harga)}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-gray-400 sm:hidden">Box</label>
                <select value={row.addonId} onChange={(e) => updateRow(row.id, "addonId", e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm text-gray-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" disabled={mode === "akrilik" && !!row.acrylicId && acrylicList.find((a) => a.id === row.acrylicId)?.includeBox}>
                  <option value="">Tanpa Box</option>
                  {addonList.map((addon) => <option key={addon.id} value={addon.id}>{addon.nama} ({formatRupiah(addon.harga)})</option>)}
                </select>
                {mode === "akrilik" && row.acrylicId && acrylicList.find((a) => a.id === row.acrylicId)?.includeBox && (
                  <p className="mt-1 text-[10px] text-violet-500">Box sudah termasuk akrilik</p>
                )}
              </div>

              <div className="flex items-center justify-end sm:justify-center">
                <button onClick={() => removeRow(row.id)} disabled={rows.length <= 1} className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 size={16} /></button>
              </div>

              {/* Akrilik fields */}
              {mode === "akrilik" && (
                <div className="col-span-full grid grid-cols-1 gap-2 rounded-lg border border-violet-100 bg-violet-50/50 p-3 sm:grid-cols-2 sm:gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-violet-600">Tipe Akrilik</label>
                    <select value={row.acrylicId} onChange={(e) => updateRow(row.id, "acrylicId", e.target.value)} className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-base sm:text-sm text-gray-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
                      <option value="">Tanpa Akrilik</option>
                      {acrylicList.map((ac) => <option key={ac.id} value={ac.id}>{ac.nama} ({formatRupiah(ac.harga)}){ac.includeBox ? " - incl. box" : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-violet-600">Design / Custom Fee</label>
                    <RupiahInput value={typeof row.designFee === "number" ? row.designFee : defaultDesignFee} onChange={(val) => updateRow(row.id, "designFee", val === "" ? "" : val)} placeholder="75.000" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Hasil Perhitungan ({results.length} produk)</h2>

          {results.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">{r.label}</h3>
                  {r.hargaPerGram && r.berat && <span className="text-xs text-gray-400">{formatRupiah(r.hargaPerGram)}/gr x {r.berat} gr</span>}
                </div>
              </div>

              <div className="p-3 sm:p-5">
                {/* Step 1: Rincian Modal */}
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Rincian Modal</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Harga Emas</span>
                      <span className="text-sm font-medium text-gray-800">{formatRupiah(r.hargaNota)}</span>
                    </div>
                    {r.acrylicHarga > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-violet-600">Akrilik: {r.acrylicNama}</span>
                        <span className="text-sm font-medium text-violet-700">+ {formatRupiah(r.acrylicHarga)}</span>
                      </div>
                    )}
                    {r.designFee > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-violet-600">Design / Custom Fee</span>
                        <span className="text-sm font-medium text-violet-700">+ {formatRupiah(r.designFee)}</span>
                      </div>
                    )}
                    {r.addonHarga > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-purple-600">Box: {r.addonNama}</span>
                        <span className="text-sm font-medium text-purple-700">+ {formatRupiah(r.addonHarga)}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
                    <span className="text-sm font-semibold text-gray-700">Total Modal</span>
                    <span className="text-sm font-bold text-gray-900">{formatRupiah(r.totalModal)}</span>
                  </div>
                </div>

                {/* Step 2: Harga Jual */}
                <div className="rounded-lg bg-teal-600 px-4 py-3 mb-4">
                  <p className="text-[10px] uppercase tracking-wide text-teal-200 mb-1">Harga yang diinput di Shopee</p>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-bold text-white">HARGA JUAL</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">{formatRupiah(r.hargaJualFinal)}</span>
                      <CopyBtn text={r.hargaJualFinal.toString()} />
                    </div>
                  </div>
                </div>

                {/* Step 3: Rincian Biaya Shopee */}
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Rincian Biaya Shopee</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Biaya Admin <span className="text-xs text-gray-400">({r.biayaAdminRate}%)</span></span>
                      <span className="text-sm text-gray-800">{formatRupiah(r.biayaAdmin)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Biaya GO XTRA <span className="text-xs text-gray-400">({SHOPEE_GO_XTRA_RATE}%)</span></span>
                      <span className="text-sm text-gray-800">{formatRupiah(r.biayaGoXtra)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Biaya Promo XTRA <span className="text-xs text-gray-400">({SHOPEE_PROMO_XTRA_RATE}%)</span></span>
                      <span className="text-sm text-gray-800">{formatRupiah(r.biayaPromoXtra)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Biaya Live XTRA <span className="text-xs text-gray-400">({ikutLiveXtra ? (ikutPromoXtra ? SHOPEE_LIVE_XTRA_RATE_WITH_PROMO : SHOPEE_LIVE_XTRA_RATE) : 0}%)</span></span>
                      <span className="text-sm text-gray-800">{formatRupiah(r.biayaLiveXtra)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Biaya Pre Order <span className="text-xs text-gray-400">({isPreOrder ? SHOPEE_PRE_ORDER_RATE : 0}%)</span></span>
                      <span className="text-sm text-gray-800">{formatRupiah(r.biayaPreOrder)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Biaya Proses Pesanan</span>
                      <span className="text-sm text-gray-800">{formatRupiah(r.biayaProses)}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
                    <span className="text-sm font-semibold text-gray-700">Total Biaya</span>
                    <span className="text-sm font-bold text-gray-900">{formatRupiah(r.totalBiaya)}</span>
                  </div>
                </div>

                {/* Step 4: Dana Diterima */}
                <div className={`rounded-lg px-4 py-3 ${r.danaDiterima >= r.totalModal ? "bg-green-50" : "bg-red-50"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${r.danaDiterima >= r.totalModal ? "text-green-700" : "text-red-700"}`}>Dana Diterima</span>
                    <span className={`text-lg font-bold ${r.danaDiterima >= r.totalModal ? "text-green-700" : "text-red-700"}`}>{formatRupiah(r.danaDiterima)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Setelah dipotong semua biaya Shopee</p>
                </div>

                {/* Percentage */}
                <div className="mt-2 text-xs text-gray-400">
                  Total potongan: <span className="font-semibold text-gray-600">{r.hargaJualFinal > 0 ? ((r.totalBiaya / r.hargaJualFinal) * 100).toFixed(1) : "0"}%</span> dari harga jual
                </div>
              </div>
            </div>
          ))}

          {/* Summary */}
          {results.length > 1 && (
            <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Ringkasan</h3>
              <div className="-mx-3 sm:mx-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Produk</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Modal</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-teal-600">Harga Jual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-800">{r.label}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{formatRupiah(r.totalModal)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-teal-700">{formatRupiah(r.hargaJualFinal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-gray-800">TOTAL</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatRupiah(results.reduce((s, r) => s + r.totalModal, 0))}</td>
                      <td className="px-3 py-2 text-right font-bold text-teal-700">{formatRupiah(results.reduce((s, r) => s + r.hargaJualFinal, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-400">Masukkan data produk di atas untuk melihat hasil perhitungan.</p>
        </div>
      )}
    </div>
  );
}
