-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('Upcoming', 'In_Progress', 'Completed', 'On_Hold');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "ModuleScope" AS ENUM ('SUPERADMIN', 'GROUP', 'ENTITY');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('View', 'Create', 'Edit', 'Delete', 'Approve', 'Export', 'Import');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('Completed', 'Planning', 'In_Progress', 'On_Hold');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('Monthly', 'Annual');

-- CreateEnum
CREATE TYPE "PaymentMadeStatus" AS ENUM ('Pending', 'Cleared');

-- CreateEnum
CREATE TYPE "systemRole" AS ENUM ('superadmin', 'admin', 'user');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('Active', 'Inactive', 'On_Leave');

-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "DeductionStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "StatutoryDeductionType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'TIERED');

-- CreateEnum
CREATE TYPE "OtherDeductionType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('in_use', 'in_storage');

-- CreateEnum
CREATE TYPE "paymentRecordStatus" AS ENUM ('pending', 'cleared');

-- CreateEnum
CREATE TYPE "StoreItemsType" AS ENUM ('product', 'service');

-- CreateEnum
CREATE TYPE "ItemsType" AS ENUM ('goods', 'service');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('draft', 'unpaid', 'partial', 'paid');

-- CreateEnum
CREATE TYPE "vendorStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('draft', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'Card', 'Bank_Transfer', 'Mobile_Money', 'Check', 'Debit_Card', 'Credit_Card', 'ACH', 'Wire_Transfer');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('Completed', 'Void');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('Overdue', 'Paid', 'Draft', 'Sent', 'Partial');

-- CreateEnum
CREATE TYPE "InvoiceActivityType" AS ENUM ('Created', 'Sent', 'Viewed', 'PaymentReceived', 'Overdue', 'Cancelled', 'Updated');

-- CreateEnum
CREATE TYPE "BankAccountStatus" AS ENUM ('active', 'inactive', 'closed');

-- CreateEnum
CREATE TYPE "BankReconciliationStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AccountTransactionType" AS ENUM ('BANK', 'INVOICE_POSTING', 'PAYMENT_RECEIVED_POSTING', 'RECEIPT_POSTING', 'OPENING_BALANCE', 'MANUAL_ENTRY', 'JOURNAL_ENTRY', 'EXPENSE_POSTING', 'BILL_POSTING', 'PAYMENT_MADE_POSTING');

-- CreateEnum
CREATE TYPE "TransactionPostingStatus" AS ENUM ('Pending', 'Processing', 'Success', 'Failed');

-- CreateEnum
CREATE TYPE "JournalPostingStatus" AS ENUM ('Pending', 'Processing', 'Success', 'Failed');

