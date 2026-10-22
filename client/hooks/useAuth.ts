
"use client";

import { AuthContext } from "@/context/Authcontext";
import { useContext } from "react";

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
}
