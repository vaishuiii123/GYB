import { Copy, Eye, Pencil, Trash2 } from "lucide-react";

type IconBtnProps = {
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
};

export function ViewIconBtn({
  onClick,
  disabled,
  title = "View",
  className = "",
}: IconBtnProps) {
  return (
    <button
      type="button"
      className={`admin-icon-btn admin-icon-view ${className}`.trim()}
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      <Eye size={16} strokeWidth={2} />
    </button>
  );
}

export function EditIconBtn({
  onClick,
  disabled,
  title = "Edit",
  className = "",
}: IconBtnProps) {
  return (
    <button
      type="button"
      className={`admin-icon-btn admin-icon-edit ${className}`.trim()}
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      <Pencil size={16} strokeWidth={2} />
    </button>
  );
}

export function CopyIconBtn({
  onClick,
  disabled,
  title = "Use as new template",
  className = "",
}: IconBtnProps) {
  return (
    <button
      type="button"
      className={`admin-icon-btn admin-icon-copy ${className}`.trim()}
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      <Copy size={16} strokeWidth={2} />
    </button>
  );
}

export function DeleteIconBtn({
  onClick,
  disabled,
  title = "Delete",
  className = "",
}: IconBtnProps) {
  return (
    <button
      type="button"
      className={`admin-icon-btn admin-icon-delete ${className}`.trim()}
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      <Trash2 size={16} strokeWidth={2} />
    </button>
  );
}
