"use client";
import { useSession, signOut } from "next-auth/react";
import { Button } from "./ui/button";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold leading-tight text-gray-900">
          Onebox
        </h1>
        {session?.user && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{session.user.email}</span>
            <Button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
            >
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}