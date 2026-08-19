import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isManager,
  useAuthUser,
  useCurrentMembership,
  type CurrentMembership,
  type MembershipRole,
} from "@/hooks/use-session";

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

export function AppPage({
  title,
  roles,
  children,
}: {
  title: string;
  roles?: MembershipRole[];
  children: (ctx: { membership: CurrentMembership; userId: string }) => ReactNode;
}) {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const { data: membership, isPending } = useCurrentMembership(user?.id);

  const status = membership?.status;
  const role = membership?.role;
  const blockedByRole = Boolean(roles && role && !roles.includes(role));

  useEffect(() => {
    if (loading || isPending) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (!membership) {
      navigate({ to: "/criar-equipe", replace: true });
      return;
    }
    if (status === "pending" || status === "inactive") {
      navigate({ to: "/aguardando-aprovacao", replace: true });
      return;
    }
    if (blockedByRole) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, isPending, user, membership, status, blockedByRole, navigate]);

  if (loading || isPending || !user || !membership || status !== "active" || blockedByRole) {
    return <PageSkeleton />;
  }

  return (
    <AppShell membership={membership} title={title}>
      {children({ membership, userId: user.id })}
    </AppShell>
  );
}

export { isManager };
