"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, RotateCcw, Copy, Check, Info, ChevronDown, ChevronUp } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddonItem {
  id: string;
  nama: string;
  harga: number;
}

interface BarisItem {
  id: string;
  label: string;
  hargaPerGram: number | "";
  berat: number | "";
  addonId: string; // "" = tanpa addon
}

interface BiayaPlatform {
  adminRate: number;
  biayaAdmin: number;
  goXtraRate: number;
  biayaGoXtra: number;
  promoXtraRate: number;
  biayaPromoXtra: number;
  liveXtraRate: number;
  biayaLiveXtra: number;
  preOrderRate: number;
  biayaPreOrder: number;
  biayaProses: number;
  totalBiaya: number;
  totalBiayaPersen: number;
  hargaJualSebelumCeil: number;
  hargaJualFinal: number;
  danaDiterima: number;
  bufferAmount: number;
  targetDanaDiterima: number;
}

interface HasilBaris {
  id: string;
  label: string;
  hargaPerGram: number;
  berat: number;
  totalSebelum: number;
  hargaNota: number;
  addonNama: string;
  addonHarga: number;
  shopee: BiayaPlatform;
  tiktok: BiayaPlatform;
}

// ---------------------------------------------------------------------------
// Shopee config for Perhiasan/Emas
// ---------------------------------------------------------------------------

interface ShopeeConfig {
  statusPenjual: "star" | "non-star";
  jumlahPesanan: "lte50" | "gt50";
  ikutGoXtra: boolean;
  ikutPromoXtra: boolean;
  ikutLiveXtra: boolean;
  isPreOrder: boolean;
}

// Rates for Perhiasan Berharga / Logam Mulia
const SHOPEE_ADMIN_RATE = 0.0425; // 4.25%
const SHOPEE_GO_XTRA_RATE = 0.015; // 1.5%
const SHOPEE_GO_XTRA_MAX = 20000;
const SHOPEE_PROMO_XTRA_RATE = 0.045; // 4.5%
const SHOPEE_PROMO_XTRA_MAX = 60000;
const SHOPEE_LIVE_XTRA_RATE = 0.03; // 3%
const SHOPEE_LIVE_XTRA_RATE_WITH_PROMO = 0.02; // 2% jika ikut Promo XTRA
const SHOPEE_LIVE_XTRA_MAX = 20000;
const SHOPEE_PRE_ORDER_RATE = 0.03; // 3%
const SHOPEE_BIAYA_PROSES = 1250;

// ---------------------------------------------------------------------------
// TikTok Shop config
// ---------------------------------------------------------------------------

interface TiktokConfig {
  ikutFreeOngkir: boolean;
  ikutFlashSale: boolean;
}

const TIKTOK_KOMISI_RATE = 0.05; // 5% komisi
const TIKTOK_PAYMENT_RATE = 0.01; // 1% biaya payment
const TIKTOK_FREE_ONGKIR_RATE = 0.015; // 1.5% subsidi ongkir
const TIKTOK_FLASH_SALE_RATE = 0.01; // 1% flash sale fee

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRupiah(num: number): string {
  return "Rp " + Math.round(num).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function pct(rate: number): string {
  return (rate * 100).toFixed(2).replace(/\.?0+$/, "") + "%";
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
      title="Copy harga"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Rupiah input with thousand separator
// ---------------------------------------------------------------------------

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

function RupiahInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | "";
  onChange: (val: number | "") => void;
  placeholder?: string;
}) {
  const [displayValue, setDisplayValue] = useState(formatThousand(value));

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, "").replace(/\./g, "");
      if (raw === "") {
        setDisplayValue("");
        onChange("");
        return;
      }
      const num = Number(raw);
      if (!isNaN(num)) {
        setDisplayValue(num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."));
        onChange(num === 0 ? "" : num);
      }
    },
    [onChange]
  );

  // Sync display when value changes externally (e.g. reset)
  const formatted = formatThousand(value);
  if (formatted !== displayValue && value !== parseThousand(displayValue)) {
    setDisplayValue(formatted);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder || "0"}
        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-base sm:text-sm text-gray-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Radio helper
// ---------------------------------------------------------------------------

