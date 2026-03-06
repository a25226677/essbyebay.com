"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export function AccountSignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message || "Failed to sign out");
        return;
      }
      toast.success("Signed out successfully");
      router.replace("/users/login");
      router.refresh();
    } catch {
      toast.error("Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2 text-destructive"
      disabled={loading}
      onClick={handleSignOut}
    >
      <LogOut size={16} /> {loading ? "Signing out..." : "Sign Out"}
    </Button>
  );
}
