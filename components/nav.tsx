"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";
import { Power, User } from "lucide-react";

export function Nav() {
  const { login, authenticated, logout } = usePrivy();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm">
      <Link href="/" className="relative w-24 h-8">
        <Image
          src="/logo.png"
          alt="Logo"
          fill
          className="object-contain"
          priority
        />
      </Link>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={
            authenticated ? () => (window.location.href = "/account") : login
          }
        >
          {authenticated ? "Collection" : "Login"}
        </Button>
        {authenticated && (
          <>
            <Button variant="ghost" size="icon" onClick={logout}>
              <Power className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