function RadioOption({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-teal-600"
      />
      {label}
    </label>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
  accent,
  detail,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <span className="text-sm text-gray-700">{label}</span>
        {detail && <span className="ml-1 text-xs text-gray-400">({detail})</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? accent : "bg-gray-300"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fee breakdown row
// ---------------------------------------------------------------------------

function FeeRow({
  label,
  amount,
  rate,
  maxCap,
}: {
  label: string;
  amount: number;
  rate?: number;
  maxCap?: number;
}) {
  if (amount === 0 && (rate === undefined || rate === 0)) return null;
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-gray-500">
        {label}
        {rate !== undefined && rate > 0 && (
          <span className="ml-1 text-gray-400">({pct(rate)})</span>
        )}
        {maxCap !== undefined && maxCap > 0 && (
          <span className="ml-1 text-gray-400">maks. {formatRupiah(maxCap)}</span>
        )}
      </span>
      <span className="text-xs font-medium text-gray-700">{formatRupiah(amount)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function KalkulatorEmasPage() {
  // Shopee settings
  const [shopeeConfig, setShopeeConfig] = useState<ShopeeConfig>({
    statusPenjual: "star",
    jumlahPesanan: "lte50",
    ikutGoXtra: false,
    ikutPromoXtra: false,
    ikutLiveXtra: false,
    isPreOrder: false,
  });

  // TikTok settings
  const [tiktokConfig, setTiktokConfig] = useState<TiktokConfig>({
    ikutFreeOngkir: false,
    ikutFlashSale: false,
  });

  // Platform toggle
  const [activePlatform, setActivePlatform] = useState<"shopee" | "tiktok">("shopee");

  // Buffer markup untuk fluktuasi harga emas
  const [bufferPersen, setBufferPersen] = useState(0);

  // Addon box/packaging
  const [addonList, setAddonList] = useState<AddonItem[]>([
    { id: "box-au", nama: "BOX AU", harga: 26000 },
    { id: "box-au-press", nama: "BOX AU PRESS", harga: 31000 },
    { id: "shanghai-set", nama: "SHANGHAI SET", harga: 31000 },
    { id: "box-exclusive", nama: "BOX EXCLUSIVE", harga: 80000 },
  ]);
  const [showAddonSettings, setShowAddonSettings] = useState(false);

  // Collapsible settings
  const [showSettings, setShowSettings] = useState(true);

  // Rows
  const [rows, setRows] = useState<BarisItem[]>([
    { id: generateId(), label: "", hargaPerGram: "", berat: "", addonId: "" },
  ]);

  // ---------------------------------------------------------------------------
  // Row management
  // ---------------------------------------------------------------------------

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: generateId(), label: "", hargaPerGram: "", berat: "", addonId: "" },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof BarisItem, value: string | number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === "label") return { ...r, label: value as string };
        if (field === "addonId") return { ...r, addonId: value as string };
        if (field === "hargaPerGram") {
          const num = value === "" ? "" : Number(value);
          return { ...r, hargaPerGram: num === 0 ? "" : num };
        }
        if (field === "berat") {
          const num = value === "" ? "" : Number(value);
          return { ...r, berat: num === 0 ? "" : num };
        }
        return r;
      })
    );
  };

  const resetAll = () => {
    setRows([{ id: generateId(), label: "", hargaPerGram: "", berat: "", addonId: "" }]);
    setShopeeConfig({
      statusPenjual: "star",
      jumlahPesanan: "lte50",
      ikutGoXtra: false,
      ikutPromoXtra: false,
      ikutLiveXtra: false,
      isPreOrder: false,
    });
    setTiktokConfig({
      ikutFreeOngkir: false,
      ikutFlashSale: false,
    });
    setBufferPersen(0);
  };

  // Addon management
  const addAddon = () => {
    setAddonList((prev) => [
      ...prev,
      { id: generateId(), nama: "", harga: 0 },
    ]);
  };

  const removeAddon = (id: string) => {
    setAddonList((prev) => prev.filter((a) => a.id !== id));
    // Remove addon from rows that use it
    setRows((prev) =>
      prev.map((r) => (r.addonId === id ? { ...r, addonId: "" } : r))
    );
  };

  const updateAddon = (id: string, field: "nama" | "harga", value: string | number) => {
    setAddonList((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (field === "nama") return { ...a, nama: value as string };
        return { ...a, harga: Number(value) || 0 };
      })
    );
  };

  // ---------------------------------------------------------------------------
  // Calculation
  // ---------------------------------------------------------------------------

  function calcShopee(hargaNota: number, addonHarga: number = 0): BiayaPlatform {
    // Buffer: target dana diterima = harga nota + addon + buffer
    const bufferAmount = hargaNota * (bufferPersen / 100);
    const targetDanaDiterima = hargaNota + addonHarga + bufferAmount;

    // Admin rate
    let adminRate = 0;
    if (shopeeConfig.statusPenjual === "star") {
      adminRate = SHOPEE_ADMIN_RATE;
    } else {
      adminRate = shopeeConfig.jumlahPesanan === "lte50" ? 0 : SHOPEE_ADMIN_RATE;
    }

    // GO XTRA
    const goXtraRate = shopeeConfig.ikutGoXtra ? SHOPEE_GO_XTRA_RATE : 0;

    // Promo XTRA
    const promoXtraRate = shopeeConfig.ikutPromoXtra ? SHOPEE_PROMO_XTRA_RATE : 0;

    // Live XTRA (2% jika ikut Promo XTRA juga, 3% jika tidak)
    let liveXtraRate = 0;
    if (shopeeConfig.ikutLiveXtra) {
      liveXtraRate = shopeeConfig.ikutPromoXtra
        ? SHOPEE_LIVE_XTRA_RATE_WITH_PROMO
        : SHOPEE_LIVE_XTRA_RATE;
    }

    // Pre Order
    const preOrderRate = shopeeConfig.isPreOrder ? SHOPEE_PRE_ORDER_RATE : 0;

    // Biaya proses
    const biayaProses = SHOPEE_BIAYA_PROSES;

    // Reverse calc: find hargaJual so that hargaJual - fees(hargaJual) = targetDanaDiterima
    const totalRateUncapped = adminRate + goXtraRate + promoXtraRate + liveXtraRate + preOrderRate;
    let hargaJualSebelumCeil = targetDanaDiterima / (1 - totalRateUncapped) + biayaProses / (1 - totalRateUncapped);

    // Iterative adjustment for capped fees
    for (let i = 0; i < 5; i++) {
      const h = hargaJualSebelumCeil;
      const aAdmin = h * adminRate;
      const aGoXtra = shopeeConfig.ikutGoXtra ? Math.min(h * SHOPEE_GO_XTRA_RATE, SHOPEE_GO_XTRA_MAX) : 0;
      const aPromoXtra = shopeeConfig.ikutPromoXtra ? Math.min(h * SHOPEE_PROMO_XTRA_RATE, SHOPEE_PROMO_XTRA_MAX) : 0;
      const aLiveXtra = shopeeConfig.ikutLiveXtra ? Math.min(h * liveXtraRate, SHOPEE_LIVE_XTRA_MAX) : 0;
      const aPreOrder = shopeeConfig.isPreOrder ? h * SHOPEE_PRE_ORDER_RATE : 0;
      const aTotal = aAdmin + aGoXtra + aPromoXtra + aLiveXtra + aPreOrder + biayaProses;
      const danaTerima = h - aTotal;
      if (Math.abs(danaTerima - targetDanaDiterima) < 1) break;
      hargaJualSebelumCeil = h + (targetDanaDiterima - danaTerima);
    }

    const hargaJualFinal = Math.ceil(hargaJualSebelumCeil);

    // Recalculate actual fees at final price
    const actualAdmin = hargaJualFinal * adminRate;
    const actualGoXtra = shopeeConfig.ikutGoXtra ? Math.min(hargaJualFinal * SHOPEE_GO_XTRA_RATE, SHOPEE_GO_XTRA_MAX) : 0;
    const actualPromoXtra = shopeeConfig.ikutPromoXtra ? Math.min(hargaJualFinal * SHOPEE_PROMO_XTRA_RATE, SHOPEE_PROMO_XTRA_MAX) : 0;
    const actualLiveXtra = shopeeConfig.ikutLiveXtra ? Math.min(hargaJualFinal * liveXtraRate, SHOPEE_LIVE_XTRA_MAX) : 0;
    const actualPreOrder = shopeeConfig.isPreOrder ? hargaJualFinal * SHOPEE_PRE_ORDER_RATE : 0;
    const actualTotal = actualAdmin + actualGoXtra + actualPromoXtra + actualLiveXtra + actualPreOrder + biayaProses;
    const danaDiterima = hargaJualFinal - actualTotal;

    const totalBiayaPersen = hargaJualFinal > 0 ? (actualTotal / hargaJualFinal) * 100 : 0;

    return {
      adminRate,
      biayaAdmin: actualAdmin,
      goXtraRate,
      biayaGoXtra: actualGoXtra,
      promoXtraRate,
      biayaPromoXtra: actualPromoXtra,
      liveXtraRate,
      biayaLiveXtra: actualLiveXtra,
      preOrderRate,
      biayaPreOrder: actualPreOrder,
      biayaProses,
      totalBiaya: actualTotal,
      totalBiayaPersen,
      hargaJualSebelumCeil,
      hargaJualFinal,
      danaDiterima,
      bufferAmount,
      targetDanaDiterima,
    };
  }

  function calcTiktok(hargaNota: number, addonHarga: number = 0): BiayaPlatform {
    // Buffer: target dana diterima = harga nota + addon + buffer
    const bufferAmount = hargaNota * (bufferPersen / 100);
    const targetDanaDiterima = hargaNota + addonHarga + bufferAmount;

    const komisiRate = TIKTOK_KOMISI_RATE;
    const paymentRate = TIKTOK_PAYMENT_RATE;
    const freeOngkirRate = tiktokConfig.ikutFreeOngkir ? TIKTOK_FREE_ONGKIR_RATE : 0;
    const flashSaleRate = tiktokConfig.ikutFlashSale ? TIKTOK_FLASH_SALE_RATE : 0;

    const totalRate = komisiRate + paymentRate + freeOngkirRate + flashSaleRate;

    // Reverse calc with buffer included
    const hargaJualSebelumCeil = targetDanaDiterima / (1 - totalRate);
    const hargaJualFinal = Math.ceil(hargaJualSebelumCeil);

    // Recalculate at final price
    const biayaKomisi = hargaJualFinal * komisiRate;
    const biayaPayment = hargaJualFinal * paymentRate;
    const biayaFreeOngkir = hargaJualFinal * freeOngkirRate;
    const biayaFlashSale = hargaJualFinal * flashSaleRate;
    const totalBiaya = biayaKomisi + biayaPayment + biayaFreeOngkir + biayaFlashSale;
    const danaDiterima = hargaJualFinal - totalBiaya;
    const totalBiayaPersen = hargaJualFinal > 0 ? (totalBiaya / hargaJualFinal) * 100 : 0;

    return {
      adminRate: komisiRate,
      biayaAdmin: biayaKomisi,
      goXtraRate: freeOngkirRate,
      biayaGoXtra: biayaFreeOngkir,
      promoXtraRate: flashSaleRate,
      biayaPromoXtra: biayaFlashSale,
      liveXtraRate: paymentRate,
      biayaLiveXtra: biayaPayment,
      preOrderRate: 0,
      biayaPreOrder: 0,
      biayaProses: 0,
      totalBiaya,
      totalBiayaPersen,
      hargaJualSebelumCeil,
      hargaJualFinal,
      danaDiterima,
      bufferAmount,
      targetDanaDiterima,
    };
  }

  function calculateRow(row: BarisItem, idx: number): HasilBaris | null {
    const harga = typeof row.hargaPerGram === "number" ? row.hargaPerGram : 0;
    const berat = typeof row.berat === "number" ? row.berat : 0;
    if (harga <= 0 || berat <= 0) return null;

    const totalSebelum = harga * berat;
    const hargaNota = Math.round(totalSebelum);

    // Find addon
    const addon = row.addonId ? addonList.find((a) => a.id === row.addonId) : null;
    const addonHarga = addon ? addon.harga : 0;
    const addonNama = addon ? addon.nama : "";

    return {
      id: row.id,
      label: row.label || `Baris ${idx + 1}`,
      hargaPerGram: harga,
      berat,
      totalSebelum,
      hargaNota,
      addonNama,
      addonHarga,
      shopee: calcShopee(hargaNota, addonHarga),
      tiktok: calcTiktok(hargaNota, addonHarga),
    };
  }

  const results = rows.map((r, i) => calculateRow(r, i)).filter(Boolean) as HasilBaris[];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Kalkulator Harga Emas Marketplace
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Hitung harga jual emas di Shopee & TikTok Shop agar dana yang diterima tetap sesuai Harga Nota setelah semua potongan
        </p>
      </div>

      {/* Platform Toggle */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
        <button
          onClick={() => setActivePlatform("shopee")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            activePlatform === "shopee"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          Shopee
        </button>
        <button
          onClick={() => setActivePlatform("tiktok")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            activePlatform === "tiktok"
              ? "bg-gray-900 text-white shadow-sm"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          TikTok Shop
        </button>
      </div>

      {/* Platform Settings */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="flex w-full items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <Info size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-800">
              Pengaturan Biaya Platform
            </h2>
          </div>
          {showSettings ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {showSettings && (
          <div className="border-t border-gray-100 px-5 pb-5">
            <div className="grid gap-5 pt-4">
              {/* ---- SHOPEE ---- */}
              {activePlatform === "shopee" && (
              <div className="rounded-lg border border-teal-300 bg-teal-50/50 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">S</div>
                  <span className="text-sm font-bold text-gray-800">Shopee</span>
                  <span className="ml-auto rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                    Perhiasan / Logam Mulia
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Status Penjual */}
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-gray-600">Status Penjual</p>
                    <div className="flex flex-wrap gap-3">
                      <RadioOption
                        name="shopee-status"
                        value="star"
                        checked={shopeeConfig.statusPenjual === "star"}
                        onChange={() => setShopeeConfig((c) => ({ ...c, statusPenjual: "star" }))}
                        label="Star / Star+"
                      />
                      <RadioOption
                        name="shopee-status"
                        value="non-star"
                        checked={shopeeConfig.statusPenjual === "non-star"}
                        onChange={() => setShopeeConfig((c) => ({ ...c, statusPenjual: "non-star" }))}
                        label="Non-Star"
                      />
                    </div>
                  </div>

                  {shopeeConfig.statusPenjual === "non-star" && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-gray-600">Jumlah Pesanan</p>
                      <div className="flex flex-wrap gap-3">
                        <RadioOption
                          name="shopee-pesanan"
                          value="lte50"
                          checked={shopeeConfig.jumlahPesanan === "lte50"}
                          onChange={() => setShopeeConfig((c) => ({ ...c, jumlahPesanan: "lte50" }))}
                          label="≤ 50 (Admin 0%)"
                        />
                        <RadioOption
                          name="shopee-pesanan"
                          value="gt50"
                          checked={shopeeConfig.jumlahPesanan === "gt50"}
                          onChange={() => setShopeeConfig((c) => ({ ...c, jumlahPesanan: "gt50" }))}
                          label="> 50 (Admin 4.25%)"
                        />
                      </div>
                    </div>
                  )}

                  <div className="border-t border-teal-300/50 pt-3 space-y-2.5">
                    <p className="text-xs font-medium text-gray-600">Program & Layanan</p>
                    <ToggleOption
                      label="GO XTRA"
                      detail={`${pct(SHOPEE_GO_XTRA_RATE)}, maks ${formatRupiah(SHOPEE_GO_XTRA_MAX)}`}
                      checked={shopeeConfig.ikutGoXtra}
                      onChange={(v) => setShopeeConfig((c) => ({ ...c, ikutGoXtra: v }))}
                      accent="bg-teal-600"
                    />
                    <ToggleOption
                      label="Promo XTRA"
                      detail={`${pct(SHOPEE_PROMO_XTRA_RATE)}, maks ${formatRupiah(SHOPEE_PROMO_XTRA_MAX)}`}
                      checked={shopeeConfig.ikutPromoXtra}
                      onChange={(v) => setShopeeConfig((c) => ({ ...c, ikutPromoXtra: v }))}
                      accent="bg-teal-600"
                    />
                    <ToggleOption
                      label="Live XTRA"
                      detail={
                        shopeeConfig.ikutPromoXtra
                          ? `${pct(SHOPEE_LIVE_XTRA_RATE_WITH_PROMO)} (diskon karena ikut Promo XTRA)`
                          : `${pct(SHOPEE_LIVE_XTRA_RATE)}, maks ${formatRupiah(SHOPEE_LIVE_XTRA_MAX)}`
                      }
                      checked={shopeeConfig.ikutLiveXtra}
                      onChange={(v) => setShopeeConfig((c) => ({ ...c, ikutLiveXtra: v }))}
                      accent="bg-teal-600"
                    />
                    <ToggleOption
                      label="Pre Order"
                      detail={pct(SHOPEE_PRE_ORDER_RATE)}
                      checked={shopeeConfig.isPreOrder}
                      onChange={(v) => setShopeeConfig((c) => ({ ...c, isPreOrder: v }))}
                      accent="bg-teal-600"
                    />
                  </div>

                  <div className="rounded-md bg-teal-100/60 px-3 py-2">
                    <p className="text-[10px] text-teal-700">
                      + Biaya Proses Pesanan: {formatRupiah(SHOPEE_BIAYA_PROSES)} (flat per pesanan)
                    </p>
                  </div>
                </div>
              </div>
              )}

              {/* ---- TIKTOK SHOP ---- */}
              {activePlatform === "tiktok" && (
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-xs font-bold text-white">T</div>
                  <span className="text-sm font-bold text-gray-800">TikTok Shop</span>
                  <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    Perhiasan & Aksesoris
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-600">Biaya Tetap</p>
                    <div className="rounded-md bg-gray-100 px-3 py-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Komisi Platform</span>
                        <span className="font-medium text-gray-700">{pct(TIKTOK_KOMISI_RATE)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Biaya Payment</span>
                        <span className="font-medium text-gray-700">{pct(TIKTOK_PAYMENT_RATE)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200/50 pt-3 space-y-2.5">
                    <p className="text-xs font-medium text-gray-600">Program & Layanan</p>
                    <ToggleOption
                      label="Free Ongkir"
                      detail={pct(TIKTOK_FREE_ONGKIR_RATE)}
                      checked={tiktokConfig.ikutFreeOngkir}
                      onChange={(v) => setTiktokConfig((c) => ({ ...c, ikutFreeOngkir: v }))}
                      accent="bg-gray-800"
                    />
                    <ToggleOption
                      label="Flash Sale"
                      detail={pct(TIKTOK_FLASH_SALE_RATE)}
                      checked={tiktokConfig.ikutFlashSale}
                      onChange={(v) => setTiktokConfig((c) => ({ ...c, ikutFlashSale: v }))}
                      accent="bg-gray-800"
                    />
                  </div>

                  <div className="rounded-md bg-gray-100 px-3 py-2">
                    <p className="text-[10px] text-gray-500">
                      * Rate TikTok Shop bisa berbeda per seller tier. Sesuaikan jika perlu.
                    </p>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Buffer Markup */}
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-white">%</div>
                <span className="text-sm font-bold text-gray-800">Buffer Markup Harga</span>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                Tambahan persentase di atas Harga Nota untuk mengantisipasi fluktuasi harga emas.
                Dengan buffer, Anda tidak perlu ganti harga produk setiap kali harga emas naik-turun.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={50}
                  value={bufferPersen}
                  onChange={(e) => setBufferPersen(Number(e.target.value) || 0)}
                  className="w-24 rounded-lg border border-amber-300 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
                <span className="text-sm text-gray-600">%</span>
                <div className="ml-auto flex gap-1.5">
                  {[0, 1, 2, 3, 5].map((v) => (
                    <button
                      key={v}
                      onClick={() => setBufferPersen(v)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                        bufferPersen === v
                          ? "bg-amber-500 text-white"
                          : "border border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                      }`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
              {bufferPersen > 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  Dana diterima = Harga Nota + {bufferPersen}% buffer. Contoh: Nota Rp 1.000.000 → target terima Rp {formatRupiah(1000000 * (1 + bufferPersen / 100))}
                </p>
              )}
            </div>

            {/* Addon Settings */}
            <div className="mt-5 rounded-lg border border-purple-200 bg-purple-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500 text-xs font-bold text-white">B</div>
                  <span className="text-sm font-bold text-gray-800">Addon / Box</span>
                </div>
                <button
                  onClick={() => setShowAddonSettings(!showAddonSettings)}
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  {showAddonSettings ? "Tutup" : "Edit Addon"}
                </button>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                Biaya addon (box, packaging, dll) akan ditambahkan ke target dana diterima sehingga harga jual final sudah termasuk biaya addon.
              </p>

              {/* Addon list preview */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {addonList.map((addon) => (
                  <span
                    key={addon.id}
                    className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700"
                  >
                    {addon.nama}: {formatRupiah(addon.harga)}
                  </span>
                ))}
              </div>

              {/* Editable addon list */}
              {showAddonSettings && (
                <div className="space-y-2 border-t border-purple-200 pt-3">
                  {addonList.map((addon) => (
                    <div key={addon.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={addon.nama}
                        onChange={(e) => updateAddon(addon.id, "nama", e.target.value)}
                        placeholder="Nama addon"
                        className="flex-1 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                      />
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                        <input
                          type="number"
                          min={0}
                          value={addon.harga}
                          onChange={(e) => updateAddon(addon.id, "harga", e.target.value)}
                          className="w-32 rounded-lg border border-purple-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                      <button
                        onClick={() => removeAddon(addon.id)}
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                        title="Hapus addon"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addAddon}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-purple-300 px-3 py-2 text-xs font-medium text-purple-600 transition hover:bg-purple-100"
                  >
                    <Plus size={14} />
                    Tambah Addon Baru
                  </button>
                </div>
              )}
            </div>

            {/* Explanation */}
            <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3">
              <p className="text-xs text-blue-700">
                <strong>Cara kerja:</strong> Sistem menghitung harga jual (FINAL) sehingga setelah dipotong <em>semua</em> biaya platform,
                dana yang Anda terima = Harga Nota{bufferPersen > 0 ? ` + buffer ${bufferPersen}%` : ""}{addonList.length > 0 ? " + biaya addon (jika dipilih)" : ""}. Biaya yang memiliki cap/maksimum juga diperhitungkan secara akurat.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input Rows */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Data Produk</h2>
          <div className="flex gap-2">
            <button
              onClick={addRow}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 active:scale-[0.98]"
            >
              <Plus size={14} />
              Tambah Baris
            </button>
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </div>

        {/* Quick Karat Presets */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-gray-500">Karat Preset (klik untuk tambah baris):</p>
          <div className="flex flex-wrap gap-1.5">
            {["6K", "8K", "9K", "16K", "17K", "18K", "22K", "24K"].map((k) => {
              const isUsed = rows.some((r) => r.label === k);
              return (
                <button
                  key={k}
                  onClick={() => {
                    setRows((prev) => [
                      ...prev,
                      { id: generateId(), label: k, hargaPerGram: "", berat: "", addonId: "" },
                    ]);
                  }}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                    isUsed
                      ? "border-teal-500 bg-teal-500 text-white"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
                  }`}
                >
                  {k} {isUsed && "✓"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table Header */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_0.8fr_1fr_40px] sm:gap-3 sm:px-1 sm:pb-2">
          <span className="text-xs font-medium text-gray-400">Kategori / Label</span>
          <span className="text-xs font-medium text-gray-400">Harga per Gram (Rp)</span>
          <span className="text-xs font-medium text-gray-400">Berat (gram)</span>
          <span className="text-xs font-medium text-gray-400">Addon / Box</span>
          <span></span>
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div
              key={row.id}
              className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3 sm:grid-cols-[1fr_1fr_0.8fr_1fr_40px] sm:items-center sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0"
            >
              <div>
                <label className="mb-1 block text-xs text-gray-400 sm:hidden">Kategori / Label</label>
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => updateRow(row.id, "label", e.target.value)}
                  placeholder={`Baris ${idx + 1} (misal: 17K)`}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm text-gray-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400 sm:hidden">Harga per Gram (Rp)</label>
                <RupiahInput
                  value={row.hargaPerGram}
                  onChange={(val) => updateRow(row.id, "hargaPerGram", val === "" ? "" : val)}
                  placeholder="1.640.000"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400 sm:hidden">Berat (gram)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.berat}
                    onChange={(e) => updateRow(row.id, "berat", e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-8 text-base sm:text-sm text-gray-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">gr</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400 sm:hidden">Addon / Box</label>
                <select
                  value={row.addonId}
                  onChange={(e) => updateRow(row.id, "addonId" as keyof BarisItem, e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base sm:text-sm text-gray-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Tanpa Box</option>
                  {addonList.map((addon) => (
                    <option key={addon.id} value={addon.id}>
                      {addon.nama} ({formatRupiah(addon.harga)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end sm:justify-center">
                <button
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= 1}
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Hapus baris"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">
            Hasil Perhitungan ({results.length} produk)
          </h2>

          {results.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Row header */}
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">{r.label}</h3>
                  <span className="text-xs text-gray-400">
                    {formatRupiah(r.hargaPerGram)}/gr x {r.berat} gr
                  </span>
                </div>
              </div>

              <div className="p-5">
                {/* Common */}
                <div className="mb-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total Sebelum</span>
                    <span className="text-sm text-gray-700">{formatRupiah(r.totalSebelum)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Harga Nota (dibulatkan)</span>
                    <span className="text-sm font-semibold text-gray-800">{formatRupiah(r.hargaNota)}</span>
                  </div>
                  {r.addonHarga > 0 && (
                    <div className="flex items-center justify-between rounded bg-purple-50 px-2 py-1">
                      <span className="text-sm text-purple-600">Addon: {r.addonNama}</span>
                      <span className="text-sm font-semibold text-purple-700">+ {formatRupiah(r.addonHarga)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-200 my-3" />

                {/* Platform result */}
                {activePlatform === "shopee" && (
                  <div className="rounded-lg border border-teal-300 bg-teal-50/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-teal-600 text-xs font-bold text-white">S</div>
                      <span className="text-sm font-semibold text-teal-800">Shopee</span>
                    </div>

                    {/* Fee breakdown */}
                    <div className="space-y-0.5 mb-3">
                      <FeeRow label="Biaya Admin" amount={r.shopee.biayaAdmin} rate={r.shopee.adminRate} />
                      {r.shopee.biayaGoXtra > 0 && (
                        <FeeRow label="GO XTRA" amount={r.shopee.biayaGoXtra} rate={r.shopee.goXtraRate} maxCap={SHOPEE_GO_XTRA_MAX} />
                      )}
                      {r.shopee.biayaPromoXtra > 0 && (
                        <FeeRow label="Promo XTRA" amount={r.shopee.biayaPromoXtra} rate={r.shopee.promoXtraRate} maxCap={SHOPEE_PROMO_XTRA_MAX} />
                      )}
                      {r.shopee.biayaLiveXtra > 0 && (
                        <FeeRow label="Live XTRA" amount={r.shopee.biayaLiveXtra} rate={r.shopee.liveXtraRate} maxCap={SHOPEE_LIVE_XTRA_MAX} />
                      )}
                      {r.shopee.biayaPreOrder > 0 && (
                        <FeeRow label="Pre Order" amount={r.shopee.biayaPreOrder} rate={r.shopee.preOrderRate} />
                      )}
                      <FeeRow label="Biaya Proses" amount={r.shopee.biayaProses} />
                      <div className="border-t border-teal-300/50 mt-1 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-teal-700">Total Biaya ({r.shopee.totalBiayaPersen.toFixed(1)}%)</span>
                          <span className="text-xs font-semibold text-teal-800">{formatRupiah(r.shopee.totalBiaya)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Final price */}
                    <div className="rounded-md bg-teal-100 px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-teal-800">HARGA JUAL</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-teal-800">{formatRupiah(r.shopee.hargaJualFinal)}</span>
                          <CopyBtn text={r.shopee.hargaJualFinal.toString()} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-teal-600">Dana diterima:</span>
                        <span className={`text-xs font-semibold ${r.shopee.danaDiterima >= r.hargaNota ? "text-green-600" : "text-red-600"}`}>
                          {formatRupiah(r.shopee.danaDiterima)}
                        </span>
                      </div>
                      {bufferPersen > 0 && (
                        <div className="flex items-center justify-between rounded bg-amber-50 px-2 py-1">
                          <span className="text-[10px] text-amber-600">Buffer {bufferPersen}%:</span>
                          <span className="text-[10px] font-semibold text-amber-700">+{formatRupiah(r.shopee.bufferAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activePlatform === "tiktok" && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-900 text-xs font-bold text-white">T</div>
                      <span className="text-sm font-semibold text-gray-800">TikTok Shop</span>
                    </div>

                    {/* Fee breakdown */}
                    <div className="space-y-0.5 mb-3">
                      <FeeRow label="Komisi Platform" amount={r.tiktok.biayaAdmin} rate={TIKTOK_KOMISI_RATE} />
                      <FeeRow label="Biaya Payment" amount={r.tiktok.biayaLiveXtra} rate={TIKTOK_PAYMENT_RATE} />
                      {tiktokConfig.ikutFreeOngkir && (
                        <FeeRow label="Free Ongkir" amount={r.tiktok.biayaGoXtra} rate={TIKTOK_FREE_ONGKIR_RATE} />
                      )}
                      {tiktokConfig.ikutFlashSale && (
                        <FeeRow label="Flash Sale" amount={r.tiktok.biayaPromoXtra} rate={TIKTOK_FLASH_SALE_RATE} />
                      )}
                      <div className="border-t border-gray-200/50 mt-1 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">Total Biaya ({r.tiktok.totalBiayaPersen.toFixed(1)}%)</span>
                          <span className="text-xs font-semibold text-gray-800">{formatRupiah(r.tiktok.totalBiaya)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Final price */}
                    <div className="rounded-md bg-gray-200 px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-800">HARGA JUAL</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-900">{formatRupiah(r.tiktok.hargaJualFinal)}</span>
                          <CopyBtn text={r.tiktok.hargaJualFinal.toString()} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">Dana diterima:</span>
                        <span className={`text-xs font-semibold ${r.tiktok.danaDiterima >= r.hargaNota ? "text-green-600" : "text-red-600"}`}>
                          {formatRupiah(r.tiktok.danaDiterima)}
                        </span>
                      </div>
                      {bufferPersen > 0 && (
                        <div className="flex items-center justify-between rounded bg-amber-50 px-2 py-1">
                          <span className="text-[10px] text-amber-600">Buffer {bufferPersen}%:</span>
                          <span className="text-[10px] font-semibold text-amber-700">+{formatRupiah(r.tiktok.bufferAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}


        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-400">
            Masukkan harga per gram dan berat barang di atas untuk melihat hasil perhitungan secara real-time.
          </p>
        </div>
      )}

      {/* Info Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Rincian Biaya {activePlatform === "shopee" ? "Shopee" : "TikTok Shop"}</h3>
        {activePlatform === "shopee" ? (
          <div className="rounded-lg bg-teal-50 p-3 space-y-1.5">
            <p className="font-medium text-xs text-teal-800">Shopee - Perhiasan Berharga / Logam Mulia</p>
            <ul className="text-[11px] text-teal-700/80 space-y-0.5">
              <li>Biaya Admin Star/Star+ & Non-Star {">"}50: <strong>4.25%</strong></li>
              <li>Non-Star {"≤"}50 pesanan: <strong>0% (Gratis)</strong></li>
              <li>GO XTRA: <strong>1.5%</strong> (maks. Rp 20.000)</li>
              <li>Promo XTRA: <strong>4.5%</strong> (maks. Rp 60.000)</li>
              <li>Live XTRA: <strong>3%</strong> (maks. Rp 20.000), jadi <strong>2%</strong> jika ikut Promo XTRA</li>
              <li>Pre Order: <strong>3%</strong></li>
              <li>Biaya Proses Pesanan: <strong>Rp 1.250</strong> (flat)</li>
            </ul>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-100 p-3 space-y-1.5">
            <p className="font-medium text-xs text-gray-700">TikTok Shop - Perhiasan & Aksesoris</p>
            <ul className="text-[11px] text-gray-500 space-y-0.5">
              <li>Komisi Platform: <strong>5%</strong></li>
              <li>Biaya Payment: <strong>1%</strong></li>
              <li>Free Ongkir (opsional): <strong>1.5%</strong></li>
              <li>Flash Sale (opsional): <strong>1%</strong></li>
            </ul>
            <p className="text-[10px] text-gray-400 mt-1">
              * Rate bisa berbeda per seller tier & kategori. Selalu cek TikTok Seller Center.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
