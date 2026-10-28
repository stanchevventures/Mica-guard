"use client";

export function PrintButton() {
  return (
    <button type="button" className="rp-btn" onClick={() => window.print()}>
      Печат / Запази като PDF
    </button>
  );
}