-- CreateEnum
CREATE TYPE "OpeningBalanceStatus" AS ENUM ('Draft', 'Finalized');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('Draft', 'Active');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('Draft', 'Pending', 'Approved', 'Rejected');

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "logo" JSONB NOT NULL,
    "taxId" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "subdomain" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "billingCycle" "BillingCycle",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupCustomization" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "primaryColor" TEXT,
    "logoPublicId" TEXT,
    "logoUrl" TEXT,
    "loginBgPublicId" TEXT,
    "loginBgUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupCustomization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "email" TEXT,
    "legalName" TEXT,
    "companyName" TEXT,
    "phoneNumber" TEXT,
    "postalCode" TEXT,
    "logo" JSONB,
    "state" TEXT,
    "taxId" TEXT,
    "website" TEXT,
    "yearEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledModuleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "department" TEXT,
    "password" TEXT,
    "image" JSONB,
    "provider" TEXT,
    "providerId" TEXT,
    "emailVerified" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requirePasswordChange" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "systemRole" "systemRole" NOT NULL DEFAULT 'user',
    "groupId" TEXT,
    "entityId" TEXT,
    "roleId" TEXT,
    "adminEntities" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "paymentTerms" TEXT NOT NULL,
    "creditLimit" TEXT NOT NULL,
    "note" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentTerms" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "notes" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'Draft',
    "postingStatus" "JournalPostingStatus" NOT NULL DEFAULT 'Pending',
    "journalReference" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT,
    "milestoneId" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceActivity" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "activityType" "InvoiceActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "performedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3),

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMade" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "billId" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "status" "PaymentMadeStatus" NOT NULL DEFAULT 'Pending',
    "postingStatus" "JournalPostingStatus" NOT NULL DEFAULT 'Pending',
    "journalReference" TEXT,
    "postedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorCode" TEXT,

    CONSTRAINT "PaymentMade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "website" TEXT,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "paymentTerms" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "creditLimit" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "routingNumber" TEXT,
    "internalNote" TEXT,
    "status" "vendorStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceived" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "depositTo" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "note" TEXT,
    "postingStatus" "JournalPostingStatus" NOT NULL DEFAULT 'Pending',
    "journalReference" TEXT,
    "postedAt" TIMESTAMP(3),
    "projectId" TEXT,
    "milestoneId" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceived_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expenses" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "vendorId" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentAccountId" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "tax" TEXT NOT NULL,
    "description" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'draft',
    "postingStatus" "JournalPostingStatus" NOT NULL DEFAULT 'Pending',
    "journalReference" TEXT,
    "postedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attachment" JSONB,
    "projectId" TEXT,
    "milestoneId" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bills" (
    "id" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL,
    "billNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "poNumber" TEXT,
    "paymentTerms" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "tax" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "notes" TEXT,
    "attachment" JSONB,
    "accountsPayableId" TEXT NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'draft',
    "postingStatus" "JournalPostingStatus" NOT NULL DEFAULT 'Pending',
    "journalReference" TEXT,
    "postedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "items" JSONB NOT NULL,
    "projectId" TEXT,
    "milestoneId" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "reference" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "status" "paymentRecordStatus" NOT NULL DEFAULT 'cleared',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "depositTo" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'Void',
    "postingStatus" "JournalPostingStatus" NOT NULL DEFAULT 'Pending',
    "journalReference" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL DEFAULT '123456789',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "rate" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "receiptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreItems" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sku" TEXT,
    "unitId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sellingPrice" INTEGER,
    "costPrice" INTEGER,
    "rate" INTEGER,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "currentStock" INTEGER,
    "lowStock" INTEGER,
    "type" "StoreItemsType" NOT NULL DEFAULT 'product',
    "trackInventory" BOOLEAN NOT NULL DEFAULT false,
    "sellOnline" BOOLEAN NOT NULL DEFAULT false,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unitPrice" INTEGER,
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "type" "ItemsType" NOT NULL DEFAULT 'goods',
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incomeAccountId" TEXT NOT NULL,

    CONSTRAINT "Items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "image" JSONB,
    "description" TEXT NOT NULL,
    "visibility" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionStoreItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "storeItemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionStoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "departmentId" TEXT,
    "assignedId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchaseCost" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "trackDepreciation" BOOLEAN NOT NULL DEFAULT false,
    "depreciationMethod" TEXT NOT NULL,
    "years" INTEGER NOT NULL,
    "salvageValue" INTEGER NOT NULL,
    "activeAsset" BOOLEAN NOT NULL DEFAULT false,
    "status" "AssetStatus" NOT NULL DEFAULT 'in_use',
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSubCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "linkedType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'In_Progress',
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "billingType" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "budgetedRevenue" INTEGER NOT NULL,
    "budgetedCost" INTEGER NOT NULL,
    "managerId" TEXT NOT NULL,
    "projectCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "actualAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'Upcoming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "monthlyRate" INTEGER NOT NULL,
    "estimatedMonths" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "lines" JSONB NOT NULL,
    "reference" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "status" "JournalStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "periodType" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "note" TEXT,
    "accountId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "departmentId" TEXT,
    "position" TEXT NOT NULL,
    "profileImage" JSONB,
    "employmentType" TEXT NOT NULL,
    "dateOfHire" TIMESTAMP(3) NOT NULL,
    "reportingManager" TEXT NOT NULL,
    "anualLeave" INTEGER NOT NULL,
    "salary" INTEGER NOT NULL,
    "allowances" INTEGER NOT NULL,
    "perFrequency" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "acountType" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "routingNumber" TEXT NOT NULL,
    "addressInfo" JSONB,
    "emergencyContact" JSONB,
    "note" TEXT,
    "asdraft" BOOLEAN NOT NULL DEFAULT false,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'Active',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'active',
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "status" "DeductionStatus" NOT NULL DEFAULT 'active',
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "DeductionStatus" NOT NULL DEFAULT 'active',
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "DeductionStatus" NOT NULL DEFAULT 'active',
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatutoryDeduction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StatutoryDeductionType" NOT NULL,
    "rate" DOUBLE PRECISION,
    "fixedAmount" DOUBLE PRECISION,
    "minAmount" DOUBLE PRECISION,
    "description" TEXT,
    "accountId" TEXT,
    "status" "DeductionStatus" NOT NULL DEFAULT 'active',
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatutoryDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxTier" (
    "id" TEXT NOT NULL,
    "statutoryDeductionId" TEXT NOT NULL,
    "from" DOUBLE PRECISION NOT NULL,
    "to" DOUBLE PRECISION,
    "rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TaxTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtherDeduction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OtherDeductionType" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "status" "DeductionStatus" NOT NULL DEFAULT 'active',
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtherDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollBatch" (
    "id" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'Draft',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statutoryDed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossPay" DOUBLE PRECISION NOT NULL,
    "netPay" DOUBLE PRECISION NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT,
    "multiCurrency" BOOLEAN NOT NULL DEFAULT false,
    "taxCalculation" BOOLEAN NOT NULL DEFAULT false,
    "dateFormat" TIMESTAMP(3),
    "numberFormat" TEXT,
    "invoicePrefix" TEXT,
    "paymentTerm" TEXT,
    "lateFees" BOOLEAN NOT NULL DEFAULT false,
    "paymentReminders" BOOLEAN NOT NULL DEFAULT false,
    "taxRate" INTEGER,
    "billPrefix" TEXT,
    "purchaseOrderPrefix" TEXT,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "approvedThreshold" INTEGER,
    "match" BOOLEAN NOT NULL DEFAULT false,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "notes" TEXT,
    "asdraft" BOOLEAN NOT NULL DEFAULT false,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attendanceLogId" TEXT NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'Pending',
    "contact" TEXT NOT NULL,
    "emergencyContact" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "menu" TEXT NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "moduleSortOrder" INTEGER NOT NULL DEFAULT 0,
    "menuSortOrder" INTEGER NOT NULL DEFAULT 0,
    "scope" "ModuleScope" NOT NULL DEFAULT 'ENTITY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL,
    "actionName" "PermissionAction" NOT NULL,
    "moduleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupId" TEXT,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "scope" "RoleScope" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExplicitPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExplicitPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionModule" (
    "id" TEXT NOT NULL,
    "subscriptionTierId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "subscriptionTierId" TEXT NOT NULL,
    "tierName" TEXT NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "maxEntities" INTEGER NOT NULL,
    "maxTransactionsMonth" INTEGER,
    "maxStorageGB" INTEGER,
    "maxApiRatePerHour" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billingStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billingEndDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usedUsers" INTEGER NOT NULL DEFAULT 0,
    "usedEntities" INTEGER NOT NULL DEFAULT 0,
    "usedTransactionsMonth" INTEGER DEFAULT 0,
    "usedStorageGB" DOUBLE PRECISION DEFAULT 0,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" INTEGER,
    "yearlyPrice" INTEGER,
    "maxUsers" INTEGER,
    "maxEntities" INTEGER,
    "maxTransactionsMonth" INTEGER,
    "maxStorageGB" INTEGER,
    "maxApiRatePerHour" INTEGER,
    "apiAccess" BOOLEAN,
    "webhooks" BOOLEAN,
    "sso" BOOLEAN,
    "customBranding" BOOLEAN,
    "prioritySupport" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "previousTierId" TEXT,
    "previousTierName" TEXT,
    "newTierId" TEXT NOT NULL,
    "newTierName" TEXT NOT NULL,
    "changeReason" TEXT NOT NULL,
    "changedByUserId" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscriptionTierId" TEXT,
    "subscriptionId" TEXT,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionSettings" (
    "id" TEXT NOT NULL,
    "trialPeriodEnabled" BOOLEAN NOT NULL DEFAULT true,
    "trialDurationDays" INTEGER NOT NULL DEFAULT 14,
    "autoRenewalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "proratePayments" BOOLEAN NOT NULL DEFAULT true,
    "paymentReminders" BOOLEAN NOT NULL DEFAULT true,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "groupId" TEXT,
    "entityId" TEXT,
    "module" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedGroupId" TEXT,
    "impersonatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyIssueHistory" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "issuedTo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "updatedById" TEXT,
    "notes" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "projectId" TEXT,
    "departmentId" TEXT,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplyIssueHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyRestockHistory" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT NOT NULL,
    "restockedById" TEXT NOT NULL,
    "notes" TEXT,
    "restockDate" TIMESTAMP(3) NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplyRestockHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSupply" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "location" TEXT,
    "supplier" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreSupply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "routingNumber" TEXT,
    "status" "BankAccountStatus" NOT NULL DEFAULT 'active',
    "linkedAccountId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "type" "AccountTransactionType" NOT NULL,
    "status" "TransactionPostingStatus" NOT NULL DEFAULT 'Pending',
    "accountId" TEXT NOT NULL,
    "debitAmount" INTEGER NOT NULL DEFAULT 0,
    "creditAmount" INTEGER NOT NULL DEFAULT 0,
    "runningBalance" INTEGER,
    "payee" TEXT,
    "method" TEXT,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "relatedEntityId" TEXT,
    "relatedEntityType" TEXT,
    "metadata" JSONB,
    "clearedInReconciliationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "statementEndDate" TIMESTAMP(3) NOT NULL,
    "statementEndingBalance" DOUBLE PRECISION NOT NULL,
    "status" "BankReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatementTransaction" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankStatementTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliationMatch" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "statementTransactionId" TEXT NOT NULL,
    "bookTransactionId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankReconciliationMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningBalance" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "fiscalYear" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "totalCredit" INTEGER NOT NULL DEFAULT 0,
    "totalDebit" INTEGER NOT NULL DEFAULT 0,
    "difference" INTEGER NOT NULL DEFAULT 0,
    "status" "OpeningBalanceStatus" NOT NULL DEFAULT 'Draft',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpeningBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningBalanceItem" (
    "id" TEXT NOT NULL,
    "openingBalanceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpeningBalanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Group_subdomain_key" ON "Group"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCustomization_groupId_key" ON "GroupCustomization"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_name_key" ON "Entity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_email_key" ON "Entity"("email");

