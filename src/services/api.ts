import { assertSupabaseConfigured } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

export const api = {
  chatUrl(functionName = "tutor-chat") {
    assertSupabaseConfigured();
    return `${SUPABASE_URL}/functions/v1/${functionName}`;
  },
};
