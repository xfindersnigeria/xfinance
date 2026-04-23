export class CreateIssueHistoryDto {
  supplyId: string;
  quantity: number;
  issuedTo: string;
  type: string;
  purpose: string;
  issuedById: string;
  notes?: string;
  issueDate: Date;
}

export class BulkIssueItemDto {
  supplyId: string;
  quantity: number;
}

export class BulkIssueHistoryDto {
  items: BulkIssueItemDto[];
  issuedTo: string;
  type: string;
  purpose: string;
  issuedById: string;
  notes?: string;
  issueDate: Date;
}

export class UpdateIssueHistoryDto {
  quantity?: number;
  issuedTo?: string;
  type?: string;
  purpose?: string;
  notes?: string;
  issueDate?: Date;
  updatedById: string;
}

export class GetIssueHistoryQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
}
