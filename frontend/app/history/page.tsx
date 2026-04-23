"use client";

import { useEffect, useState } from "react";

const CORE_URL = "http://localhost:8080/api/transactions";

type Assignment = {
  id: number;
  person: string;
  quantity: number;
};

type Item = {
  id: number;
  quantity: number;
  name: string;
  unitPrice: number;
  totalPrice: number;
  assignments: Assignment[];
};

type Transaction = {
  id: number;
  payer: string;
  totalAmount: number;
  paid: boolean;
  items: Item[];
};

// Computes the total amount owed by each person based on their quantity assignments.
function computeDebts(t: Transaction): Record<string, number> {
  const debts: Record<string, number> = {};
  for (const item of t.items) {
    for (const a of item.assignments) {
      debts[a.person] = (debts[a.person] ?? 0) + a.quantity * item.unitPrice;
    }
  }
  return debts;
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(CORE_URL);
      if (!res.ok) throw new Error(`Chyba serveru (${res.status})`);
      setTransactions(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nepodařilo se načíst historii.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMarkPaid(id: number) {
    try {
      const res = await fetch(`${CORE_URL}/${id}/pay`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      const updated: Transaction = await res.json();
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      setError("Nepodařilo se označit transakci jako zaplacenou.");
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`${CORE_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError("Nepodařilo se smazat transakci.");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Historie účtenek</h1>
        <p className="mt-1 text-slate-600">Všechny uložené transakce</p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-500">Zatím žádné uložené účtenky.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((t) => {
            const debts = computeDebts(t);
            const debtors = Object.entries(debts).filter(([name]) => name !== t.payer);
            return (
              <div
                key={t.id}
                className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ${
                  t.paid ? "ring-emerald-300" : "ring-slate-200"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">#{t.id}</span>
                      {t.paid && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Zaplaceno
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Plátce: <span className="font-semibold text-slate-900">{t.payer}</span>
                    </p>
                    <p className="text-xl font-bold tabular-nums">{t.totalAmount.toFixed(2)} Kč</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 gap-2">
                    {!t.paid && (
                      <button
                        onClick={() => handleMarkPaid(t.id)}
                        className="rounded-lg border border-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                      >
                        Označit jako zaplaceno
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Smazat
                    </button>
                  </div>
                </div>

                {/* Debt breakdown — who owes what to the payer */}
                {debtors.length > 0 && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Dluhy vůči plátci
                    </p>
                    <ul className="space-y-1">
                      {debtors.map(([name, amount]) => (
                        <li key={name} className="flex justify-between text-sm">
                          <span>{name}</span>
                          <span className="font-medium tabular-nums">{amount.toFixed(2)} Kč</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
