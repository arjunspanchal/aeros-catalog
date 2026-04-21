"use client";
import ItemForm from "./ItemForm";

const EMPTY = {
  section: "",
  sortOrder: 0,
  productName: "",
  material: "",
  dimension: "",
  cartonSize: "",
  casePack: "",
  moq: "",
  pricingMode: "fixed",
  cupSpec: null,
  tierQtys: [30000, 50000, 100000],
  fixedRates: [
    { qty: 30000, rate: "" },
    { qty: 50000, rate: "" },
    { qty: 100000, rate: "" },
  ],
  notes: "",
};

export default function NewItemForm({ onSubmit }) {
  return (
    <ItemForm
      initial={EMPTY}
      submitLabel="Add item"
      onSubmit={onSubmit}
    />
  );
}
