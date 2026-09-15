import { toast } from "sonner";

export function getErrorMessage(err: unknown, fallback = "Something went wrong") {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}

export function toastError(err: unknown, fallback?: string) {
  toast.error(getErrorMessage(err, fallback));
}
