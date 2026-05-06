"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  PRODUCT_CATEGORIES,
  GO_XTRA_CATEGORIES,
  type ProductCategory,
} from "@/lib/shopee-categories";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type StatusPenjual = "star" | "non-star";
type JumlahPesanan = "lte50" | "gt50";

// Fixed fees
const BIAYA_PROSES_PESANAN = 1250;
const PROMO_XTRA_RATE = 0.045;
const PROMO_XTRA_MAX = 60000;
const LIVE_XTRA_RATE_DEFAULT = 0.03;
const LIVE_XTRA_RATE_WITH_PROMO = 0.02;
const LIVE_XTRA_MAX = 20000;
const PRE_ORDER_RATE = 0.03;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRupiah(num: number): string {
  return "Rp " + num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function pct(rate: number): string {
  return (rate * 100).toFixed(2).replace(/\.?0+$/, "") + "%";
}

// Group product categories by first segment
function groupCategories(
  categories: ProductCategory[]
): Map<string, ProductCategory[]> {
  const map = new Map<string, ProductCategory[]>();
  for (const cat of categories) {
    const group = cat.name.split(" / ")[0];
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(cat);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

interface HasilPerhitungan {
  hargaProduk: number;
  diskonPenjual: number;
  voucherPenjual: number;
  cashbackKoin: number;
  hargaFinal: number;
  adminRate: number;
  adminRateLabel: string;
  biayaAdmin: number;
  goXtraRate: number;
  goXtraMax: number;
  biayaGoXtra: number;
  promoXtraRate: number;
  promoXtraMax: number;
  biayaPromoXtra: number;
  liveXtraRate: number;
  liveXtraMax: number;
  biayaLiveXtra: number;
  preOrderRate: number;
  biayaPreOrder: number;
  biayaProsesPesanan: number;
  totalBiaya: number;
  danaDiterima: number;
  ikutPromoXtra: boolean;
  ikutLiveXtra: boolean;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-gray-700">{label}</legend>
      <div className="flex flex-wrap gap-4">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2 text-sm text-gray-600"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="h-4 w-4 accent-teal-600"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          Rp
        </span>
        <input
          type="number"
          min={0}
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          placeholder={placeholder ?? "0"}
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
      </div>
    </div>
  );
}

function ResultRow({
  label,
  amount,
  rate,
  maxCap,
  highlight,
  bold,
  note,
}: {
  label: string;
  amount: number;
  rate?: number;
  maxCap?: number;
  highlight?: "green" | "red";
  bold?: boolean;
  note?: string;
}) {
  const colorClass =
    highlight === "green"
      ? "text-green-600"
      : highlight === "red"
        ? "text-red-600"
        : "text-gray-800";

  return (
    <div className={`py-2 ${bold ? "font-semibold" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {label}
          {rate !== undefined && rate > 0 && (
            <span className="ml-1 text-xs text-gray-400">({pct(rate)})</span>
          )}
          {maxCap !== undefined && maxCap > 0 && (
            <span className="ml-1 text-xs text-gray-400">
              (maks. {formatRupiah(maxCap)})
            </span>
          )}
        </span>
        <span className={`text-sm ${colorClass}`}>
          {highlight === "red" && amount < 0 ? "- " : ""}
          {formatRupiah(Math.abs(amount))}
        </span>
      </div>
      {note && <p className="mt-0.5 text-xs text-teal-600">{note}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category Combobox component (searchable with grouped dropdown)
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 200; // limit rendered items for performance

function CategoryCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return PRODUCT_CATEGORIES;
    const q = search.toLowerCase();
    return PRODUCT_CATEGORIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [search]);

  // Limit rendered items for performance, but show all when searching
  const displayed = useMemo(() => {
    return filtered.length > MAX_VISIBLE && !search.trim()
      ? filtered.slice(0, MAX_VISIBLE)
      : filtered;
  }, [filtered, search]);

  const filteredGrouped = useMemo(() => {
    return groupCategories(displayed);
  }, [displayed]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedCat = useMemo(
    () => PRODUCT_CATEGORIES.find((c) => c.name === value),
    [value]
  );

  const handleSelect = useCallback(
    (name: string) => {
      onChange(name);
      setSearch("");
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <div ref={wrapperRef} className="relative space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        Kategori Produk
      </label>
      <div
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <svg
          className="h-4 w-4 shrink-0 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : value ? value : ""}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearch("");
          }}
          placeholder="Cari kategori produk..."
          className="w-full bg-transparent text-gray-800 outline-none placeholder:text-gray-400"
        />
        {value && !isOpen && (
          <span className="shrink-0 rounded bg-teal-100 px-1.5 py-0.5 text-xs font-medium text-teal-800">
            {pct(selectedCat?.adminRate ?? 0)}
          </span>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Counter */}
          <div className="border-b border-gray-100 px-3 py-1.5 text-xs text-gray-400">
            Menampilkan {displayed.length} dari {filtered.length} kategori
            {filtered.length !== PRODUCT_CATEGORIES.length && (
              <span> (total {PRODUCT_CATEGORIES.length})</span>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">
                Tidak ada kategori yang cocok
              </div>
            ) : (
              Array.from(filteredGrouped.entries()).map(([group, cats]) => (
                <div key={group}>
                  <div className="sticky top-0 bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {group}
                  </div>
                  {cats.map((cat) => {
                    const parts = cat.name.split(" / ");
                    const subLabel = parts.slice(1).join(" / ");
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => handleSelect(cat.name)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-teal-50 ${
                          value === cat.name
                            ? "bg-teal-50 text-teal-800"
                            : "text-gray-700"
                        }`}
                      >
                        <span className="truncate">{subLabel}</span>
                        <span className="ml-2 shrink-0 text-xs text-gray-400">
                          {pct(cat.adminRate)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}

            {displayed.length < filtered.length && (
              <div className="px-3 py-2 text-center text-xs text-gray-400">
                Ketik untuk mencari dari {PRODUCT_CATEGORIES.length} kategori...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function KalkulatorShopeePage() {
  // Input state
  const [hargaProduk, setHargaProduk] = useState(0);
  const [diskonPenjual, setDiskonPenjual] = useState(0);
  const [voucherPenjual, setVoucherPenjual] = useState(0);
  const [cashbackKoin, setCashbackKoin] = useState(0);
  const [statusPenjual, setStatusPenjual] = useState<StatusPenjual>("star");
  const [jumlahPesanan, setJumlahPesanan] = useState<JumlahPesanan>("gt50");
  const [selectedCategory, setSelectedCategory] = useState(
    PRODUCT_CATEGORIES[0].name
  );
  const [ikutPromoXtra, setIkutPromoXtra] = useState(false);
  const [ikutLiveXtra, setIkutLiveXtra] = useState(false);
  const [ikutGoXtra, setIkutGoXtra] = useState(false);
  const [goXtraKategori, setGoXtraKategori] = useState(
    GO_XTRA_CATEGORIES[0].name
  );
  const [isPreOrder, setIsPreOrder] = useState(false);

  // Result state
  const [hasil, setHasil] = useState<HasilPerhitungan | null>(null);

  // ---------------------------------------------------------------------------
  // Calculation
  // ---------------------------------------------------------------------------

  function hitung() {
    const hargaFinal =
      hargaProduk - diskonPenjual - voucherPenjual - cashbackKoin;

    // Admin rate - based on category and seller status
    const category = PRODUCT_CATEGORIES.find(
      (c) => c.name === selectedCategory
    );
    const categoryAdminRate = category?.adminRate ?? 0.09;

    let adminRate: number;
    let adminRateLabel: string;
    if (statusPenjual === "non-star" && jumlahPesanan === "lte50") {
      adminRate = 0;
      adminRateLabel = "0% (Gratis)";
    } else {
      adminRate = categoryAdminRate;
      adminRateLabel = pct(adminRate);
    }

    const biayaAdmin = hargaFinal * adminRate;

    // GO XTRA (with cap!)
    const goXtraCat = GO_XTRA_CATEGORIES.find(
      (c) => c.name === goXtraKategori
    );
    const goXtraRate = ikutGoXtra ? (goXtraCat?.rate ?? 0.04) : 0;
    const goXtraMax = goXtraCat?.max ?? 20000;
    const biayaGoXtra = ikutGoXtra
      ? Math.min(hargaFinal * goXtraRate, goXtraMax)
      : 0;

    // Promo XTRA (with cap!)
    const promoXtraRate = ikutPromoXtra ? PROMO_XTRA_RATE : 0;
    const biayaPromoXtra = ikutPromoXtra
      ? Math.min(hargaFinal * PROMO_XTRA_RATE, PROMO_XTRA_MAX)
      : 0;

    // Live XTRA (with cap! and discount if also in Promo XTRA)
    let liveXtraRate: number;
    if (ikutLiveXtra && ikutPromoXtra) {
      liveXtraRate = LIVE_XTRA_RATE_WITH_PROMO;
    } else if (ikutLiveXtra) {
      liveXtraRate = LIVE_XTRA_RATE_DEFAULT;
    } else {
      liveXtraRate = 0;
    }
    const biayaLiveXtra = ikutLiveXtra
      ? Math.min(hargaFinal * liveXtraRate, LIVE_XTRA_MAX)
      : 0;

    // Pre Order
    const preOrderRate = isPreOrder ? PRE_ORDER_RATE : 0;
    const biayaPreOrder = isPreOrder ? hargaFinal * PRE_ORDER_RATE : 0;

    // Processing fee
    const biayaProsesPesanan = BIAYA_PROSES_PESANAN;

    const totalBiaya =
      biayaAdmin +
      biayaGoXtra +
      biayaPromoXtra +
      biayaLiveXtra +
      biayaPreOrder +
      biayaProsesPesanan;

    const danaDiterima = hargaFinal - totalBiaya;

    setHasil({
      hargaProduk,
      diskonPenjual,
      voucherPenjual,
      cashbackKoin,
      hargaFinal,
      adminRate,
      adminRateLabel,
      biayaAdmin,
      goXtraRate,
      goXtraMax,
      biayaGoXtra,
      promoXtraRate,
      promoXtraMax: PROMO_XTRA_MAX,
      biayaPromoXtra,
      liveXtraRate,
      liveXtraMax: LIVE_XTRA_MAX,
      biayaLiveXtra,
      preOrderRate,
      biayaPreOrder,
      biayaProsesPesanan,
      totalBiaya,
      danaDiterima,
      ikutPromoXtra,
      ikutLiveXtra,
    });
  }

  function reset() {
    setHargaProduk(0);
    setDiskonPenjual(0);
    setVoucherPenjual(0);
    setCashbackKoin(0);
    setStatusPenjual("star");
    setJumlahPesanan("gt50");
    setSelectedCategory(PRODUCT_CATEGORIES[0].name);
    setIkutPromoXtra(false);
    setIkutLiveXtra(false);
    setIkutGoXtra(false);
    setGoXtraKategori(GO_XTRA_CATEGORIES[0].name);
    setIsPreOrder(false);
    setHasil(null);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Kalkulator Biaya Admin & Layanan Shopee
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Non Star & Star/Star+ — Tarif per kategori produk
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ----------------------------------------------------------------- */}
        {/* LEFT: Input form                                                   */}
        {/* ----------------------------------------------------------------- */}
        <div className="space-y-6 lg:col-span-3">
          {/* Harga & Diskon */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">
              Harga & Diskon
            </h2>
            <div className="space-y-4">
              <NumberInput
                label="Harga Produk"
                value={hargaProduk}
                onChange={setHargaProduk}
                placeholder="Masukkan harga produk"
              />
              <NumberInput
                label="Diskon Penjual"
                value={diskonPenjual}
                onChange={setDiskonPenjual}
              />
              <NumberInput
                label="Voucher Penjual"
                value={voucherPenjual}
                onChange={setVoucherPenjual}
              />
              <NumberInput
                label="Cashback Koin Ditanggung Penjual"
                value={cashbackKoin}
                onChange={setCashbackKoin}
              />
            </div>
          </div>

          {/* Status Penjual & Kategori Produk */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">
              Status Penjual & Kategori Produk
            </h2>
            <div className="space-y-4">
              <RadioGroup
                label="Status Penjual"
                name="statusPenjual"
                options={[
                  { value: "star", label: "Star / Star+" },
                  { value: "non-star", label: "Non-Star" },
                ]}
                value={statusPenjual}
                onChange={(v) => setStatusPenjual(v as StatusPenjual)}
              />

              {statusPenjual === "non-star" && (
                <>
                  <RadioGroup
                    label="Jumlah Pesanan"
                    name="jumlahPesanan"
                    options={[
                      {
                        value: "lte50",
                        label: "\u2264 50 Pesanan (Gratis Admin)",
                      },
                      { value: "gt50", label: "> 50 Pesanan" },
                    ]}
                    value={jumlahPesanan}
                    onChange={(v) => setJumlahPesanan(v as JumlahPesanan)}
                  />
                  {jumlahPesanan === "lte50" && (
                    <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                      Non-Star dengan {"\u2264"} 50 pesanan tidak dikenakan
                      biaya admin.
                    </div>
                  )}
                </>
              )}

              <CategoryCombobox
                value={selectedCategory}
                onChange={setSelectedCategory}
              />

              {selectedCategory && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Tarif admin kategori ini:</span>
                  <span className="font-semibold text-teal-700">
                    {statusPenjual === "non-star" && jumlahPesanan === "lte50"
                      ? "0% (Gratis)"
                      : pct(
                          PRODUCT_CATEGORIES.find(
                            (c) => c.name === selectedCategory
                          )?.adminRate ?? 0
                        )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Program & Layanan */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">
              Program & Layanan
            </h2>
            <div className="space-y-4">
              {/* Promo XTRA */}
              <RadioGroup
                label={`Ikut Promo XTRA? (${pct(PROMO_XTRA_RATE)}, maks. ${formatRupiah(PROMO_XTRA_MAX)})`}
                name="promoXtra"
                options={[
                  { value: "ya", label: "Ya" },
                  { value: "tidak", label: "Tidak" },
                ]}
                value={ikutPromoXtra ? "ya" : "tidak"}
                onChange={(v) => setIkutPromoXtra(v === "ya")}
              />

              {/* Live XTRA */}
              <div>
                <RadioGroup
                  label={`Ikut Live XTRA? (${ikutPromoXtra ? pct(LIVE_XTRA_RATE_WITH_PROMO) : pct(LIVE_XTRA_RATE_DEFAULT)}, maks. ${formatRupiah(LIVE_XTRA_MAX)})`}
                  name="liveXtra"
                  options={[
                    { value: "ya", label: "Ya" },
                    { value: "tidak", label: "Tidak" },
                  ]}
                  value={ikutLiveXtra ? "ya" : "tidak"}
                  onChange={(v) => setIkutLiveXtra(v === "ya")}
                />
                {ikutLiveXtra && ikutPromoXtra && (
                  <p className="mt-1.5 text-xs text-teal-700">
                    Biaya Live XTRA menjadi 2% karena ikut Promo XTRA
                  </p>
                )}
              </div>

              {/* GO XTRA */}
              <RadioGroup
                label="Ikut Gratis Ongkir XTRA (GO XTRA)?"
                name="goXtra"
                options={[
                  { value: "ya", label: "Ya" },
                  { value: "tidak", label: "Tidak" },
                ]}
                value={ikutGoXtra ? "ya" : "tidak"}
                onChange={(v) => setIkutGoXtra(v === "ya")}
              />

              {ikutGoXtra && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Kategori GO XTRA
                  </label>
                  <select
                    value={goXtraKategori}
                    onChange={(e) => setGoXtraKategori(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    {GO_XTRA_CATEGORIES.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.name} ({pct(opt.rate)}, maks.{" "}
                        {formatRupiah(opt.max)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Pre Order */}
              <RadioGroup
                label={`Apakah produk Pre Order? (${pct(PRE_ORDER_RATE)})`}
                name="preOrder"
                options={[
                  { value: "ya", label: "Ya" },
                  { value: "tidak", label: "Tidak" },
                ]}
                value={isPreOrder ? "ya" : "tidak"}
                onChange={(v) => setIsPreOrder(v === "ya")}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={hitung}
              className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 active:scale-[0.98]"
            >
              Hitung
            </button>
            <button
              onClick={reset}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
            >
              Reset
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT: Results                                                     */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-800">
                Hasil Perhitungan
              </h2>

              {!hasil ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  Isi form di samping lalu klik &quot;Hitung&quot; untuk melihat
                  hasil perhitungan.
                </p>
              ) : (
                <div className="space-y-1">
                  {/* Harga Final */}
                  <div className="rounded-lg bg-teal-50 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-teal-800">
                        Harga Final
                      </span>
                      <span className="text-sm font-semibold text-teal-800">
                        {formatRupiah(hasil.hargaFinal)}
                      </span>
                    </div>
                    {(hasil.diskonPenjual > 0 ||
                      hasil.voucherPenjual > 0 ||
                      hasil.cashbackKoin > 0) && (
                      <p className="mt-1 text-xs text-teal-600">
                        {formatRupiah(hasil.hargaProduk)}
                        {hasil.diskonPenjual > 0 &&
                          ` - ${formatRupiah(hasil.diskonPenjual)} diskon`}
                        {hasil.voucherPenjual > 0 &&
                          ` - ${formatRupiah(hasil.voucherPenjual)} voucher`}
                        {hasil.cashbackKoin > 0 &&
                          ` - ${formatRupiah(hasil.cashbackKoin)} cashback`}
                      </p>
                    )}
                  </div>

                  <div className="my-2 border-t border-dashed border-gray-200" />

                  {/* Fee breakdown */}
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Rincian Biaya
                  </p>

                  <ResultRow
                    label="Biaya Admin"
                    amount={hasil.biayaAdmin}
                    rate={hasil.adminRate}
                    note={
                      hasil.adminRate === 0
                        ? "Gratis untuk Non-Star \u2264 50 pesanan"
                        : undefined
                    }
                  />

                  {hasil.biayaGoXtra > 0 && (
                    <ResultRow
                      label="Biaya GO XTRA"
                      amount={hasil.biayaGoXtra}
                      rate={hasil.goXtraRate}
                      maxCap={hasil.goXtraMax}
                    />
                  )}

                  {hasil.biayaPromoXtra > 0 && (
                    <ResultRow
                      label="Biaya Promo XTRA"
                      amount={hasil.biayaPromoXtra}
                      rate={hasil.promoXtraRate}
                      maxCap={hasil.promoXtraMax}
                    />
                  )}

                  {hasil.biayaLiveXtra > 0 && (
                    <ResultRow
                      label="Biaya Live XTRA"
                      amount={hasil.biayaLiveXtra}
                      rate={hasil.liveXtraRate}
                      maxCap={hasil.liveXtraMax}
                      note={
                        hasil.ikutPromoXtra && hasil.ikutLiveXtra
                          ? "Diskon 2% karena ikut Promo XTRA"
                          : undefined
                      }
                    />
                  )}

                  {hasil.biayaPreOrder > 0 && (
                    <ResultRow
                      label="Biaya Pre Order"
                      amount={hasil.biayaPreOrder}
                      rate={hasil.preOrderRate}
                    />
                  )}

                  <ResultRow
                    label="Biaya Proses Pesanan"
                    amount={hasil.biayaProsesPesanan}
                  />

                  <div className="my-2 border-t border-gray-200" />

                  {/* Total biaya */}
                  <ResultRow
                    label="Total Biaya"
                    amount={hasil.totalBiaya}
                    bold
                  />

                  <div className="my-2 border-t border-gray-200" />

                  {/* Dana diterima */}
                  <div
                    className={`rounded-lg px-3 py-3 ${
                      hasil.danaDiterima >= 0 ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-semibold ${
                          hasil.danaDiterima >= 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        Dana Diterima
                      </span>
                      <span
                        className={`text-base font-bold ${
                          hasil.danaDiterima >= 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {hasil.danaDiterima < 0 && "- "}
                        {formatRupiah(Math.abs(hasil.danaDiterima))}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Setelah dipotong semua biaya Shopee
                    </p>
                  </div>

                  {/* Percentage summary */}
                  <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5">
                    <p className="text-xs text-gray-500">
                      Total potongan:{" "}
                      <span className="font-semibold text-gray-700">
                        {hasil.hargaFinal > 0
                          ? (
                              (hasil.totalBiaya / hasil.hargaFinal) *
                              100
                            ).toFixed(1)
                          : "0"}
                        %
                      </span>{" "}
                      dari harga final
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Info links */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">
                Referensi
              </h3>
              <ul className="space-y-2 text-xs text-gray-500">
                <li>
                  <a
                    href="https://seller.shopee.co.id/edu/article/16055"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 underline decoration-teal-300 transition hover:text-teal-700"
                  >
                    Jenis Biaya untuk Berjualan di Shopee
                  </a>
                </li>
                <li>
                  <a
                    href="https://seller.shopee.co.id/edu/article/7187"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 underline decoration-teal-300 transition hover:text-teal-700"
                  >
                    Biaya Administrasi Penjual Shopee
                  </a>
                </li>
                <li>
                  <a
                    href="https://seller.shopee.co.id/edu/article/7216"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 underline decoration-teal-300 transition hover:text-teal-700"
                  >
                    Biaya Layanan: Promo XTRA, Promo XTRA+, dan Gratis Ongkir XTRA
                  </a>
                </li>
                <li>
                  <a
                    href="https://seller.shopee.co.id/edu/article/25787"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 underline decoration-teal-300 transition hover:text-teal-700"
                  >
                    Biaya Proses Pesanan
                  </a>
                </li>
                <li>
                  <a
                    href="https://seller.shopee.co.id/edu/article/19969"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 underline decoration-teal-300 transition hover:text-teal-700"
                  >
                    Shopee Live XTRA
                  </a>
                </li>
                <li>
                  <a
                    href="https://seller.shopee.co.id/edu/article/7010"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 underline decoration-teal-300 transition hover:text-teal-700"
                  >
                    Produk Pre Order
                  </a>
                </li>
              </ul>
              <p className="mt-3 text-[11px] text-gray-400">
                Tarif berlaku per Januari 2026. Selalu cek Seller Centre untuk
                info terbaru.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
