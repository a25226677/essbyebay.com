"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export function AccountSignOutButton() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signout?next=/users/login", { method: "POST" });
      if (!res.ok) {
        toast.error("Failed to sign out");
        setLoading(false);
        return;
      }
      // Redirect to login page after signing out (don't rely on fetch redirect URL)
      window.location.href = "/users/login";
    } catch {
      toast.error("Failed to sign out");
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