-- CreateIndex
CREATE INDEX "Entity_name_taxId_email_idx" ON "Entity"("name", "taxId", "email");

-- CreateIndex
CREATE INDEX "Entity_groupId_idx" ON "Entity"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_groupId_isActive_idx" ON "User"("email", "groupId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_providerId_key" ON "User"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_email_name_idx" ON "Customer"("email", "name");

-- CreateIndex
CREATE INDEX "Customer_groupId_idx" ON "Customer"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_customerId_currency_idx" ON "Invoice"("invoiceNumber", "customerId", "currency");

-- CreateIndex
CREATE INDEX "Invoice_projectId_idx" ON "Invoice"("projectId");

-- CreateIndex
CREATE INDEX "Invoice_milestoneId_idx" ON "Invoice"("milestoneId");

-- CreateIndex
CREATE INDEX "Invoice_groupId_idx" ON "Invoice"("groupId");

-- CreateIndex
CREATE INDEX "InvoiceActivity_invoiceId_createdAt_idx" ON "InvoiceActivity"("invoiceId", "createdAt");

-- CreateIndex
CREATE INDEX "InvoiceActivity_invoiceId_idx" ON "InvoiceActivity"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceActivity_groupId_idx" ON "InvoiceActivity"("groupId");

-- CreateIndex
CREATE INDEX "InvoiceItem_itemId_idx" ON "InvoiceItem"("itemId");

