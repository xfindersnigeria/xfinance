"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import PointOfSale from "./PointOfSale";

/**
 * Full-screen POS, opened from the header's Quick Sale button or the Orders
 * page (`openModal(MODAL.POS)`). An overlay rather than a route, so it needs
 * no menu module of its own. Mounted once, in the dashboard header.
 */
export default function PosOverlay() {
  const { isOpen, openModal, closeModal } = useModal();
  const open = isOpen(MODAL.POS);

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? openModal(MODAL.POS) : closeModal(MODAL.POS))}>
      <DialogContent
        showCloseButton={false}
        // Escape shouldn't throw away a sale in progress — use "Exit POS"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="left-0 top-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100"
      >
        <DialogTitle className="sr-only">Point of Sale</DialogTitle>
        <DialogDescription className="sr-only">Quick sales and checkout</DialogDescription>
        {open && <PointOfSale onExit={() => closeModal(MODAL.POS)} />}
      </DialogContent>
    </Dialog>
  );
}
