import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate, type NavigateOptions } from "react-router-dom";
import { appConfirmUnsaved } from "./appDialog";

type UnsavedGuard = {
  isDirty: () => boolean;
  save: () => Promise<boolean>;
};

type UnsavedChangesContextValue = {
  registerGuard: (guard: UnsavedGuard | null) => void;
  confirmLeave: () => Promise<boolean>;
  tryNavigate: (to: string, options?: NavigateOptions) => Promise<void>;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null
);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const guardRef = useRef<UnsavedGuard | null>(null);

  const registerGuard = useCallback((guard: UnsavedGuard | null) => {
    guardRef.current = guard;
  }, []);

  const confirmLeave = useCallback(async () => {
    const guard = guardRef.current;
    if (!guard?.isDirty()) {
      return true;
    }

    const choice = await appConfirmUnsaved();
    if (choice === "cancel") {
      return false;
    }
    if (choice === "discard") {
      return true;
    }

    return guard.save();
  }, []);

  const tryNavigate = useCallback(
    async (to: string, options?: NavigateOptions) => {
      if (!(await confirmLeave())) {
        return;
      }
      navigate(to, options);
    },
    [confirmLeave, navigate]
  );

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!guardRef.current?.isDirty()) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <UnsavedChangesContext.Provider
      value={{ registerGuard, confirmLeave, tryNavigate }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error(
      "useUnsavedChanges must be used within UnsavedChangesProvider"
    );
  }
  return context;
}

/** Register dirty/save handlers for the current page. */
export function useRegisterUnsavedGuard(
  isDirty: boolean,
  onSave: () => Promise<boolean>
) {
  const { registerGuard } = useUnsavedChanges();
  const dirtyRef = useRef(isDirty);
  const saveRef = useRef(onSave);

  dirtyRef.current = isDirty;
  saveRef.current = onSave;

  useEffect(() => {
    registerGuard({
      isDirty: () => dirtyRef.current,
      save: () => saveRef.current(),
    });

    return () => registerGuard(null);
  }, [registerGuard]);
}