-- CreateIndex
CREATE INDEX "PaymentMade_entityId_idx" ON "PaymentMade"("entityId");

-- CreateIndex
CREATE INDEX "PaymentMade_billId_idx" ON "PaymentMade"("billId");

-- CreateIndex
CREATE INDEX "PaymentMade_groupId_idx" ON "PaymentMade"("groupId");

-- CreateIndex
CREATE INDEX "vendor_email_entityId_idx" ON "vendor"("email", "entityId");

-- CreateIndex
CREATE INDEX "vendor_type_email_idx" ON "vendor"("type", "email");

-- CreateIndex
CREATE INDEX "vendor_groupId_idx" ON "vendor"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_email_phone_key" ON "vendor"("email", "phone");

-- CreateIndex
CREATE INDEX "PaymentReceived_invoiceId_idx" ON "PaymentReceived"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentReceived_paymentNumber_idx" ON "PaymentReceived"("paymentNumber");

-- CreateIndex
CREATE INDEX "PaymentReceived_groupId_idx" ON "PaymentReceived"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceived_paymentNumber_entityId_key" ON "PaymentReceived"("paymentNumber", "entityId");

-- CreateIndex
CREATE INDEX "Expenses_reference_paymentAccountId_idx" ON "Expenses"("reference", "paymentAccountId");

-- CreateIndex
CREATE INDEX "Expenses_reference_expenseAccountId_idx" ON "Expenses"("reference", "expenseAccountId");

-- CreateIndex
CREATE INDEX "Expenses_projectId_idx" ON "Expenses"("projectId");

-- CreateIndex
CREATE INDEX "Expenses_milestoneId_idx" ON "Expenses"("milestoneId");

-- CreateIndex
CREATE INDEX "Expenses_groupId_idx" ON "Expenses"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Bills_billNumber_key" ON "Bills"("billNumber");

-- CreateIndex
CREATE INDEX "Bills_projectId_idx" ON "Bills"("projectId");

-- CreateIndex
CREATE INDEX "Bills_milestoneId_idx" ON "Bills"("milestoneId");

-- CreateIndex
CREATE INDEX "Bills_groupId_idx" ON "Bills"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Bills_entityId_billNumber_key" ON "Bills"("entityId", "billNumber");

-- CreateIndex
CREATE INDEX "PaymentRecord_billId_idx" ON "PaymentRecord"("billId");

-- CreateIndex
CREATE INDEX "Receipt_date_idx" ON "Receipt"("date");

-- CreateIndex
CREATE INDEX "Receipt_receiptNumber_idx" ON "Receipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "Receipt_groupId_idx" ON "Receipt"("groupId");

-- CreateIndex
CREATE INDEX "ReceiptItem_receiptId_idx" ON "ReceiptItem"("receiptId");

-- CreateIndex
CREATE INDEX "ReceiptItem_itemId_idx" ON "ReceiptItem"("itemId");

