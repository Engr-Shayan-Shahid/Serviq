"use client";

import { forwardRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { buildTableMenuUrl } from "@/lib/qr";
import type { RestaurantTable } from "@/lib/types";

type PrintAllQrCodesProps = {
  tables: RestaurantTable[];
  restaurantSlug: string;
  restaurantName: string;
};

export const PrintAllQrCodes = forwardRef<HTMLDivElement, PrintAllQrCodesProps>(
  function PrintAllQrCodes(
    { tables, restaurantSlug, restaurantName },
    ref
  ) {
    return (
      <div ref={ref} className="bg-white p-6 text-slate-900">
        <div className="mb-6 border-b border-slate-200 pb-4 text-center">
          <h1 className="text-xl font-semibold">{restaurantName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Table QR codes — scan to open the menu
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {tables.map((table) => {
            const menuUrl = buildTableMenuUrl(
              restaurantSlug,
              table.table_number
            );

            return (
              <div
                key={table.id}
                className="flex break-inside-avoid flex-col items-center rounded-lg border border-slate-200 p-4"
              >
                <QRCodeCanvas
                  value={menuUrl}
                  size={160}
                  level="M"
                  includeMargin
                />
                <p className="mt-3 text-base font-semibold">
                  Table {table.table_number}
                </p>
                <p className="mt-1 text-center text-[10px] text-slate-400">
                  {restaurantName}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
