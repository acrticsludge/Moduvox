import { Navbar } from "@/components/ui/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex flex-col items-center justify-center min-h-screen px-4 pt-16">
        <h1 className="text-4xl font-semibold tracking-tight text-charcoal">
          Moduvox
        </h1>
        <p className="mt-4 text-lg text-muted-steel">
          Your slides. Your voice. No recording.
        </p>
      </main>
    </>
  );
}
