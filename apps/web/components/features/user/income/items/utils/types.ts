export interface Item {
  id: string;
  code: string;
  name: string;
  description: string;
  type: "service" | "goods";
  category: string;
  unitPrice: number;
  incomeAccountId: string;
  incomeAccountName: string;
  isTaxable: boolean;
  isActive: boolean;
  entityId: string;
}

export type ItemsResponse = {
  items: Item[];
  totalItems: number;
  serviceItems: number;
  goodsItems: number;
  avgPrice: number;
  totalPages: number;
  total: number;
};