-- CreateIndex
CREATE INDEX "StoreItems_entityId_type_idx" ON "StoreItems"("entityId", "type");

-- CreateIndex
CREATE INDEX "StoreItems_groupId_idx" ON "StoreItems"("groupId");

-- CreateIndex
CREATE INDEX "InventoryMovement_itemId_idx" ON "InventoryMovement"("itemId");

-- CreateIndex
CREATE INDEX "InventoryMovement_entityId_idx" ON "InventoryMovement"("entityId");

-- CreateIndex
CREATE INDEX "InventoryMovement_groupId_idx" ON "InventoryMovement"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Items_code_key" ON "Items"("code");

-- CreateIndex
CREATE INDEX "Items_entityId_type_idx" ON "Items"("entityId", "type");

-- CreateIndex
CREATE INDEX "Items_groupId_idx" ON "Items"("groupId");

-- CreateIndex
CREATE INDEX "Collection_entityId_idx" ON "Collection"("entityId");

-- CreateIndex
CREATE INDEX "Collection_groupId_idx" ON "Collection"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_entityId_key" ON "Collection"("slug", "entityId");

-- CreateIndex
CREATE INDEX "CollectionStoreItem_collectionId_idx" ON "CollectionStoreItem"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionStoreItem_storeItemId_idx" ON "CollectionStoreItem"("storeItemId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionStoreItem_collectionId_storeItemId_key" ON "CollectionStoreItem"("collectionId", "storeItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_serialNumber_key" ON "Asset"("serialNumber");

-- CreateIndex
CREATE INDEX "Asset_id_entityId_idx" ON "Asset"("id", "entityId");

-- CreateIndex
CREATE INDEX "Asset_groupId_idx" ON "Asset"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountType_code_key" ON "AccountType"("code");

