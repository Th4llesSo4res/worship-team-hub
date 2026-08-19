import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ListMusic, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WorshipApp | Escalas e repertório da equipe de louvor" },
      {
        name: "description",
        content:
          "Organize escalas, confirmações e repertório da equipe de louvor da sua igreja em um app mobile-first.",
      },
      { property: "og:title", content: "WorshipApp | Escalas da equipe de louvor" },
      {
        property: "og:description",
        content: "Organize escalas, confirmações e repertório da equipe de louvor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-primary text-primary-foreground">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-14">
        <section className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">WorshipApp</p>
          <h1 className="font-display text-4xl font-semibold leading-tight">
            A escala do louvor organizada em um só lugar
          </h1>
          <p className="text-primary-foreground/75">
            Monte eventos, escale a equipe, receba confirmações e compartilhe o repertório com
            tonalidade e links de referência.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/cadastro">Criar minha equipe</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/login">Já tenho conta</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: CalendarDays, title: "Agenda", text: "Cultos, ensaios e eventos especiais." },
            { icon: Users, title: "Escalas", text: "Convide, escale e acompanhe respostas." },
            { icon: ListMusic, title: "Repertório", text: "Músicas, tons e links por evento." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-primary-foreground/15 p-4">
              <f.icon className="mb-2 size-6 text-accent" />
              <h2 className="font-display text-lg font-semibold">{f.title}</h2>
              <p className="text-sm text-primary-foreground/70">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
