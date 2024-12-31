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
      <div className="w-24">{/* Empty div to balance the layout */}</div>
      <Link href="https://jex.us/" className="relative w-24 h-8">
        <Image
          src="/logo.png"
          alt="Logo"
          fill
          className="object-contain"
          priority
        />
      </Link>
      <div className="flex gap-2 w-24 justify-end">
        <Button
          variant="outline"
          onClick={
            authenticated ? () => (window.location.href = "/account") : login
          }
          size="icon"
          className={
            authenticated
              ? "md:w-auto md:px-4 md:h-10"
              : "md:w-auto md:px-4 md:h-10"
          }
        >
          <User className="h-4 w-4 md:hidden" />
          {authenticated ? (
            <span className="hidden md:inline">Collection</span>
          ) : (
            <span className="hidden md:inline">Connect</span>
          )}
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
