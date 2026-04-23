"use client"
import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

// Modal context type
type ModalContextType = {
  openModals: Record<string, boolean>;
  openModal: (key: string) => void;
  closeModal: (key: string) => void;
  isOpen: (key: string) => boolean;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within a ModalProvider");
  return ctx;
};

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [openModals, setOpenModals] = useState<Record<string, boolean>>({});

  const openModal = useCallback((key: string) => {
    setOpenModals((prev) => ({ ...prev, [key]: true }));
  }, []);

  const closeModal = useCallback((key: string) => {
    setOpenModals((prev) => ({ ...prev, [key]: false }));
  }, []);

  const isOpen = useCallback((key: string) => !!openModals[key], [openModals]);

  return (
    <ModalContext.Provider value={{ openModals, openModal, closeModal, isOpen }}>
      {children}
    </ModalContext.Provider>
  );
};
