import { redirect } from "next/navigation";
import { getSession } from "@/lib/hub/session";
import AppHeader from "../../components/AppHeader";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import DielineClient from "./DielineClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dieline Generator — Aeros",
  description:
    "Parametric KLD generator for one-piece lock-corner cake / snack boxes. Set the size, preview the die, download PDF / SVG / DXF.",
};

export default function DielinePage() {
  const session = getSession();
  if (!session) redirect("/login");

  return (
    <>
      <AppHeader session={session} />
      <Header
        title="Dieline Generator"
        subtitle="Parametric KLD for one-piece lock-corner cake / snack boxes — set the internal size, preview the die, download for the die maker."
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DielineClient />
      </main>
      <Footer />
    </>
  );
}
