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

-- CreateIndex
CREATE UNIQUE INDEX "GroupCustomization_groupId_key" ON "GroupCustomization"("groupId");

-- AddForeignKey
ALTER TABLE "GroupCustomization" ADD CONSTRAINT "GroupCustomization_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data: insert groupCustomization module + actions if not already present
DO $$
DECLARE
  mod_id TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Module"
    WHERE "moduleKey" = 'groupCustomization' AND "scope" = 'GROUP'::"ModuleScope"
  ) THEN
    INSERT INTO "Module" (
      "id", "moduleKey", "displayName", "description",
      "menu", "isOptional", "moduleSortOrder", "menuSortOrder",
      "scope", "createdAt", "updatedAt"
    ) VALUES (
      'cm_grpcust_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 18),
      'groupCustomization',
      'Customization',
      'Group branding and theme customization',
      'Admin',
      false,
      5,
      5,
      'GROUP'::"ModuleScope",
      NOW(),
      NOW()
    )
    RETURNING "id" INTO mod_id;

    INSERT INTO "Action" ("id", "actionName", "moduleId", "createdAt")
    VALUES
      ('cm_actv_' || substr(replace(gen_random_uuid()::text,'-',''),1,16), 'View'::"PermissionAction",   mod_id, NOW()),
      ('cm_actc_' || substr(replace(gen_random_uuid()::text,'-',''),1,16), 'Create'::"PermissionAction", mod_id, NOW()),
      ('cm_acte_' || substr(replace(gen_random_uuid()::text,'-',''),1,16), 'Edit'::"PermissionAction",   mod_id, NOW()),
      ('cm_actd_' || substr(replace(gen_random_uuid()::text,'-',''),1,16), 'Delete'::"PermissionAction", mod_id, NOW()),
      ('cm_acta_' || substr(replace(gen_random_uuid()::text,'-',''),1,16), 'Approve'::"PermissionAction",mod_id, NOW()),
      ('cm_actx_' || substr(replace(gen_random_uuid()::text,'-',''),1,16), 'Export'::"PermissionAction", mod_id, NOW()),
      ('cm_acti_' || substr(replace(gen_random_uuid()::text,'-',''),1,16), 'Import'::"PermissionAction", mod_id, NOW());
  END IF;
END $$;
