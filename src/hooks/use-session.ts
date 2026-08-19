import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MembershipRole = Database["public"]["Enums"]["membership_role"];
export type MembershipStatus = Database["public"]["Enums"]["membership_status"];

export type CurrentMembership = {
  id: string;
  role: MembershipRole;
  status: MembershipStatus;
  organization_id: string;
  organization_name: string;
};

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export function useCurrentMembership(userId: string | undefined) {
  return useQuery({
    queryKey: ["membership", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<CurrentMembership | null> => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, role, status, organization_id, organizations(name)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        role: data.role,
        status: data.status,
        organization_id: data.organization_id,
        organization_name: data.organizations?.name ?? "Minha equipe",
      };
    },
  });
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function isManager(role: MembershipRole | undefined) {
  return role === "leader" || role === "minister";
}
