import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuthUser, useCurrentMembership } from "@/hooks/use-session";
import { PageSkeleton } from "@/components/app-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const { data: membership, isPending } = useCurrentMembership(user?.id);

  useEffect(() => {
    if (loading || isPending || !membership) return;
    navigate({
      to: membership.status === "active" ? "/dashboard" : "/aguardando-aprovacao",
      replace: true,
    });
  }, [loading, isPending, membership, navigate]);

  if (loading || isPending || membership) return <PageSkeleton />;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Como você quer começar?</CardTitle>
          <CardDescription>
            Você ainda não faz parte de nenhuma equipe. Crie a sua ou entre com um convite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={() => navigate({ to: "/criar-equipe" })}>
            Criar uma nova equipe
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate({ to: "/entrar-equipe" })}
          >
            Entrar com um convite
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
