export type AppDialogVariant = "info" | "success" | "error" | "warning" | "confirm";

export type AppToastItem = {
  id: number;
  message: string;
  variant: Exclude<AppDialogVariant, "confirm">;
};

export type AppConfirmRequest = {
  id: number;
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "confirm" | "warning" | "error";
  resolve: (value: boolean) => void;
};

type DialogListener = (event: {
  toasts: AppToastItem[];
  confirm: AppConfirmRequest | null;
}) => void;

let listener: DialogListener | null = null;
let toasts: AppToastItem[] = [];
let confirmRequest: AppConfirmRequest | null = null;
let nextId = 1;

function emit() {
  listener?.({ toasts: [...toasts], confirm: confirmRequest });
}

export function bindAppDialog(next: DialogListener | null) {
  listener = next;
  emit();
  return () => {
    if (listener === next) {
      listener = null;
    }
  };
}

export function inferAlertVariant(
  message: string
): Exclude<AppDialogVariant, "confirm"> {
  const text = String(message || "").toLowerCase();

  if (
    /(success|saved|created|updated|deleted|removed|assigned|submitted)/.test(
      text
    )
  ) {
    return "success";
  }

  if (
    /(fail|error|unable|wrong|invalid|required|missing|cannot|can’t|can't|denied|not found)/.test(
      text
    )
  ) {
    return "error";
  }

  if (/(already|started|locked|closed|warning|sure|really)/.test(text)) {
    return "warning";
  }

  return "info";
}

export function appAlert(
  message: unknown,
  variant?: Exclude<AppDialogVariant, "confirm">
) {
  const text = String(message ?? "").trim() || "Something happened.";
  const item: AppToastItem = {
    id: nextId++,
    message: text,
    variant: variant || inferAlertVariant(text),
  };

  toasts = [...toasts, item].slice(-4);
  emit();

  window.setTimeout(() => {
    dismissToast(item.id);
  }, item.variant === "error" ? 5200 : 3600);
}

export function dismissToast(id: number) {
  const next = toasts.filter((item) => item.id !== id);
  if (next.length === toasts.length) {
    return;
  }
  toasts = next;
  emit();
}

export function appConfirm(
  message: string,
  options?: {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "confirm" | "warning" | "error";
  }
): Promise<boolean> {
  return new Promise((resolve) => {
    if (confirmRequest) {
      confirmRequest.resolve(false);
    }

    confirmRequest = {
      id: nextId++,
      message: String(message || "").trim() || "Are you sure?",
      title: options?.title,
      confirmLabel: options?.confirmLabel || "Confirm",
      cancelLabel: options?.cancelLabel || "Cancel",
      variant: options?.variant || "confirm",
      resolve: (value) => {
        confirmRequest = null;
        emit();
        resolve(value);
      },
    };

    emit();
  });
}

export function resolveConfirm(id: number, value: boolean) {
  if (!confirmRequest || confirmRequest.id !== id) {
    return;
  }

  const { resolve } = confirmRequest;
  confirmRequest = null;
  emit();
  resolve(value);
}

/** Replace native browser alert with branded toasts. */
export function installAppDialogOverrides() {
  window.alert = ((message?: unknown) => {
    appAlert(message);
  }) as typeof window.alert;
}
