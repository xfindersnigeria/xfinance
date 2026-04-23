"use client";
import Image from "next/image";
import React from "react";

export default function NoData({ text }: { text: string }) {
  return (
    <div className='flex flex-col items-center justify-center space-y-2'>
      <Image
        width={200}
        height={200}
        src='/images/noData.png'
        alt='No data'
        className='w-50 h-50 opacity-70 mx-auto'
      />
      <div className='text-gray-500 text-base font-medium font-lato'>{text}</div>
    </div>
  );
}
