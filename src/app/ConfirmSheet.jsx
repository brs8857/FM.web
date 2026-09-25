import Sheet from "../ui/Sheet.jsx";
import Button from "../ui/Button.jsx";

// A yes/no question as a sheet, in place of window.confirm.
export default function ConfirmSheet({ open, title, confirmLabel, onConfirm, onClose, children }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}>
      {children}
    </Sheet>
  );
}
