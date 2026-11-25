"use client";

import { useActionState } from "react";

// Form generik untuk server action bertanda tangan (prevState, formData).
// Menampilkan pesan error dari action dan meminta konfirmasi jika `confirmText` diisi.
export default function ActionForm({ action, children, className = "", confirmText }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
      {state?.error && <p className="alert-error mt-2" role="alert">{state.error}</p>}
      {state?.message && <p className="alert-info mt-2">{state.message}</p>}
    </form>
  );
}
