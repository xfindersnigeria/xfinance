"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface Tab {
  title: string;
  value: string;
  content: React.ReactNode;
}

interface CustomTabsProps {
  tabs: Tab[];
  storageKey: string;
  variant?: "button" | "route";
  classNames?: string;
}

export function CustomTabs({ tabs, storageKey, variant = "button", classNames = "p-0" }: CustomTabsProps) {
  const [activeTab, setActiveTab] = React.useState<string | undefined>(
    undefined
  );

  React.useEffect(() => {
    // On component mount, try to get the saved tab from localStorage
    const savedTab = localStorage.getItem(storageKey);
    if (savedTab && tabs.some((tab) => tab.value === savedTab)) {
      setActiveTab(savedTab);
    } else if (tabs.length > 0) {
      // Otherwise, default to the first tab
      setActiveTab(tabs[0].value);
    }
  }, [storageKey, tabs]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Save the new active tab to localStorage
    localStorage.setItem(storageKey, value);
  };

  // Don't render anything until the active tab has been determined from localStorage
  if (activeTab === undefined) {
    return null; // or a loading skeleton
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      {variant === "route" ? (
        // Route-style variant (like RouteTabNav)
        <div className={cn("overflow-x-auto bg-white border-b border-t border-gray-400")}>
          <div className="flex gap-2 px-4 py-0 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={cn(
                  "px-4 py-2 text-sm font-normal whitespace-nowrap",
                  activeTab === tab.value &&
                    "border-b-2 border-primary text-primary"
                )}
              >
                {tab.title}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Default button-style variant
        <div className="w-full relative ">
          <TabsList className={`bg-transparent shadow-none space-x-5`}>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className='font-normal relative  data-[state=active]:bg-primary data-[state=active]:shadow-none data-[state=active]:font-semibold  data-[state=active]:text-white border border-black bg-white text-black'
              >
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      )}
      {tabs.map((tab) => (
        <TabsContent className={cn(classNames, "py-4")} key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