-- CreateIndex
CREATE INDEX "AccountCategory_groupId_typeId_idx" ON "AccountCategory"("groupId", "typeId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountCategory_code_groupId_key" ON "AccountCategory"("code", "groupId");

-- CreateIndex
CREATE INDEX "AccountSubCategory_categoryId_idx" ON "AccountSubCategory"("categoryId");

-- CreateIndex
CREATE INDEX "AccountSubCategory_groupId_idx" ON "AccountSubCategory"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountSubCategory_code_categoryId_key" ON "AccountSubCategory"("code", "categoryId");

-- CreateIndex
CREATE INDEX "Account_id_entityId_idx" ON "Account"("id", "entityId");

-- CreateIndex
CREATE INDEX "Account_subCategoryId_idx" ON "Account"("subCategoryId");

-- CreateIndex
CREATE INDEX "Account_groupId_idx" ON "Account"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_entityId_code_key" ON "Account"("entityId", "code");

-- CreateIndex
CREATE INDEX "Project_entityId_id_idx" ON "Project"("entityId", "id");

-- CreateIndex
CREATE INDEX "Project_groupId_idx" ON "Project"("groupId");

-- CreateIndex
CREATE INDEX "Milestone_entityId_projectId_idx" ON "Milestone"("entityId", "projectId");

-- CreateIndex
CREATE INDEX "Milestone_groupId_idx" ON "Milestone"("groupId");

-- CreateIndex
CREATE INDEX "TeamMember_groupId_idx" ON "TeamMember"("groupId");

-- CreateIndex
CREATE INDEX "Journal_id_entityId_idx" ON "Journal"("id", "entityId");

-- CreateIndex
CREATE INDEX "Journal_groupId_idx" ON "Journal"("groupId");

-- CreateIndex
CREATE INDEX "Budget_entityId_idx" ON "Budget"("entityId");

-- CreateIndex
CREATE INDEX "Budget_groupId_idx" ON "Budget"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE INDEX "Employee_employeeId_email_entityId_idx" ON "Employee"("employeeId", "email", "entityId");

-- CreateIndex
CREATE INDEX "Employee_groupId_idx" ON "Employee"("groupId");

-- CreateIndex
CREATE INDEX "Department_groupId_idx" ON "Department"("groupId");

-- CreateIndex
CREATE INDEX "Department_entityId_idx" ON "Department"("entityId");

-- CreateIndex
CREATE INDEX "ProductCategory_groupId_idx" ON "ProductCategory"("groupId");

-- CreateIndex
CREATE INDEX "ProductCategory_entityId_idx" ON "ProductCategory"("entityId");

-- CreateIndex
CREATE INDEX "ProductUnit_groupId_idx" ON "ProductUnit"("groupId");

-- CreateIndex
CREATE INDEX "ProductUnit_entityId_idx" ON "ProductUnit"("entityId");

-- CreateIndex
CREATE INDEX "ProductBrand_groupId_idx" ON "ProductBrand"("groupId");

-- CreateIndex
CREATE INDEX "ProductBrand_entityId_idx" ON "ProductBrand"("entityId");

-- CreateIndex
CREATE INDEX "StatutoryDeduction_groupId_idx" ON "StatutoryDeduction"("groupId");

-- CreateIndex
CREATE INDEX "StatutoryDeduction_entityId_idx" ON "StatutoryDeduction"("entityId");

-- CreateIndex
CREATE INDEX "TaxTier_statutoryDeductionId_idx" ON "TaxTier"("statutoryDeductionId");

-- CreateIndex
CREATE INDEX "OtherDeduction_groupId_idx" ON "OtherDeduction"("groupId");

-- CreateIndex
CREATE INDEX "OtherDeduction_entityId_idx" ON "OtherDeduction"("entityId");

-- CreateIndex
CREATE INDEX "PayrollBatch_entityId_idx" ON "PayrollBatch"("entityId");

-- CreateIndex
CREATE INDEX "PayrollBatch_groupId_idx" ON "PayrollBatch"("groupId");

-- CreateIndex
CREATE INDEX "PayrollBatch_status_idx" ON "PayrollBatch"("status");

-- CreateIndex
CREATE INDEX "PayrollRecord_batchId_idx" ON "PayrollRecord"("batchId");

-- CreateIndex
CREATE INDEX "PayrollRecord_employeeId_idx" ON "PayrollRecord"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollRecord_entityId_idx" ON "PayrollRecord"("entityId");

-- CreateIndex
CREATE INDEX "PayrollRecord_groupId_idx" ON "PayrollRecord"("groupId");

-- CreateIndex
CREATE INDEX "Settings_entityId_idx" ON "Settings"("entityId");

-- CreateIndex
CREATE INDEX "Settings_groupId_idx" ON "Settings"("groupId");

-- CreateIndex
CREATE INDEX "AttendanceLog_date_entityId_idx" ON "AttendanceLog"("date", "entityId");

-- CreateIndex
CREATE INDEX "AttendanceLog_groupId_idx" ON "AttendanceLog"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceLog_date_entityId_key" ON "AttendanceLog"("date", "entityId");

-- CreateIndex
CREATE INDEX "Attendance_employeeId_entityId_idx" ON "Attendance"("employeeId", "entityId");

-- CreateIndex
CREATE INDEX "Attendance_attendanceLogId_idx" ON "Attendance"("attendanceLogId");

-- CreateIndex
CREATE INDEX "Attendance_groupId_idx" ON "Attendance"("groupId");

-- CreateIndex
CREATE INDEX "Leave_employeeId_status_idx" ON "Leave"("employeeId", "status");

-- CreateIndex
CREATE INDEX "Leave_groupId_idx" ON "Leave"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_moduleKey_scope_key" ON "Module"("moduleKey", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "Action_moduleId_actionName_key" ON "Action"("moduleId", "actionName");

-- CreateIndex
CREATE UNIQUE INDEX "Role_groupId_name_scope_key" ON "Role"("groupId", "name", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "ExplicitPermission_groupId_idx" ON "ExplicitPermission"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ExplicitPermission_userId_permissionId_entityId_key" ON "ExplicitPermission"("userId", "permissionId", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionModule_subscriptionTierId_moduleId_key" ON "SubscriptionModule"("subscriptionTierId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_groupId_key" ON "Subscription"("groupId");

-- CreateIndex
CREATE INDEX "Subscription_groupId_isActive_idx" ON "Subscription"("groupId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionTier_name_key" ON "SubscriptionTier"("name");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_groupId_createdAt_idx" ON "SubscriptionHistory"("groupId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionSettings_id_key" ON "SubscriptionSettings"("id");

-- CreateIndex
CREATE INDEX "AuditLog_groupId_createdAt_idx" ON "AuditLog"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_groupId_entityId_createdAt_idx" ON "AuditLog"("groupId", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_module_action_createdAt_idx" ON "AuditLog"("module", "action", "createdAt");

-- CreateIndex
CREATE INDEX "SupplyIssueHistory_entityId_idx" ON "SupplyIssueHistory"("entityId");

-- CreateIndex
CREATE INDEX "SupplyIssueHistory_supplyId_idx" ON "SupplyIssueHistory"("supplyId");

-- CreateIndex
CREATE INDEX "SupplyIssueHistory_groupId_idx" ON "SupplyIssueHistory"("groupId");

-- CreateIndex
CREATE INDEX "SupplyIssueHistory_projectId_idx" ON "SupplyIssueHistory"("projectId");

-- CreateIndex
CREATE INDEX "SupplyRestockHistory_entityId_idx" ON "SupplyRestockHistory"("entityId");

-- CreateIndex
CREATE INDEX "SupplyRestockHistory_supplyId_idx" ON "SupplyRestockHistory"("supplyId");

-- CreateIndex
CREATE INDEX "SupplyRestockHistory_groupId_idx" ON "SupplyRestockHistory"("groupId");

-- CreateIndex
CREATE INDEX "StoreSupply_entityId_idx" ON "StoreSupply"("entityId");

-- CreateIndex
CREATE INDEX "StoreSupply_groupId_idx" ON "StoreSupply"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_linkedAccountId_key" ON "BankAccount"("linkedAccountId");

-- CreateIndex
CREATE INDEX "BankAccount_entityId_linkedAccountId_idx" ON "BankAccount"("entityId", "linkedAccountId");

-- CreateIndex
CREATE INDEX "BankAccount_accountNumber_idx" ON "BankAccount"("accountNumber");

-- CreateIndex
CREATE INDEX "BankAccount_groupId_idx" ON "BankAccount"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_entityId_accountNumber_key" ON "BankAccount"("entityId", "accountNumber");

-- CreateIndex
CREATE INDEX "AccountTransaction_entityId_accountId_date_idx" ON "AccountTransaction"("entityId", "accountId", "date");

-- CreateIndex
CREATE INDEX "AccountTransaction_date_type_idx" ON "AccountTransaction"("date", "type");

-- CreateIndex
CREATE INDEX "AccountTransaction_accountId_date_idx" ON "AccountTransaction"("accountId", "date");

-- CreateIndex
CREATE INDEX "AccountTransaction_relatedEntityId_relatedEntityType_idx" ON "AccountTransaction"("relatedEntityId", "relatedEntityType");

-- CreateIndex
CREATE INDEX "AccountTransaction_groupId_idx" ON "AccountTransaction"("groupId");

-- CreateIndex
CREATE INDEX "AccountTransaction_clearedInReconciliationId_idx" ON "AccountTransaction"("clearedInReconciliationId");

-- CreateIndex
CREATE INDEX "BankReconciliation_entityId_idx" ON "BankReconciliation"("entityId");

-- CreateIndex
CREATE INDEX "BankReconciliation_bankAccountId_idx" ON "BankReconciliation"("bankAccountId");

-- CreateIndex
CREATE INDEX "BankReconciliation_groupId_idx" ON "BankReconciliation"("groupId");

-- CreateIndex
CREATE INDEX "BankReconciliation_status_idx" ON "BankReconciliation"("status");

-- CreateIndex
CREATE INDEX "BankStatementTransaction_reconciliationId_idx" ON "BankStatementTransaction"("reconciliationId");

-- CreateIndex
CREATE INDEX "BankStatementTransaction_entityId_idx" ON "BankStatementTransaction"("entityId");

-- CreateIndex
CREATE INDEX "BankStatementTransaction_groupId_idx" ON "BankStatementTransaction"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliationMatch_statementTransactionId_key" ON "BankReconciliationMatch"("statementTransactionId");

-- CreateIndex
CREATE INDEX "BankReconciliationMatch_reconciliationId_idx" ON "BankReconciliationMatch"("reconciliationId");

-- CreateIndex
CREATE INDEX "BankReconciliationMatch_bookTransactionId_idx" ON "BankReconciliationMatch"("bookTransactionId");

-- CreateIndex
CREATE INDEX "BankReconciliationMatch_entityId_idx" ON "BankReconciliationMatch"("entityId");

-- CreateIndex
CREATE INDEX "BankReconciliationMatch_groupId_idx" ON "BankReconciliationMatch"("groupId");

-- CreateIndex
CREATE INDEX "OpeningBalance_entityId_date_idx" ON "OpeningBalance"("entityId", "date");

-- CreateIndex
CREATE INDEX "OpeningBalance_groupId_idx" ON "OpeningBalance"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningBalance_entityId_fiscalYear_key" ON "OpeningBalance"("entityId", "fiscalYear");

-- CreateIndex
CREATE INDEX "OpeningBalanceItem_openingBalanceId_idx" ON "OpeningBalanceItem"("openingBalanceId");

-- CreateIndex
CREATE INDEX "OpeningBalanceItem_accountId_idx" ON "OpeningBalanceItem"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningBalanceItem_openingBalanceId_accountId_key" ON "OpeningBalanceItem"("openingBalanceId", "accountId");

-- AddForeignKey
ALTER TABLE "GroupCustomization" ADD CONSTRAINT "GroupCustomization_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceActivity" ADD CONSTRAINT "InvoiceActivity_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceActivity" ADD CONSTRAINT "InvoiceActivity_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMade" ADD CONSTRAINT "PaymentMade_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMade" ADD CONSTRAINT "PaymentMade_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMade" ADD CONSTRAINT "PaymentMade_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMade" ADD CONSTRAINT "PaymentMade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceived" ADD CONSTRAINT "PaymentReceived_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceived" ADD CONSTRAINT "PaymentReceived_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceived" ADD CONSTRAINT "PaymentReceived_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceived" ADD CONSTRAINT "PaymentReceived_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceived" ADD CONSTRAINT "PaymentReceived_depositTo_fkey" FOREIGN KEY ("depositTo") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_accountsPayableId_fkey" FOREIGN KEY ("accountsPayableId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_depositTo_fkey" FOREIGN KEY ("depositTo") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreItems" ADD CONSTRAINT "StoreItems_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreItems" ADD CONSTRAINT "StoreItems_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProductUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreItems" ADD CONSTRAINT "StoreItems_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StoreItems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Items" ADD CONSTRAINT "Items_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Items" ADD CONSTRAINT "Items_incomeAccountId_fkey" FOREIGN KEY ("incomeAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionStoreItem" ADD CONSTRAINT "CollectionStoreItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionStoreItem" ADD CONSTRAINT "CollectionStoreItem_storeItemId_fkey" FOREIGN KEY ("storeItemId") REFERENCES "StoreItems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assignedId_fkey" FOREIGN KEY ("assignedId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountCategory" ADD CONSTRAINT "AccountCategory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountCategory" ADD CONSTRAINT "AccountCategory_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "AccountType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSubCategory" ADD CONSTRAINT "AccountSubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AccountCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "AccountSubCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUnit" ADD CONSTRAINT "ProductUnit_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBrand" ADD CONSTRAINT "ProductBrand_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatutoryDeduction" ADD CONSTRAINT "StatutoryDeduction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatutoryDeduction" ADD CONSTRAINT "StatutoryDeduction_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxTier" ADD CONSTRAINT "TaxTier_statutoryDeductionId_fkey" FOREIGN KEY ("statutoryDeductionId") REFERENCES "StatutoryDeduction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtherDeduction" ADD CONSTRAINT "OtherDeduction_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollBatch" ADD CONSTRAINT "PayrollBatch_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollBatch" ADD CONSTRAINT "PayrollBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollBatch" ADD CONSTRAINT "PayrollBatch_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PayrollBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_attendanceLogId_fkey" FOREIGN KEY ("attendanceLogId") REFERENCES "AttendanceLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplicitPermission" ADD CONSTRAINT "ExplicitPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplicitPermission" ADD CONSTRAINT "ExplicitPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplicitPermission" ADD CONSTRAINT "ExplicitPermission_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionModule" ADD CONSTRAINT "SubscriptionModule_subscriptionTierId_fkey" FOREIGN KEY ("subscriptionTierId") REFERENCES "SubscriptionTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionModule" ADD CONSTRAINT "SubscriptionModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subscriptionTierId_fkey" FOREIGN KEY ("subscriptionTierId") REFERENCES "SubscriptionTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_previousTierId_fkey" FOREIGN KEY ("previousTierId") REFERENCES "SubscriptionTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_newTierId_fkey" FOREIGN KEY ("newTierId") REFERENCES "SubscriptionTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_subscriptionTierId_fkey" FOREIGN KEY ("subscriptionTierId") REFERENCES "SubscriptionTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyIssueHistory" ADD CONSTRAINT "SupplyIssueHistory_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "StoreSupply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyIssueHistory" ADD CONSTRAINT "SupplyIssueHistory_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyIssueHistory" ADD CONSTRAINT "SupplyIssueHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyIssueHistory" ADD CONSTRAINT "SupplyIssueHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyIssueHistory" ADD CONSTRAINT "SupplyIssueHistory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyIssueHistory" ADD CONSTRAINT "SupplyIssueHistory_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyIssueHistory" ADD CONSTRAINT "SupplyIssueHistory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyRestockHistory" ADD CONSTRAINT "SupplyRestockHistory_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "StoreSupply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyRestockHistory" ADD CONSTRAINT "SupplyRestockHistory_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyRestockHistory" ADD CONSTRAINT "SupplyRestockHistory_restockedById_fkey" FOREIGN KEY ("restockedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSupply" ADD CONSTRAINT "StoreSupply_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_linkedAccountId_fkey" FOREIGN KEY ("linkedAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementTransaction" ADD CONSTRAINT "BankStatementTransaction_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "BankReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationMatch" ADD CONSTRAINT "BankReconciliationMatch_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "BankReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationMatch" ADD CONSTRAINT "BankReconciliationMatch_statementTransactionId_fkey" FOREIGN KEY ("statementTransactionId") REFERENCES "BankStatementTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalance" ADD CONSTRAINT "OpeningBalance_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceItem" ADD CONSTRAINT "OpeningBalanceItem_openingBalanceId_fkey" FOREIGN KEY ("openingBalanceId") REFERENCES "OpeningBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceItem" ADD CONSTRAINT "OpeningBalanceItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

