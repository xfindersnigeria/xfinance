"use client"
import { useParams } from 'next/navigation';
import React from 'react'

export default function ReportsDetails() {
      const params = useParams();
    const key = params?.key ? params.key.toString() : "";
  return (
    <div>
        <h1>Report Details for {key}</h1>
    </div>
  )
}
