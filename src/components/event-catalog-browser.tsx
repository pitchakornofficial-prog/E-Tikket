"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  MapPinIcon,
  TicketIcon,
  FlameIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SlidersIcon,
} from "./icons";
import { formatPrice } from "@/lib/format";

export interface CatalogEvent {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  eventDate: string;
  startTime: string;
  venue: string;
  ticketPrice: string;
  availableQuantity: number;
}

interface EventCatalogBrowserProps {
  events: CatalogEvent[];
}

type SortOption = "date_asc" | "date_desc" | "price_asc" | "price_desc" | "name_asc";

const ITEMS_PER_PAGE = 6;

export function EventCatalogBrowser({ events }: EventCatalogBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [sortBy, setSortBy] = useState<SortOption>("date_asc");
  const [currentPage, setCurrentPage] = useState(1);

  const [timeframe, setTimeframe] = useState<"all" | "7days" | "30days">("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [lifecycleTab, setLifecycleTab] = useState<"upcoming" | "past" | "all">("upcoming");

  // Reset pagination to page 1 whenever search, category, sorting, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy, timeframe, inStockOnly, lifecycleTab]);

  // Determine the soonest upcoming event for the Hero Banner
  const soonestEvent = useMemo(() => {
    if (!events || events.length === 0) return null;
    const sorted = [...events].sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
    );
    return sorted[0];
  }, [events]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return ["ทั้งหมด", ...Array.from(set)];
  }, [events]);

  // Filter and Sort events
  const filteredAndSortedEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const list = events.filter((e) => {
      const evDate = new Date(e.eventDate);
      evDate.setHours(0, 0, 0, 0);
      const isPast = evDate.getTime() < now.getTime();

      if (lifecycleTab === "upcoming" && isPast) return false;
      if (lifecycleTab === "past" && !isPast) return false;

      const matchesCategory =
        selectedCategory === "ทั้งหมด" || e.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        e.name.toLowerCase().includes(query) ||
        e.venue.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query);

      if (!matchesCategory || !matchesSearch) return false;

      if (inStockOnly && e.availableQuantity <= 0) return false;

      if (timeframe !== "all") {
        const diffMs = evDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (timeframe === "7days" && (diffDays < 0 || diffDays > 7)) return false;
        if (timeframe === "30days" && (diffDays < 0 || diffDays > 30)) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        case "date_desc":
          return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
        case "price_asc":
          return parseFloat(a.ticketPrice) - parseFloat(b.ticketPrice);
        case "price_desc":
          return parseFloat(b.ticketPrice) - parseFloat(a.ticketPrice);
        case "name_asc":
          return a.name.localeCompare(b.name, "th");
        default:
          return 0;
      }
    });

    return list;
  }, [events, selectedCategory, searchQuery, sortBy, timeframe, inStockOnly, lifecycleTab]);

  // Pagination calculation
  const totalItems = filteredAndSortedEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = useMemo(() => {
    return filteredAndSortedEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedEvents, startIndex]);

  return (
    <div className="space-y-12">
      {/* 1. Upcoming Hero Banner */}
      {soonestEvent && (
        <section className="relative overflow-hidden rounded-xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black p-6 sm:p-8">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Banner Left Details */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-white text-black">
                  <FlameIcon className="w-3.5 h-3.5 fill-black stroke-black" />
                  <span>งานใกล้เข้ามาเร็วที่สุด</span>
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {soonestEvent.category}
                </span>
                {soonestEvent.availableQuantity > 0 ? (
                  <span className="text-xs text-neutral-400 font-medium">
                    เหลือ {soonestEvent.availableQuantity} ใบ
                  </span>
                ) : (
                  <span className="text-xs text-red-400 font-medium">
                    บัตรหมดแล้ว
                  </span>
                )}
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {soonestEvent.name}
              </h2>

              <p className="text-sm text-neutral-300 line-clamp-2 leading-relaxed">
                {soonestEvent.description}
              </p>

              <div className="flex flex-wrap gap-y-2 gap-x-6 text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-neutral-200 font-medium">{soonestEvent.eventDate} • {soonestEvent.startTime} น.</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-neutral-200 font-medium">{soonestEvent.venue}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <TicketIcon className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-neutral-200 font-bold">฿{formatPrice(soonestEvent.ticketPrice)}</span>
                </span>
              </div>

              <div className="pt-2">
                <Link
                  href={`/events/${soonestEvent.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-sm rounded hover:bg-neutral-200 transition-colors"
                >
                  <span>จองบัตรคอนเสิร์ตนี้ทันที</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Banner Right Image */}
            <div className="lg:col-span-5">
              <Link href={`/events/${soonestEvent.id}`} className="block group">
                <div className="relative aspect-[16/10] rounded-lg overflow-hidden border border-neutral-700/80 bg-neutral-900 shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={soonestEvent.imageUrl}
                    alt={soonestEvent.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                    <span className="font-mono bg-black/70 px-2 py-0.5 rounded backdrop-blur">
                      ฿{formatPrice(soonestEvent.ticketPrice)} / ใบ
                    </span>
                    <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>ดูรายละเอียด</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 2. Search & Category Filter Section */}
      <section className="space-y-6">
        {/* Lifecycle Tabs (Upcoming / Past / All) */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 gap-6 text-sm font-semibold">
          <button
            onClick={() => setLifecycleTab("upcoming")}
            className={`pb-3 border-b-2 transition-colors ${
              lifecycleTab === "upcoming"
                ? "border-black dark:border-white text-neutral-900 dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}
          >
            งานที่จะมาถึง (Upcoming)
          </button>
          <button
            onClick={() => setLifecycleTab("past")}
            className={`pb-3 border-b-2 transition-colors ${
              lifecycleTab === "past"
                ? "border-black dark:border-white text-neutral-900 dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}
          >
            งานที่จบไปแล้ว (Past Events)
          </button>
          <button
            onClick={() => setLifecycleTab("all")}
            className={`pb-3 border-b-2 transition-colors ${
              lifecycleTab === "all"
                ? "border-black dark:border-white text-neutral-900 dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}
          >
            ทั้งหมด (All)
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-900 pb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {lifecycleTab === "past" ? "คอนเสิร์ตและอีเวนต์ที่จัดไปแล้ว" : "คอนเสิร์ตและอีเวนต์ทั้งหมด"}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">ค้นหาตามหมวดหมู่ ชื่อคอนเสิร์ต หรือสถานที่จัดงาน</p>
          </div>

          {/* Search Box & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none">
                <SearchIcon className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาคอนเสิร์ต, สถานที่..."
                className="w-full bg-white dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-800 rounded pl-9 pr-8 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white p-0.5"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sorting Dropdown */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none flex items-center gap-1">
                <SlidersIcon className="w-3 h-3" />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full sm:w-auto bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-white rounded pl-8 pr-4 py-2 text-xs focus:outline-none focus:border-black dark:focus:border-white transition-colors cursor-pointer appearance-none"
              >
                <option value="date_asc">วันที่: เร็วสุด - ช้าสุด</option>
                <option value="date_desc">วันที่: ช้าสุด - เร็วสุด</option>
                <option value="price_asc">ราคา: ต่ำสุด - สูงสุด</option>
                <option value="price_desc">ราคา: สูงสุด - ต่ำสุด</option>
                <option value="name_asc">ชื่อคอนเสิร์ต (ก-ฮ)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills & Total Counter */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-colors ${
                  isSelected
                    ? "bg-black dark:bg-white text-white dark:text-black font-bold shadow-sm"
                    : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-800"
                }`}
              >
                {cat}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-neutral-500 font-mono">
            พบ {totalItems} งาน {totalPages > 1 && `(หน้า ${currentPage}/${totalPages})`}
          </span>
        </div>

        {/* Timeframe & In-Stock Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <span className="text-[11px] font-bold text-neutral-400 px-2 flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" /> ช่วงเวลา:
            </span>
            {(
              [
                { id: "all", label: "ทั้งหมด" },
                { id: "7days", label: "7 วันนี้" },
                { id: "30days", label: "เดือนนี้" },
              ] as const
            ).map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  timeframe === tf.id
                    ? "bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs font-bold"
                    : "text-neutral-500 hover:text-black dark:hover:text-white"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* In-Stock Only Toggle */}
          <button
            onClick={() => setInStockOnly((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
              inStockOnly
                ? "bg-neutral-900 dark:bg-white text-white dark:text-black border-transparent shadow-xs"
                : "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${
                inStockOnly
                  ? "bg-white dark:bg-black border-transparent"
                  : "border-neutral-400"
              }`}
            >
              {inStockOnly && (
                <CheckIcon className="w-2.5 h-2.5 text-black dark:text-white" />
              )}
            </div>
            <span>เฉพาะงานที่มีบัตรจำหน่าย</span>
          </button>
        </div>

        {/* 3. Event Cards Grid */}
        {paginatedEvents.length === 0 ? (
          <div className="p-12 border border-dashed border-neutral-300 dark:border-neutral-800 bg-white/40 dark:bg-neutral-950/40 rounded-lg text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 flex items-center justify-center mx-auto text-neutral-500 dark:text-neutral-400">
              <SearchIcon className="w-5 h-5" />
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 font-medium">ไม่พบคอนเสิร์ตที่ตรงกับเงื่อนไขการค้นหา</p>
            <p className="text-xs text-neutral-500">
              ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ทั้งหมด");
                setSortBy("date_asc");
              }}
              className="text-xs px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white rounded hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
            >
              ล้างตัวกรอง
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {paginatedEvents.map((event) => {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const evDate = new Date(event.eventDate);
                evDate.setHours(0, 0, 0, 0);
                const isPast = evDate.getTime() < now.getTime();
                const isSoldOut = event.availableQuantity <= 0;
                return (
                  <article
                    key={event.id}
                    className={`border rounded-lg overflow-hidden flex flex-col transition-colors group shadow-sm hover:shadow-md ${
                      isPast
                        ? "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 opacity-90"
                        : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-400 dark:hover:border-neutral-700"
                    }`}
                  >
                    {/* Artwork Container */}
                    <div className="relative aspect-[16/9] bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.imageUrl}
                        alt={`โปสเตอร์งาน ${event.name}`}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                          isPast ? "grayscale contrast-125" : ""
                        }`}
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-black/80 text-white border border-neutral-700 backdrop-blur">
                          {event.category}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        {isPast ? (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                            จบไปแล้ว (Ended)
                          </span>
                        ) : isSoldOut ? (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700">
                            บัตรหมด
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-white text-black font-bold shadow-md">
                            <CheckIcon className="w-3 h-3 stroke-[3]" />
                            <span>เปิดขายบัตร</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white line-clamp-1">
                          {event.name}
                        </h3>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1.5 pt-1">
                          <p className="flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                            <span>{event.eventDate} • {event.startTime} น.</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPinIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                            <span className="line-clamp-1">{event.venue}</span>
                          </p>
                        </div>
                      </div>

                      {/* Price and CTA */}
                      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-900 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-neutral-500">ราคาบัตร</p>
                          <p className="text-lg font-black text-neutral-900 dark:text-white font-mono">
                            ฿{formatPrice(event.ticketPrice)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-neutral-500">
                            {isPast
                              ? "จัดแสดงเสร็จสิ้นแล้ว"
                              : isSoldOut
                              ? "บัตรจำหน่ายหมดแล้ว"
                              : `เหลือ ${event.availableQuantity} ใบ`}
                          </p>
                          <Link
                            href={`/events/${event.id}`}
                            className={`inline-flex items-center gap-1 mt-1 text-xs font-semibold px-4 py-2 rounded transition-colors ${
                              isPast
                                ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-700"
                                : isSoldOut
                                ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 pointer-events-none"
                                : "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200"
                            }`}
                          >
                            <span>{isPast ? "ดูรายละเอียดงาน" : isSoldOut ? "บัตรหมด" : "ดูรายละเอียด & ซื้อบัตร"}</span>
                            {!isSoldOut && <ArrowRightIcon className="w-3.5 h-3.5" />}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-neutral-200 dark:border-neutral-900">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                  แสดง {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} จากทั้งหมด {totalItems} รายการ
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="หน้าก่อนหน้า"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    const isActive = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded text-xs font-mono font-bold transition-colors ${
                          isActive
                            ? "bg-black dark:bg-white text-white dark:text-black"
                            : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-800"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="หน้าถัดไป"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
