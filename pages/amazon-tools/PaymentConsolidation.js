"use client";
import React, { useState } from "react";
import Papa from "papaparse";

interface PaymentRow {
  orderId?: string;
  type?: string;
  description?: string;
  total?: number;
  date?: Date;
  [key: string]: any;
}

const ConsolidatePayments: React.FC = () => {
  const [data, setData] = useState<PaymentRow[]>([]);
  const [filtered, setFiltered] = useState<PaymentRow[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>("");

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data as any[];
        const cleanData: PaymentRow[] = parsed.map((row) => ({
          orderId: row["order id"] || row["Order ID"] || row["ORDER ID"] || "",
          type: row["type"] || row["Type"] || "",
          description: row["description"] || row["Description"] || "",
          total: parseFloat(row["total"] || row["Total"] || "0") || 0,
          date: row["date/time"]
            ? new Date(row["date/time"])
            : new Date(row["date"] || row["Date"] || Date.now()),
          ...row,
        }));
        setData(cleanData);
        setFiltered(cleanData);
      },
    });
  };

  const consolidatePayments = (rows: PaymentRow[]) => {
    const grouped: Record<string, PaymentRow[]> = {};

    for (const row of rows) {
      const key = row.orderId
        ? `Order:${row.orderId}`
        : `Misc:${row.type}-${row.description}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    return Object.entries(grouped).map(([key, items]) => {
      const totalSum = items.reduce((sum, r) => sum + (r.total || 0), 0);
      const base = items[0];
      return {
        key,
        orderId: base.orderId || "-",
        type: base.type,
        description: base.description,
        total: totalSum,
        count: items.length,
      };
    });
  };

  const handleMonthFilter = (monthYear: string) => {
    setMonthFilter(monthYear);
    if (!monthYear) {
      setFiltered(data);
      return;
    }

    const [year, month] = monthYear.split("-");
    const filteredData = data.filter((row) => {
      if (!row.date) return false;
      const d = new Date(row.date);
      return (
        d.getFullYear() === parseInt(year) &&
        d.getMonth() + 1 === parseInt(month)
      );
    });
    setFiltered(filteredData);
  };

  const consolidated = consolidatePayments(filtered);
  const grandTotal = consolidated.reduce((sum, r) => sum + (r.total || 0), 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Payment Consolidator</h2>

      <div className="mb-4 flex items-center gap-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleCSVUpload}
          className="border p-2 rounded"
        />
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => handleMonthFilter(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      <div className="mb-2 text-lg font-semibold">
        Total of filtered payments: ₹{grandTotal.toFixed(2)}
      </div>

      <table className="w-full border-collapse bg-white shadow-md rounded">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Order ID / Key</th>
            <th className="border p-2">Type</th>
            <th className="border p-2">Description</th>
            <th className="border p-2"># Payments</th>
            <th className="border p-2">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {consolidated.map((r, i) => (
            <tr key={i} className="border-t hover:bg-gray-50">
              <td className="p-2">{r.orderId || r.key}</td>
              <td className="p-2">{r.type}</td>
              <td className="p-2">{r.description}</td>
              <td className="p-2 text-center">{r.count}</td>
              <td className="p-2 font-semibold text-right">
                ₹{r.total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ConsolidatePayments;
