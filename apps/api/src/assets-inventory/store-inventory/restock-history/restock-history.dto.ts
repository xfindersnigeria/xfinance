export class CreateRestockHistoryDto {
  supplyId: string;
  quantity: number;
  unitPrice: number;
  supplier: string;
  notes?: string;
  restockDate?: Date;
}

export class UpdateRestockHistoryDto {
  quantity?: number;
  unitPrice?: number;
  totalCost?: number;
  supplier?: string;
  // restockedBy?: string;
  notes?: string;
  restockDate?: Date;
}
