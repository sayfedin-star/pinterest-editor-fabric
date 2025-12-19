"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import {
  ChevronRight,
  Search,
  Bell,
  Plus,
  User,
  Settings,
  LogOut,
  CreditCard
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ROUTE_CONFIG: Record<string, { title: string; description: string; section: string }> = {
  "/dashboard": { 
    title: "Dashboard", 
    description: "Overview of your pin generation activity",
    section: "Overview"
  },
  "/dashboard/campaigns": { 
    title: "Campaigns", 
    description: "Manage your bulk pin generation campaigns",
    section: "Campaigns"
  },
  "/dashboard/campaigns/new": {
    title: "New Campaign",
    description: "Create a new bulk generation campaign",
    section: "Campaigns"
  },
  "/dashboard/templates": { 
    title: "Templates", 
    description: "Manage your design templates",
    section: "Library"
  },
  "/dashboard/categories": { 
    title: "Categories", 
    description: "Organize your pins with categories",
    section: "Library"
  },
  "/dashboard/tags": { 
    title: "Tags", 
    description: "Manage detailed tags for your content",
    section: "Library"
  },
};

export function PageHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");

  // Get current route config or default
  const currentRoute = ROUTE_CONFIG[pathname] || {
    title: "Dashboard",
    description: "Pinterest Pin Generator",
    section: "Overview"
  };

  // Update local state if URL changes
  useEffect(() => {
    setSearchValue(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearch = useCallback((term: string) => {
    setSearchValue(term);
  }, []);

  const executeSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue) {
      params.set("q", searchValue);
    } else {
      params.delete("q");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <header className="h-16 px-6 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between transition-all duration-200">
      
      {/* Left: Breadcrumbs / Context */}
      <div className="flex items-center min-w-0">
         <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
            <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">grid_view</span>
            </Link>
            
            {currentRoute.section !== "Overview" && (
              <>
                <ChevronRight className="h-4 w-4 mx-2 text-gray-300" />
                <span className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                   {currentRoute.title}
                </span>
              </>
            )}
         </div>
      </div>

      {/* Right: Actions, Search, Profile */}
      <div className="flex items-center gap-4">
        {/* Search Bar - Sleek Pill */}
        <div className="relative group hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 group-hover:text-primary-creative transition-colors" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
            placeholder="Search..."
            className="block w-64 pl-10 pr-3 py-2 border-none rounded-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-creative/20 transition-all text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700/50"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-4">
           {/* Notification Bell */}
           <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border border-white dark:border-gray-900"></span>
           </button>

           {/* Primary Action - Context Aware */}
           <Link 
              href="/dashboard/campaigns/new" 
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm hover:shadow-md bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              <Plus className="h-4 w-4" />
              <span>New</span>
           </Link>

           {/* User Profile */}
           <div className="pl-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow-sm cursor-pointer flex items-center justify-center text-white font-medium text-xs hover:ring-2 hover:ring-blue-200 transition-all outline-none">
                    JD
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
        </div>
      </div>
    </header>
  );
}
