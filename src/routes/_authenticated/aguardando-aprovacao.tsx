import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, useCurrentMembership } from "@/hooks/use-session";
import { PageSkeleton } from "@/components/app-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/aguardando-aprovacao")({
  component: AguardandoPage,
});

function AguardandoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuthUser();
  const { data: membership, isPending, refetch } = useCurrentMembership(user?.id);

  useEffect(() => {
    if (loading || isPending) return;
    if (!membership) {
      navigate({ to: "/criar-equipe", replace: true });
      return;
    }
    if (membership.status === "active") navigate({ to: "/dashboard", replace: true });
  }, [loading, isPending, membership, navigate]);

  if (loading || isPending || !membership) return <PageSkeleton />;

  async function handleSignOut() {
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {membership.status === "inactive" ? "Acesso inativo" : "Aguardando aprovação"}
          </CardTitle>
          <CardDescription>
            {membership.status === "inactive"
              ? `Seu acesso à equipe ${membership.organization_name} está inativo. Fale com o líder.`
              : `Seu pedido para entrar em ${membership.organization_name} foi enviado. O líder precisa aprovar seu acesso.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={() => void refetch()}>
            Verificar novamente
          </Button>
          <Button variant="outline" className="w-full" onClick={() => void handleSignOut()}>
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
