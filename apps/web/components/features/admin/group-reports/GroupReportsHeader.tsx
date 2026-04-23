"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";

export default function GroupReportsHeader() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="w-full bg-white px-4 sm:px-6 md:px-8 py-6 md:py-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-6">Group Reports Center</h1>
        
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search reports"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-lg h-11 border-gray-300"
            />
          </div>
          <Button className=" rounded-lg gap-2 whitespace-nowrap">
            <Plus className="h-4 w-4" />
            Create New Report
          </Button>
        </div>
      </div>
    </div>
  );
}
