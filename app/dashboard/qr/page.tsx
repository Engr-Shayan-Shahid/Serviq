"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { PrintAllQrCodes } from "@/components/dashboard/PrintAllQrCodes";
import { TableQrCard } from "@/components/dashboard/TableQrCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ScaleOnHover,
  StaggerContainer,
} from "@/components/shared/animations";
import { useAuth } from "@/hooks/useAuth";
import { toastError } from "@/lib/errors";
import { buildTableMenuUrl } from "@/lib/qr";
import { ownerSupabase } from "@/lib/supabase";
import type { Restaurant, RestaurantTable } from "@/lib/types";

export default function TablesQrPage() {
  const { restaurantId, loading: authLoading } = useAuth(ownerSupabase);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RestaurantTable | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: restaurant
      ? `${restaurant.name}-table-qr-codes`
      : "table-qr-codes",
    pageStyle: `
      @page { margin: 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
    `,
  });

  const loadData = useCallback(async () => {
    if (!restaurantId) {
      setRestaurant(null);
      setTables([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = ownerSupabase;

    const [restaurantRes, tablesRes] = await Promise.all([
      supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .maybeSingle(),
      supabase
        .from("tables")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("table_number", { ascending: true }),
    ]);

    if (restaurantRes.error) {
      toast.error(restaurantRes.error.message);
    } else {
      setRestaurant((restaurantRes.data as Restaurant | null) ?? null);
    }

    if (tablesRes.error) {
      toast.error(tablesRes.error.message);
      setTables([]);
    } else {
      setTables((tablesRes.data as RestaurantTable[]) || []);
    }

    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (authLoading) return;
    void loadData();
  }, [authLoading, loadData]);

  async function handleAddTable(event: FormEvent) {
    event.preventDefault();
    if (!restaurantId || !restaurant) return;

    const number = tableNumber.trim();
    if (!number) {
      toast.error("Enter a table number.");
      return;
    }

    setSaving(true);
    try {
      const supabase = ownerSupabase;
      const qrCodeUrl = buildTableMenuUrl(restaurant.slug, number);

      const { error } = await supabase.from("tables").insert({
        restaurant_id: restaurantId,
        table_number: number,
        qr_code_url: qrCodeUrl,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("That table number already exists.");
        }
        throw error;
      }

      toast.success(`Table ${number} added`);
      setTableNumber("");
      setAddOpen(false);
      await loadData();
    } catch (err) {
      toastError(err, "Failed to add table");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!restaurantId || !deleteTarget) return;

    setDeleting(true);
    try {
      const supabase = ownerSupabase;
      const { error } = await supabase
        .from("tables")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      toast.success(`Table ${deleteTarget.table_number} deleted`);
      setTables((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      toastError(err, "Failed to delete table");
    } finally {
      setDeleting(false);
    }
  }

  const slug = restaurant?.slug || "";
  const name = restaurant?.name || "Restaurant";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-white">
            Tables & QR
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Generate printable QR codes so customers can open your menu from
            their table.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={tables.length === 0 || !slug}
            onClick={() => handlePrint()}
          >
            <Printer className="size-4" />
            Print All QR Codes
          </Button>
          <Button
            type="button"
            className="gap-2"
            onClick={() => setAddOpen(true)}
            disabled={!restaurant}
          >
            <Plus className="size-4" />
            Add Table
          </Button>
        </div>
      </div>

      {authLoading || loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">
          Loading tables…
        </div>
      ) : !restaurant ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-zinc-500">
          Restaurant not found for this account.
        </div>
      ) : tables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
          <p className="text-sm font-medium text-slate-800">No tables yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Add your first table to generate a QR code.
          </p>
          <Button className="mt-4 gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add Table
          </Button>
        </div>
      ) : (
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => (
            <ScaleOnHover key={table.id}>
              <TableQrCard
                table={table}
                restaurantSlug={slug}
                restaurantName={name}
                onDelete={setDeleteTarget}
              />
            </ScaleOnHover>
          ))}
        </StaggerContainer>
      )}

      {/* Off-screen print layout */}
      <div className="fixed top-[-10000px] left-[-10000px]" aria-hidden>
        {slug ? (
          <PrintAllQrCodes
            ref={printRef}
            tables={tables}
            restaurantSlug={slug}
            restaurantName={name}
          />
        ) : null}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <form onSubmit={(e) => void handleAddTable(e)}>
            <DialogHeader>
              <DialogTitle>Add table</DialogTitle>
              <DialogDescription>
                Enter the table number customers will see on the QR label.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="table-number">Table number</Label>
              <Input
                id="table-number"
                required
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. 1, A1, Patio-3"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !tableNumber.trim()}>
                {saving ? "Saving…" : "Add table"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete table?</DialogTitle>
            <DialogDescription>
              This removes table{" "}
              <span className="font-medium text-slate-800">
                {deleteTarget?.table_number}
              </span>{" "}
              and its QR code. Existing orders keep the table number snapshot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
