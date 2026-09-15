"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Copy, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { formatTime } from "@/lib/format";
import { ownerSupabase } from "@/lib/supabase";
import type { Staff, StaffRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner",
  kitchen: "Kitchen",
  waiter: "Waiter",
};

const ROLE_STYLES: Record<StaffRole, string> = {
  owner: "border-slate-300 bg-slate-100 text-slate-800",
  kitchen: "border-blue-200 bg-blue-50 text-blue-800",
  waiter: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

type InviteRole = "kitchen" | "waiter";

export default function StaffManagementPage() {
  const { restaurantId, role, loading: authLoading } = useAuth(ownerSupabase);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("kitchen");
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Staff | null>(null);
  const [removing, setRemoving] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadStaff = useCallback(async () => {
    if (!restaurantId) {
      setStaff([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = ownerSupabase;
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error(error.message);
      setStaff([]);
    } else {
      setStaff((data as Staff[]) || []);
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (authLoading) return;
    void loadStaff();
  }, [authLoading, loadStaff]);

  function resetInviteForm() {
    setName("");
    setEmail("");
    setInviteRole("kitchen");
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: inviteRole,
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        tempPassword?: string;
        staff?: Staff;
      };

      if (!res.ok) {
        toast.error(payload.error || "Failed to invite staff");
        setSaving(false);
        return;
      }

      toast.success("Staff member invited");
      setInviteOpen(false);
      resetInviteForm();
      setInvitedEmail(email.trim().toLowerCase());
      setTempPassword(payload.tempPassword || null);
      setCopied(false);
      await loadStaff();
    } catch {
      toast.error("Failed to invite staff");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);

    try {
      const res = await fetch("/api/staff/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: removeTarget.id }),
      });

      const payload = (await res.json()) as { error?: string };

      if (!res.ok && res.status !== 207) {
        toast.error(payload.error || "Failed to remove staff");
        setRemoving(false);
        return;
      }

      if (res.status === 207) {
        toast.message(payload.error || "Staff removed with a warning");
      } else {
        toast.success("Staff member removed");
      }

      setStaff((prev) => prev.filter((s) => s.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch {
      toast.error("Failed to remove staff");
    } finally {
      setRemoving(false);
    }
  }

  async function copyPassword() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      toast.success("Password copied");
    } catch {
      toast.error("Could not copy password");
    }
  }

  if (!authLoading && role && role !== "owner") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-700">
        Only restaurant owners can manage staff.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-white">
            Staff
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Invite kitchen and waiter accounts. Share the temporary password so
            they can sign in to their panel.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setInviteOpen(true)}>
          <UserPlus className="size-4" />
          Invite Staff
        </Button>
      </div>

      {authLoading || loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">
          Loading staff…
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
          <p className="text-sm font-medium text-slate-800">No staff yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Invite your first kitchen or waiter account.
          </p>
          <Button className="mt-4 gap-2" onClick={() => setInviteOpen(true)}>
            <Plus className="size-4" />
            Invite Staff
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {staff.map((member) => {
              const canRemove =
                member.role === "kitchen" || member.role === "waiter";
              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {member.name}
                      </p>
                      <p className="mt-0.5 break-all text-sm text-zinc-500">
                        {member.email}
                      </p>
                    </div>
                    {canRemove ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setRemoveTarget(member)}
                        aria-label={`Remove ${member.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(ROLE_STYLES[member.role])}
                    >
                      {ROLE_LABELS[member.role]}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {formatTime(member.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-500">Name</TableHead>
                  <TableHead className="text-slate-500">Email</TableHead>
                  <TableHead className="text-slate-500">Role</TableHead>
                  <TableHead className="text-slate-500">Created</TableHead>
                  <TableHead className="text-right text-slate-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => {
                  const canRemove =
                    member.role === "kitchen" || member.role === "waiter";
                  return (
                    <TableRow key={member.id} className="border-slate-100">
                      <TableCell className="font-medium text-slate-900">
                        {member.name}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {member.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(ROLE_STYLES[member.role])}
                        >
                          {ROLE_LABELS[member.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatTime(member.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {canRemove ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setRemoveTarget(member)}
                            aria-label={`Remove ${member.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) resetInviteForm();
        }}
      >
        <DialogContent>
          <form onSubmit={(e) => void handleInvite(e)}>
            <DialogHeader>
              <DialogTitle>Invite staff</DialogTitle>
              <DialogDescription>
                Creates a login for kitchen or waiter access. You’ll get a
                temporary password to share.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="staff-name">Name</Label>
                <Input
                  id="staff-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-email">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@restaurant.com"
                />
              </div>
              <div className="space-y-3">
                <Label>Role</Label>
                <RadioGroup
                  value={inviteRole}
                  onValueChange={(value) =>
                    setInviteRole(value as InviteRole)
                  }
                  className="grid gap-2"
                >
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[[data-checked]]:border-slate-900 has-[[data-checked]]:bg-slate-50">
                    <RadioGroupItem value="kitchen" />
                    Kitchen Staff
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[[data-checked]]:border-slate-900 has-[[data-checked]]:bg-slate-50">
                    <RadioGroupItem value="waiter" />
                    Waiter
                  </label>
                </RadioGroup>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Inviting…" : "Invite staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!tempPassword}
        onOpenChange={(open) => {
          if (!open) {
            setTempPassword(null);
            setInvitedEmail(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share temporary password</DialogTitle>
            <DialogDescription>
              Give this password to{" "}
              <span className="font-medium text-slate-800">
                {invitedEmail}
              </span>{" "}
              so they can sign in at{" "}
              <span className="font-medium text-slate-800">
                /auth/kitchen/login
              </span>{" "}
              or{" "}
              <span className="font-medium text-slate-800">
                /auth/waiter/login
              </span>
              , matching their role.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Temporary password
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all font-mono text-sm text-slate-900">
                {tempPassword}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => void copyPassword()}
                aria-label="Copy password"
              >
                {copied ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setTempPassword(null);
                setInvitedEmail(null);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove staff member?</DialogTitle>
            <DialogDescription>
              This removes{" "}
              <span className="font-medium text-slate-800">
                {removeTarget?.name}
              </span>{" "}
              from your restaurant and disables their login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmRemove()}
              disabled={removing}
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
