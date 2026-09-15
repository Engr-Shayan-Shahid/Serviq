"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildTableMenuUrl, downloadCanvasPng } from "@/lib/qr";
import type { RestaurantTable } from "@/lib/types";

type TableQrCardProps = {
  table: RestaurantTable;
  restaurantSlug: string;
  restaurantName: string;
  onDelete: (table: RestaurantTable) => void;
};

export function TableQrCard({
  table,
  restaurantSlug,
  restaurantName,
  onDelete,
}: TableQrCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const menuUrl = buildTableMenuUrl(restaurantSlug, table.table_number);

  function handleDownload() {
    const canvas =
      canvasRef.current ||
      (document.getElementById(
        `qr-canvas-${table.id}`
      ) as HTMLCanvasElement | null);

    const ok = downloadCanvasPng(
      canvas,
      `${restaurantSlug}-table-${table.table_number}.png`
    );

    if (ok) {
      toast.success(`Downloaded QR for table ${table.table_number}`);
    } else {
      toast.error("Could not download QR code");
    }
  }

  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base text-slate-900">
            Table {table.table_number}
          </CardTitle>
          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-slate-600"
          >
            QR ready
          </Badge>
        </div>
        <p className="truncate text-xs text-slate-400">{menuUrl}</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <QRCodeCanvas
            id={`qr-canvas-${table.id}`}
            ref={canvasRef}
            value={menuUrl}
            size={180}
            level="M"
            includeMargin
            title={`${restaurantName} table ${table.table_number}`}
          />
        </div>
        <p className="text-sm font-medium text-slate-700">
          Table {table.table_number}
        </p>
      </CardContent>
      <CardFooter className="flex gap-2 border-t border-slate-100 pt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1 gap-2"
          onClick={handleDownload}
        >
          <Download className="size-4" />
          Download QR
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => onDelete(table)}
          aria-label={`Delete table ${table.table_number}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
