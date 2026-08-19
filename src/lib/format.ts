const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return dateFormatter.format(new Date(value));
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  return timeFormatter.format(new Date(value));
}

export function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export const roleLabels: Record<string, string> = {
  leader: "Líder",
  minister: "Ministro",
  musician: "Músico",
};

export const statusLabels: Record<string, string> = {
  pending: "Pendente",
  active: "Ativo",
  inactive: "Inativo",
};

export const eventTypeLabels: Record<string, string> = {
  service: "Culto",
  rehearsal: "Ensaio",
  special: "Evento especial",
};

export const eventStatusLabels: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

export const responseLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  declined: "Recusado",
};

export const functionCategoryLabels: Record<string, string> = {
  vocal: "Vocal",
  instrument: "Instrumento",
  technical: "Técnica",
  other: "Outros",
};

export function friendlyError(error: unknown, fallback = "Não foi possível concluir a ação.") {
  if (!error) return fallback;
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : ((error as { message?: string }).message ?? "");

  if (!message) return fallback;
  if (message.includes("memberships_one_active_per_user")) return "Você já pertence a uma equipe.";
  if (message.includes("duplicate key")) return "Esse registro já existe.";
  if (message.toLowerCase().includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (message.toLowerCase().includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar.";
  if (message.toLowerCase().includes("row-level security"))
    return "Você não tem permissão para esta ação.";
  return message;
}
