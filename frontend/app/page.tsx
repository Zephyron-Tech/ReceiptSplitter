"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

type ExtractedItem = {
  quantity: number;
  name: string;
  unitPrice: number;
  totalPrice: number;
};

type ExtractResponse = {
  items: ExtractedItem[];
  total: number;
};

type SavedTransaction = {
  id: number;
  payer: string;
  totalAmount: number;
};

// Backend endpoints — frontend runs outside docker and talks via published ports.
const OCR_URL = "http://localhost:8001/api/extract";
const CORE_URL = "http://localhost:8080/api/transactions";

// assignments[itemIndex][personName] = quantity assigned
type Assignments = Record<number, Record<string, number>>;

export default function Home() {
  // Step 1: upload + OCR
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Step 3: splitting
  const [people, setPeople] = useState<string[]>([]);
  const [newPersonInput, setNewPersonInput] = useState("");
  const [assignments, setAssignments] = useState<Assignments>({});

  // Step 4: payer + save
  const [payer, setPayer] = useState("");
  const [saved, setSaved] = useState<SavedTransaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function selectFile(selected: File | null) {
    setFile(selected);
    setItems([]);
    setTotal(null);
    setPeople([]);
    setAssignments({});
    setNewPersonInput("");
    setPayer("");
    setSaved(null);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    selectFile(e.target.files?.[0] ?? null);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) selectFile(f);
  }

  async function processReceipt() {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      // Run the fetch and an artificial delay in parallel so the loading state
      // is always shown for at least 2.7 s — simulates heavy AI processing for the demo.
      const [res] = await Promise.all([
        fetch(OCR_URL, { method: "POST", body: form }),
        new Promise<void>((resolve) => setTimeout(resolve, 2700)),
      ]);
      if (!res.ok) throw new Error(`OCR služba vrátila chybu (${res.status}).`);
      const data: ExtractResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nepodařilo se zpracovat účtenku.");
    } finally {
      setIsProcessing(false);
    }
  }

  function addPerson() {
    const name = newPersonInput.trim();
    if (!name || people.includes(name)) return;
    setPeople((prev) => [...prev, name]);
    setNewPersonInput("");
  }

  function removePerson(name: string) {
    setPeople((prev) => prev.filter((p) => p !== name));
    setAssignments((prev) => {
      const next: Assignments = {};
      Object.entries(prev).forEach(([idx, personMap]) => {
        const { [name]: _removed, ...rest } = personMap;
        next[Number(idx)] = rest;
      });
      return next;
    });
  }

  function getAssigned(itemIndex: number, person: string): number {
    return (assignments[itemIndex] ?? {})[person] ?? 0;
  }

  function getTotalAssigned(itemIndex: number): number {
    return Object.values(assignments[itemIndex] ?? {}).reduce((s, q) => s + q, 0);
  }

  function adjustAssignment(itemIndex: number, person: string, delta: number) {
    const current = getAssigned(itemIndex, person);
    const next = current + delta;
    if (next < 0) return;
    const remaining = items[itemIndex].quantity - getTotalAssigned(itemIndex);
    // When increasing, ensure we don't exceed the item's total quantity.
    if (delta > 0 && remaining < delta) return;
    setAssignments((prev) => ({
      ...prev,
      [itemIndex]: { ...(prev[itemIndex] ?? {}), [person]: next },
    }));
  }

  // Derived per-person totals from current quantity assignments.
  const personTotals = people.map((name) => ({
    name,
    total: items.reduce((sum, item, i) => {
      const qty = (assignments[i] ?? {})[name] ?? 0;
      return sum + qty * item.unitPrice;
    }, 0),
  }));

  const unassignedTotal = items.reduce((sum, item, i) => {
    const unassignedQty = item.quantity - getTotalAssigned(i);
    return sum + unassignedQty * item.unitPrice;
  }, 0);

  async function saveTransaction() {
    if (items.length === 0 || total === null || !payer.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        payer: payer.trim(),
        items: items.map((item, i) => ({
          quantity: item.quantity,
          name: item.name,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          // Only send assignments with quantity > 0 to keep the payload clean.
          assignments: Object.entries(assignments[i] ?? {})
            .filter(([, qty]) => qty > 0)
            .map(([person, qty]) => ({ person, quantity: qty })),
        })),
        totalAmount: total,
      };
      const res = await fetch(CORE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Backend odmítl transakci: ${body || res.status}`);
      }
      setSaved(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transakci se nepodařilo uložit.");
    } finally {
      setIsSaving(false);
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setItems([]);
    setTotal(null);
    setPeople([]);
    setAssignments({});
    setNewPersonInput("");
    setPayer("");
    setSaved(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const canProcess = file !== null && !isProcessing;
  const canSave = items.length > 0 && payer.trim().length > 0 && !isSaving;

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Nová účtenka</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Nahrajte účtenku, AI vyčte položky a rozdělte je mezi přátele.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-800 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input & Items */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 1: Upload & OCR */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">1. Nahrání</h2>
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="group relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-4 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/50"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Náhled" className="max-h-32 rounded-xl shadow-lg ring-4 ring-white" />
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 transition-transform group-hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Přetáhněte účtenku sem</p>
                  <p className="text-xs text-slate-400 font-medium">nebo klikněte pro výběr</p>
                </div>
              )}
              <input ref={inputRef} type="file" accept="image/*" onChange={onInputChange} className="hidden" />
            </div>
            <button
              onClick={processReceipt}
              disabled={!canProcess}
              className="mt-4 w-full rounded-2xl bg-indigo-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:shadow-none"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Zpracovávám...
                </span>
              ) : (
                "Zpracovat účtenku"
              )}
            </button>
          </section>

          {/* Loading state */}
          {isProcessing && (
            <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 flex flex-col items-center justify-center gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
              <div className="text-center">
                <p className="font-bold text-slate-900 text-sm">AI analyzuje účtenku...</p>
                <p className="text-xs text-slate-400 mt-1">Probíhá rozpoznávání položek</p>
              </div>
            </section>
          )}

          {/* Step 2: Recognized items */}
          {!isProcessing && items.length > 0 && (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">2. Položky</h2>
              <div className="max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm transition-colors hover:bg-slate-100">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 leading-tight">{item.name}</span>
                        <span className="text-xs font-medium text-slate-500">
                          {item.quantity}× @ {item.unitPrice.toFixed(2)} Kč
                        </span>
                      </div>
                      <span className="font-black tabular-nums text-slate-900">{item.totalPrice.toFixed(2)} Kč</span>
                    </li>
                  ))}
                </ul>
              </div>
              {total !== null && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 px-1">
                  <span className="text-sm font-bold text-slate-500">Celkem</span>
                  <span className="text-xl font-black tabular-nums text-indigo-600">{total.toFixed(2)} Kč</span>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Split & Save */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 3: Assign items to people */}
          {!isProcessing && items.length > 0 && !saved && (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">3. Rozdělení útraty</h2>

              <div className="mb-5 flex gap-2">
                <input
                  type="text"
                  value={newPersonInput}
                  onChange={(e) => setNewPersonInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPerson()}
                  placeholder="Jméno (např. Petr)"
                  className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
                <button
                  onClick={addPerson}
                  disabled={!newPersonInput.trim()}
                  className="rounded-2xl bg-indigo-600 px-6 text-sm font-bold text-white transition-all hover:bg-indigo-700 active:scale-[0.95] disabled:bg-slate-200"
                >
                  Přidat
                </button>
              </div>

              {people.length > 0 ? (
                <>
                  <div className="mb-6 flex flex-wrap gap-2">
                    {people.map((person) => (
                      <span
                        key={person}
                        className="group flex items-center gap-2 rounded-xl bg-indigo-50 border-2 border-indigo-100 pl-3 pr-1.5 py-1.5 text-sm font-bold text-indigo-700 transition-all hover:bg-indigo-100 hover:border-indigo-200"
                      >
                        {person}
                        <button
                          onClick={() => removePerson(person)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-indigo-300 hover:bg-indigo-200 hover:text-indigo-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {items.map((item, i) => {
                      const unassignedQty = item.quantity - getTotalAssigned(i);
                      const fullyAssigned = unassignedQty === 0;
                      return (
                        <div
                          key={i}
                          className={`group rounded-2xl border-2 p-4 transition-all ${
                            fullyAssigned ? "border-slate-100 bg-white" : "border-amber-200 bg-amber-50/50"
                          }`}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-black text-slate-800 tracking-tight">{item.name}</span>
                            <span className="text-xs font-bold tabular-nums text-slate-500">{item.totalPrice.toFixed(2)} Kč</span>
                          </div>

                          <div className="space-y-2.5">
                            {people.map((person) => {
                              const qty = getAssigned(i, person);
                              const remaining = item.quantity - getTotalAssigned(i);
                              return (
                                <div key={person} className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide truncate w-24">
                                    {person}
                                  </span>
                                  <div className="flex items-center gap-2.5 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                                    <button
                                      onClick={() => adjustAssignment(i, person, -1)}
                                      disabled={qty === 0}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 disabled:opacity-20"
                                    >
                                      −
                                    </button>
                                    <span className="w-4 text-center text-xs font-black tabular-nums text-slate-900">
                                      {qty}
                                    </span>
                                    <button
                                      onClick={() => adjustAssignment(i, person, 1)}
                                      disabled={remaining === 0}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white transition-all hover:bg-indigo-700 disabled:opacity-20"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary row */}
                  <div className="mt-6 rounded-2xl bg-indigo-900 p-5 text-white shadow-xl shadow-indigo-100">
                    <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                      Přehled dluhů
                    </h3>
                    <div className="space-y-2">
                      {personTotals.map(({ name, total: pt }) => (
                        <div key={name} className="flex justify-between text-sm font-bold">
                          <span className="text-indigo-100">{name}</span>
                          <span className="tabular-nums">{pt.toFixed(2)} Kč</span>
                        </div>
                      ))}
                      {unassignedTotal > 0.005 && (
                        <div className="flex justify-between border-t border-indigo-800 pt-2 text-sm font-black text-amber-400">
                          <span>K rozdělení</span>
                          <span className="tabular-nums">{unassignedTotal.toFixed(2)} Kč</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/30">
                  <div className="mb-3 text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-slate-400">Přidejte první lidi k účtu</p>
                </div>
              )}
            </section>
          )}

          {/* Step 4: Payer + save */}
          {!isProcessing && items.length > 0 && !saved && (
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 animate-in fade-in slide-in-from-right-4 duration-700">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">4. Finalizace</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] font-black text-slate-500 uppercase tracking-widest">Plátce</label>
                  <input
                    type="text"
                    value={payer}
                    onChange={(e) => setPayer(e.target.value)}
                    placeholder="Kdo účet zatáhl?"
                    className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
                <button
                  onClick={saveTransaction}
                  disabled={!canSave}
                  className="w-full rounded-2xl bg-emerald-600 px-6 py-4 font-black text-white shadow-xl shadow-emerald-100 transition-all hover:bg-emerald-700 hover:shadow-emerald-200 active:scale-[0.98] disabled:bg-slate-200 disabled:shadow-none"
                >
                  {isSaving ? "Ukládám..." : "Uložit transakci"}
                </button>
              </div>
            </section>
          )}

          {/* Success card */}
          {saved && (
            <section className="rounded-[2.5rem] border-4 border-emerald-100 bg-white p-8 text-center shadow-2xl shadow-emerald-100 animate-in zoom-in duration-500">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900">Skvělá práce!</h2>
              <p className="mt-2 font-medium text-slate-500">
                Účtenka byla úspěšně uložena (ID <span className="text-indigo-600 font-bold">#{saved.id}</span>).
              </p>

              {personTotals.some((p) => p.name !== saved.payer && p.total > 0) && (
                <div className="mt-8 rounded-3xl bg-slate-50 p-6 text-left">
                  <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Dlužné částky</p>
                  <ul className="space-y-3">
                    {personTotals
                      .filter((p) => p.name !== saved.payer && p.total > 0)
                      .map(({ name, total: pt }) => (
                        <li key={name} className="flex items-center justify-between font-bold text-sm">
                          <span className="text-slate-600">{name}</span>
                          <span className="rounded-xl bg-white px-3 py-1 text-slate-900 shadow-sm border border-slate-100">{pt.toFixed(2)} Kč</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <button
                onClick={reset}
                className="mt-8 w-full rounded-2xl bg-slate-900 px-6 py-4 font-black text-white transition-all hover:bg-slate-800 active:scale-[0.98] shadow-lg"
              >
                Nová účtenka
              </button>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
