import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ModuleScope, RoleScope, systemRole } from 'prisma/generated/enums';
import { EmailService } from '@/email/email.service';
import * as path from 'path';
import { seedDefaultChartOfAccounts } from '../../seeders/seed-account-chart';
import { seedDefaultEntityAccounts } from '../../seeders/seed-entity-accounts';
import { ItemsType, InvoiceActivityType } from 'prisma/generated/enums';
import { BadRequestException } from '@nestjs/common';
import { OpeningBalanceService } from '@/accounts/opening-balance/opening-balance.service';
import { generateJournalReference } from '@/auth/utils/helper';
import { CacheService } from '@/cache/cache.service';

@Processor('default')
@Injectable()
export class BullmqProcessor extends WorkerHost {
  private readonly logger = new Logger(BullmqProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly openingBalanceService: OpeningBalanceService,
    private cacheService: CacheService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.debug(`[Job ${job.id}] Starting job: ${job.name}`);
    if (job.name === 'create-group-user') {
      return this.handleCreateGroupDefaults(job);
    } else if (job.name === 'create-entity-user') {
      return this.handleCreateEntityUser(job);
    } else if (job.name === 'send-user-welcome-email') {
      return this.handleSendUserWelcomeEmail(job);
    } else if (job.name === 'post-invoice-journal') {
      return this.handleInvoiceJournalPosting(job);
    } else if (job.name === 'post-payment-journal') {
      return this.handlePaymentReceivedPosting(job);
    } else if (job.name === 'post-receipt-journal') {
      return this.handleReceiptJournalPosting(job);
    } else if (job.name === 'post-bill-journal') {
      return this.handleBillJournalPosting(job);
    } else if (job.name === 'post-expense-journal') {
      return this.handleExpenseJournalPosting(job);
    } else if (job.name === 'post-payment-made-journal') {
      return this.handlePaymentMadeJournalPosting(job);
    } else if (job.name === 'post-opening-balance-journal') {
      return this.handleOpeningBalanceJournalPosting(job);
    } else if (job.name === 'post-manual-journal') {
      return this.handleManualJournalPosting(job);
    } else if (job.name === 'assign-tier-modules') {
      return this.handleAssignTierModules(job);
    } else if (job.name === 'mark-attendance-batch') {
      return this.handleMarkAttendanceBatch(job);
    } else {
      this.logger.warn(`[Job ${job.id}] Unknown job type: ${job.name}`);
    }
  }

  async handleMarkAttendanceBatch(job: Job) {
    const { date, attendances, entityId, groupId } = job.data as {
      date: string;
      attendances: Array<{
        employeeId: string;
        status: string;
        checkInTime?: string;
        checkOutTime?: string;
        note?: string;
      }>;
      entityId: string;
      groupId: string;
      isDraft?: boolean;
    };
    this.logger.debug(
      `[Job ${job.id}] Marking attendance for ${attendances.length} employees on ${date}`,
    );

    const toDate = (s?: string) => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    try {
      // Step 1: upsert the daily log (outside any transaction)
      const attendanceLog = await this.prisma.attendanceLog.upsert({
        where: { date_entityId: { date: new Date(date), entityId } },
        create: {
          date: new Date(date),
          entityId,
          groupId,
          status: 'Submitted',
        },
        update: { status: 'Submitted' },
      });

      // Step 2: fetch all existing attendance for this log in one query
      const existing = await this.prisma.attendance.findMany({
        where: {
          attendanceLogId: attendanceLog.id,
          employeeId: { in: attendances.map((a) => a.employeeId) },
        },
        select: { id: true, employeeId: true },
      });
      const existingMap = new Map(existing.map((r) => [r.employeeId, r.id]));

      // Step 3: parallel writes — no transaction needed (idempotent on retry)
      await Promise.all(
        attendances.map((record) => {
          const checkInTime = toDate(record.checkInTime);
          const checkOutTime = toDate(record.checkOutTime);
          const existingId = existingMap.get(record.employeeId);

          if (existingId) {
            return this.prisma.attendance.update({
              where: { id: existingId },
              data: {
                status: record.status,
                checkInTime,
                checkOutTime,
                notes: record.note,
              },
            });
          }
          return this.prisma.attendance.create({
            data: {
              employeeId: record.employeeId,
              status: record.status,
              checkInTime,
              checkOutTime,
              notes: record.note,
              entityId,
              groupId,
              attendanceLogId: attendanceLog.id,
            },
          });
        }),
      );

      this.logger.debug(`[Job ${job.id}] Attendance marked successfully`);
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Failed to mark attendance: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async handleCreateGroupDefaults(job: Job) {
    const { groupId, email, groupName, groupSlug } = job.data as {
      groupId: string;
      email: string;
      groupName?: string;
      groupSlug?: string;
    };

    this.logger.log(
      `[Job ${job.id}] Running create-group-user for groupId: ${groupId}, email: ${email}`,
    );

    try {
      // 1. Fetch or create 'admin' role for this group (cloned from template)
      let adminRole = await this.prisma.role.findFirst({
        where: {
          groupId,
          name: 'administrator',
          scope: RoleScope.ADMIN,
        },
      });

      if (!adminRole) {
        // Fetch template admin role with all permissions pre-loaded
        const templateAdminRole = await this.prisma.role.findFirst({
          where: {
            name: 'administrator',
            isSystemRole: true,
            groupId: null, // Global template (no group assigned)
            scope: RoleScope.ADMIN,
          },
          include: {
            rolePermissions: true,
          },
        });

        if (!templateAdminRole) {
          throw new Error(
            'Admin role template not found. Run: ts-node seeders/seed-admin-role-template.ts',
          );
        }

        this.logger.debug(
          `[Job ${job.id}] Fetched template admin role with ${templateAdminRole.rolePermissions.length} permissions`,
        );

        // Clone template to new group with all pre-loaded permissions
        adminRole = await this.prisma.role.create({
          data: {
            name: 'administrator',
            groupId,
            isSystemRole: true,

            scope: RoleScope.ADMIN,
            description: 'Group administrator role (cloned from template)',
            rolePermissions: {
              create: templateAdminRole.rolePermissions.map((rp) => ({
                permissionId: rp.permissionId,
              })),
            },
          },
        });

        this.logger.debug(
          `[Job ${job.id}] Created admin role for group with id: ${adminRole.id} (cloned from template)`,
        );
      }

      // 1.5 Seed default chart of accounts for the group
      try {
        await seedDefaultChartOfAccounts(groupId);
        this.logger.debug(
          `[Job ${job.id}] Seeded default chart of accounts for group`,
        );
      } catch (err) {
        this.logger.error(
          `[Job ${job.id}] Failed to seed chart of accounts: ${err}`,
        );
        // Don't throw - continue with other setup steps
      }

      // 2. Create group admin user with empty adminEntities (= full access to all entities)
      const password = 'Password123';
      const hashed = await bcrypt.hash(password, 10);

      await this.prisma.user.create({
        data: {
          email,
          firstName: groupName || 'Group',
          lastName: 'Administrator',
          password: hashed,
          groupId,
          roleId: adminRole.id,
          systemRole: systemRole.admin,
          adminEntities: [], // empty array = full access to all entities in this group
        },
      });

      this.logger.debug(
        `[Job ${job.id}] Created group admin user with full entity access`,
      );

      // 3. Create free trial subscription for the group
      try {
        // Get subscription settings
        const settings = await (
          this.prisma as any
        ).subscriptionSettings.findFirst();
        const trialDurationDays = settings?.trialDurationDays || 14;

        // Get the free tier
        const freeTier = await this.prisma.subscriptionTier.findFirst({
          where: {
            name: {
              in: ['Free', 'free'],
            },
          },
        });

        if (freeTier) {
          const billingEndDate = new Date();
          billingEndDate.setDate(billingEndDate.getDate() + trialDurationDays);

          // Count active users in the group
          const userCount = await this.prisma.user.count({
            where: { groupId, isActive: true },
          });

          await this.prisma.subscription.create({
            data: {
              groupId,
              subscriptionTierId: freeTier.id,
              tierName: freeTier.name,
              maxUsers: freeTier.maxUsers ?? -1,
              maxEntities: freeTier.maxEntities ?? -1,
              usedUsers: userCount, // Set to actual count of active users
              billingStartDate: new Date(),
              billingEndDate,
              renewalDate: billingEndDate,
            },
          });

          this.logger.log(
            `[Job ${job.id}] Created free trial subscription for group (${trialDurationDays} days, ${userCount} active users)`,
          );
        } else {
          this.logger.warn(
            `[Job ${job.id}] Free tier not found, skipping subscription creation`,
          );
        }
      } catch (err) {
        this.logger.error(
          `[Job ${job.id}] Failed to create subscription: ${err}`,
        );
        // Don't throw - continue with email send
      }

      // Send welcome email to group admin
      try {
        const htmlContent = this.emailService.renderHtmlTemplate(
          // path.join(
          //   process.cwd(),
          //   'src/email/templates/group-admin-welcome.html',
          // ),
          path.join(__dirname, '../email/templates/group-admin-welcome.html'),
          {
            firstName: groupName || 'Group',
            groupName: groupName || 'Group',
            email,
            password,
            loginUrl: `https://${groupSlug}.${process.env.DOMAIN}/auth/login`,
          },
        );
        const html = this.emailService.wrapWithBaseTemplate(
          htmlContent,
          'Welcome to X-Finance',
          { year: new Date().getFullYear() },
        );
        await this.emailService.sendEmail({
          to: email,
          subject: 'Welcome to X-Finance',
          html,
        });
        this.logger.log(`[Job ${job.id}] Sent welcome email to group admin`);
      } catch (err) {
        this.logger.error(
          `[Job ${job.id}] Failed to send group admin welcome email: ${err}`,
        );
      }

      this.logger.log(
        `[Job ${job.id}] ✓ create-group-user completed successfully (BullMQ will clean up)`,
      );

      return { ok: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[Job ${job.id}] ✗ create-group-user FAILED: ${errorMsg}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }

  async handleCreateEntityUser(job: Job) {
    const { entityId, groupId } = job.data as {
      entityId: string;
      groupId: string;
    };

    this.logger.log(
      `[Job ${job.id}] Running create-entity-user for groupId: ${groupId}, entityId: ${entityId}`,
    );

    try {
      // 1. Seed default accounts for the entity
      try {
        await seedDefaultEntityAccounts(entityId, groupId);
        this.logger.debug(`[Job ${job.id}] Seeded default accounts for entity`);
      } catch (err) {
        this.logger.error(
          `[Job ${job.id}] Failed to seed entity accounts: ${err}`,
        );
        // Don't throw - continue with other setup steps
      }

      this.logger.log(
        `[Job ${job.id}] ✓ create-entity-user completed successfully (BullMQ will clean up)`,
      );

      return { ok: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[Job ${job.id}] ✗ create-entity-user FAILED: ${errorMsg}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }

  /**
   * Handle user welcome email
   * Sends welcome email for newly created users (single or bulk)
   */
  async handleSendUserWelcomeEmail(job: Job): Promise<any> {
    const {
      email,
      firstName,
      lastName,
      password,
      scope,
      groupId,
      customMessage,
      groupName,
      entityName,
      groupSlug,
    } = job.data as {
      email: string;
      firstName: string;
      lastName?: string;
      password: string;
      scope: 'ENTITY' | 'GROUP';
      groupId: string;
      customMessage?: string;
      groupName: string;
      groupSlug: string;
      entityName?: string;
    };

    this.logger.log(
      `[Job ${job.id}] Sending welcome email to ${email} (scope: ${scope})`,
    );

    try {
      // Select appropriate template based on scope
      const templatePath =
        scope === 'GROUP'
          ? // ? path.join(
            //     process.cwd(),
            //     'src/email/templates/group-admin-welcome.html',
            //   )
            path.join(__dirname, '../email/templates/group-admin-welcome.html')
          : // : path.join(
            //     process.cwd(),
            //     'src/email/templates/entity-user-welcome.html',
            //   );
            path.join(__dirname, '../email/templates/entity-user-welcome.html');

      const htmlContent = this.emailService.renderHtmlTemplate(templatePath, {
        firstName: firstName || 'User',
        groupName: groupName,
        entityName: entityName || '',
        email,
        password,
        loginUrl: `https://${groupSlug}.${process.env.DOMAIN}/auth/login`,
      });

      const html = this.emailService.wrapWithBaseTemplate(
        htmlContent,
        'Welcome to X-Finance',
        {
          year: new Date().getFullYear(),
        },
      );

      await this.emailService.sendEmail({
        to: email,
        subject: 'Welcome to X-Finance',
        html,
      });

      this.logger.log(`[Job ${job.id}] ✓ Welcome email sent to ${email}`);
      return { ok: true };
    } catch (err) {
      this.logger.error(
        `[Job ${job.id}] ✗ Failed to send welcome email to ${email}: ${err}`,
      );
      // Don't throw - don't fail the whole job if email fails
      return { ok: false, error: String(err) };
    }
  }

  /**
   * Handle invoice journal posting job
   * Posts invoice to journal and updates account balances
   */
  async handleInvoiceJournalPosting(job: Job): Promise<any> {
    const { invoiceId, invoiceData } = job.data as {
      invoiceId: string;
      invoiceData: {
        invoiceNumber: string;
        entityId: string;
        subtotal: number;
        tax: number;
        total: number;
        items: Array<{
          itemId: string;
          quantity: number;
          rate: number;
          total: number;
        }>;
      };
    };

    this.logger.log(
      `[Job ${job.id}] Processing invoice journal posting for invoice: ${invoiceData.invoiceNumber}`,
    );

    try {
      // Mark as Processing
      this.logger.debug(
        `[Job ${job.id}] Setting invoice ${invoiceId} to Processing state`,
      );
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { postingStatus: 'Processing' },
      });

      // Fetch item details to determine type and COGS
      const itemDetails = await this.prisma.items.findMany({
        where: {
          id: { in: invoiceData.items.map((i) => i.itemId) },
        },
        select: {
          id: true,
          type: true,
          // trackInventory: true,
          unitPrice: true,
        },
      });

      // Separate items by type
      let productNetTotal = 0;
      let serviceNetTotal = 0;
      let cogsTotal = 0;

      for (const item of invoiceData.items) {
        const itemDetail = itemDetails.find((i) => i.id === item.itemId);
        if (!itemDetail) continue;

        const netAmount = item.total;

        if (itemDetail.type === ItemsType.goods) {
          productNetTotal += netAmount;

          // if (itemDetail.trackInventory && itemDetail.costPrice) {
          //   const itemCogs = itemDetail.costPrice * item.quantity;
          //   cogsTotal += itemCogs;
          // }
        } else if (itemDetail.type === ItemsType.service) {
          serviceNetTotal += netAmount;
        }
      }

      // Find account codes
      const [
        arAccount,
        productRevenueAccount,
        serviceRevenueAccount,
        vatAccount,
        // cogsAccount,
        // inventoryAccount,
      ] = await Promise.all([
        this.prisma.account.findFirst({
          where: {
            code: '1120-01',
            entityId: invoiceData.entityId,
          },
          select: { id: true },
        }),
        this.prisma.account.findFirst({
          where: {
            code: '4110-01',
            entityId: invoiceData.entityId,
          },
          select: { id: true },
        }),
        this.prisma.account.findFirst({
          where: {
            code: '4120-01',
            entityId: invoiceData.entityId,
          },
          select: { id: true },
        }),
        this.prisma.account.findFirst({
          where: {
            code: '2140-01',
            entityId: invoiceData.entityId,
          },
          select: { id: true },
        }),
        // this.prisma.account.findFirst({
        //   where: {
        //     code: '5110-01',
        //     entityId: invoiceData.entityId,
        //   },
        //   select: { id: true },
        // }),
        // this.prisma.account.findFirst({
        //   where: {
        //     code: '1130-01',
        //     entityId: invoiceData.entityId,
        //   },
        //   select: { id: true },
        // }),
      ]);

      if (!arAccount) {
        throw new BadRequestException(
          'Accounts Receivable account (1120-01) not found for entity',
        );
      }

      // Build journal lines
      const journalLines: Array<{
        accountId: string;
        debit: number;
        credit: number;
      }> = [];

      journalLines.push({
        accountId: arAccount.id,
        debit: invoiceData.total,
        credit: 0,
      });

      if (productNetTotal > 0 && productRevenueAccount) {
        journalLines.push({
          accountId: productRevenueAccount.id,
          debit: 0,
          credit: productNetTotal,
        });
      }

      if (serviceNetTotal > 0 && serviceRevenueAccount) {
        journalLines.push({
          accountId: serviceRevenueAccount.id,
          debit: 0,
          credit: serviceNetTotal,
        });
      }

      if (invoiceData.tax > 0 && vatAccount) {
        journalLines.push({
          accountId: vatAccount.id,
          debit: 0,
          credit: invoiceData.tax,
        });
      }

      // if (cogsTotal > 0 && cogsAccount && inventoryAccount) {
      //   journalLines.push({
      //     accountId: cogsAccount.id,
      //     debit: cogsTotal,
      //     credit: 0,
      //   });

      // journalLines.push({
      //   accountId: inventoryAccount.id,
      //   debit: 0,
      //   credit: cogsTotal,
      // });
      // }

      // Validate journal balances
      const totalDebit = journalLines.reduce(
        (sum, line) => sum + line.debit,
        0,
      );
      const totalCredit = journalLines.reduce(
        (sum, line) => sum + line.credit,
        0,
      );

      if (totalDebit !== totalCredit) {
        throw new BadRequestException(
          `Journal entry does not balance. Debit: ${totalDebit}, Credit: ${totalCredit}`,
        );
      }

      const invoiceEntity = await this.prisma.entity.findUnique({
        where: { id: invoiceData.entityId },
        select: { groupId: true },
      });

      // Create journal entry in transaction
      await this.prisma.$transaction(async (tx) => {
        const journalRef = generateJournalReference('INV');
        const postedAt = new Date();

        // Create journal
        await tx.journal.create({
          data: {
            description: `Invoice ${invoiceData.invoiceNumber} posted`,
            date: postedAt,
            reference: journalRef,
            entityId: invoiceData.entityId,
            groupId: invoiceEntity!.groupId,
            lines: journalLines,
          },
        });

        // Get current account balances and update them
        const accountBalances = await Promise.all(
          journalLines.map((line) =>
            tx.account.findUnique({
              where: { id: line.accountId },
              select: { balance: true },
            }),
          ),
        );

        const updatedAccounts = await Promise.all(
          journalLines.map((line) =>
            tx.account.update({
              where: { id: line.accountId },
              data: {
                balance: {
                  increment: line.debit - line.credit,
                },
              },
              select: { balance: true },
            }),
          ),
        );

        // Fetch account details to check for bank linking
        const accountsWithBanksInvoice = await Promise.all(
          journalLines.map((line) =>
            tx.account.findUnique({
              where: { id: line.accountId },
              select: {
                balance: true,
                bankAccount: { select: { id: true } },
              },
            }),
          ),
        );

        // Create account transactions for each journal line with running balance
        await Promise.all(
          journalLines.map((line, index) => {
            const accountWithBank = accountsWithBanksInvoice[index];
            const txData: any = {
              date: postedAt,
              description: `Invoice ${invoiceData.invoiceNumber} posted to journal`,
              reference: journalRef,
              type: accountWithBank?.bankAccount ? 'BANK' : 'INVOICE_POSTING',
              status: 'Success',
              accountId: line.accountId,
              debitAmount: line.debit,
              creditAmount: line.credit,
              runningBalance: updatedAccounts[index].balance,
              entityId: invoiceData.entityId,
              relatedEntityId: invoiceId,
              relatedEntityType: 'Invoice',
              metadata: {
                invoiceNumber: invoiceData.invoiceNumber,
                journalReference: journalRef,
              },
            };

            return tx.accountTransaction.create({ data: txData });
          }),
        );

        // Mark invoice as successfully posted with reference and timestamp
        this.logger.debug(
          `[Job ${job.id}] Updating invoice ${invoiceId} with postingStatus=Success and reference=${journalRef}`,
        );

        const invoiceUpdateResult = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            postingStatus: 'Success',
            journalReference: journalRef,
            postedAt,
          },
        });

        this.logger.debug(
          `[Job ${job.id}] Invoice updated. postingStatus=${invoiceUpdateResult.postingStatus}, journalReference=${invoiceUpdateResult.journalReference}`,
        );

        // Log activity
        await tx.invoiceActivity.create({
          data: {
            invoiceId,
            activityType: InvoiceActivityType.Sent,
            description: 'Invoice posted to journal',
            metadata: { reference: journalRef },
          } as any, // performedBy is optional after migration
        });
      });

      this.logger.log(
        `[Job ${job.id}] Successfully posted invoice ${invoiceData.invoiceNumber} to journal`,
      );

      return { success: true, invoiceId };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Failed to post invoice journal: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Update invoice posting status to Failed for retry
      try {
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            postingStatus: 'Failed',
          },
        });
      } catch (updateError) {
        this.logger.error(
          `[Job ${job.id}] Failed to update invoice status to Failed`,
        );
      }

      throw error; // Rethrow to trigger retry
    }
  }

  /**
   * Handle payment received journal posting
   * Posts: Dr Bank/Cash Account = payment amount
   *        Cr Accounts Receivable = payment amount
   */
  async handlePaymentReceivedPosting(job: Job): Promise<any> {
    const { paymentId, paymentData } = job.data as {
      paymentId: string;
      paymentData: {
        amount: number;
        paymentNumber: string;
        bankAccountId: string;
        entityId: string;
      };
    };

    this.logger.log(
      `[Job ${job.id}] Processing payment journal posting for payment: ${paymentData.paymentNumber}`,
    );

    try {
      // Mark as Processing
      this.logger.debug(
        `[Job ${job.id}] Setting payment ${paymentId} to Processing state`,
      );
      await this.prisma.paymentReceived.update({
        where: { id: paymentId },
        data: { postingStatus: 'Processing' },
      });

      // Find Accounts Receivable account (credit side)
      const arAccount = await this.prisma.account.findFirst({
        where: {
          code: '1120-01', // Accounts Receivable
          entityId: paymentData.entityId,
        },
        select: { id: true },
      });

      if (!arAccount) {
        throw new BadRequestException(
          'Accounts Receivable account (1120-01) not found for entity',
        );
      }

      // Find bank/cash account (debit side) - passed as depositTo ID
      const bankAccount = await this.prisma.account.findUnique({
        where: { id: paymentData.bankAccountId },
        select: { id: true, code: true },
      });

      if (!bankAccount) {
        throw new BadRequestException('Bank account not found');
      }

      // Build journal lines
      const journalLines: Array<{
        accountId: string;
        debit: number;
        credit: number;
      }> = [
        // Dr Bank/Cash Account
        {
          accountId: bankAccount.id,
          debit: paymentData.amount,
          credit: 0,
        },
        // Cr Accounts Receivable
        {
          accountId: arAccount.id,
          debit: 0,
          credit: paymentData.amount,
        },
      ];

      const paymentReceivedEntity = await this.prisma.entity.findUnique({
        where: { id: paymentData.entityId },
        select: { groupId: true },
      });

      // Create journal entry in transaction
      await this.prisma.$transaction(async (tx) => {
        const journalRef = generateJournalReference('PAY');
        const postedAt = new Date();

        // Create journal
        await tx.journal.create({
          data: {
            description: `Payment ${paymentData.paymentNumber} received`,
            date: postedAt,
            reference: journalRef,
            entityId: paymentData.entityId,
            groupId: paymentReceivedEntity!.groupId,
            lines: journalLines,
          },
        });

        // Get account details including linked bank accounts
        const accountsWithBanks = await Promise.all(
          journalLines.map((line) =>
            tx.account.findUnique({
              where: { id: line.accountId },
              select: {
                balance: true,
                bankAccount: { select: { id: true } },
              },
            }),
          ),
        );

        // Update GL accounts and linked bank accounts
        const updatedAccounts = await Promise.all(
          journalLines.map((line, index) => {
            const accountWithBank = accountsWithBanks[index];
            const promises: any[] = [];

            // Update GL account
            promises.push(
              tx.account.update({
                where: { id: line.accountId },
                data: {
                  balance: {
                    increment: line.debit - line.credit,
                  },
                },
                select: { balance: true },
              }),
            );

            return Promise.all(promises);
          }),
        );

        // Create account transactions for each journal line with running balance
        await Promise.all(
          journalLines.map((line, index) => {
            const accountWithBank = accountsWithBanks[index];
            const glAccountUpdate = updatedAccounts[index][0];

            const txData: any = {
              date: postedAt,
              description: `Payment ${paymentData.paymentNumber} received and posted to journal`,
              reference: journalRef,
              type: accountWithBank?.bankAccount
                ? 'BANK'
                : 'PAYMENT_RECEIVED_POSTING',
              status: 'Success',
              accountId: line.accountId,
              debitAmount: line.debit,
              creditAmount: line.credit,
              runningBalance: glAccountUpdate.balance,
              entityId: paymentData.entityId,
              relatedEntityId: paymentId,
              relatedEntityType: 'PaymentReceived',
              metadata: {
                paymentNumber: paymentData.paymentNumber,
                journalReference: journalRef,
                paymentAmount: paymentData.amount,
              },
            };

            return tx.accountTransaction.create({ data: txData });
          }),
        );

        // Update payment record with posting status
        this.logger.debug(
          `[Job ${job.id}] Updating payment ${paymentId} with postingStatus=Success and reference=${journalRef}`,
        );

        const paymentUpdateResult = await tx.paymentReceived.update({
          where: { id: paymentId },
          data: {
            postingStatus: 'Success',
            journalReference: journalRef,
            postedAt,
          },
        });

        this.logger.debug(
          `[Job ${job.id}] Payment updated. postingStatus=${paymentUpdateResult.postingStatus}, journalReference=${paymentUpdateResult.journalReference}`,
        );
      });

      this.logger.log(
        `[Job ${job.id}] Successfully posted payment ${paymentData.paymentNumber} to journal`,
      );

      return { success: true, paymentId };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Failed to post payment journal: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Update payment posting status to Failed for retry
      try {
        await this.prisma.paymentReceived.update({
          where: { id: paymentId },
          data: {
            postingStatus: 'Failed',
          },
        });
      } catch (updateError) {
        this.logger.error(
          `[Job ${job.id}] Failed to update payment status to Failed`,
        );
      }

      throw error; // Rethrow to trigger retry
    }
  }

  /**
   * Handle receipt journal posting job
   * Posts sales receipt to journal (immediate cash sale)
   * Dr Cash/Bank Account = total
   * Cr Product Revenue (4110) = product net
   * Cr Service Revenue (4120) = service net
   * Cr Tax Payable (2140) = tax (if tax > 0)
   */
  async handleReceiptJournalPosting(job: Job): Promise<any> {
    const { receiptId, receiptData } = job.data as {
      receiptId: string;
      receiptData: {
        receiptNumber: string;
        entityId: string;
        subtotal: number;
        tax: number;
        total: number;
        depositTo: string;
        items: Array<{
          itemId: string;
          quantity: number;
          rate: number;
          total: number;
        }>;
      };
    };

    this.logger.log(
      `[Job ${job.id}] Processing receipt journal posting for receipt: ${receiptData.receiptNumber}`,
    );

    try {
      // Mark as Processing
      this.logger.debug(
        `[Job ${job.id}] Setting receipt ${receiptId} to Processing state`,
      );
      await this.prisma.receipt.update({
        where: { id: receiptId },
        data: { postingStatus: 'Processing' },
      });

      // Fetch item details to determine type
      const itemDetails = await this.prisma.items.findMany({
        where: {
          id: { in: receiptData.items.map((i) => i.itemId) },
        },
        select: {
          id: true,
          type: true,
        },
      });

      // Separate items by type
      let productNetTotal = 0;
      let serviceNetTotal = 0;

      for (const item of receiptData.items) {
        const itemDetail = itemDetails.find((i) => i.id === item.itemId);
        if (!itemDetail) continue;

        const netAmount = item.total;

        if (itemDetail.type === 'goods') {
          productNetTotal += netAmount;
        } else if (itemDetail.type === 'service') {
          serviceNetTotal += netAmount;
        }
      }

      // Find account codes
      const [
        depositAccount,
        productRevenueAccount,
        serviceRevenueAccount,
        vatAccount,
      ] = await Promise.all([
        this.prisma.account.findUnique({
          where: { id: receiptData.depositTo },
          select: { id: true },
        }),
        this.prisma.account.findFirst({
          where: {
            code: '4110-01',
            entityId: receiptData.entityId,
          },
          select: { id: true },
        }),
        this.prisma.account.findFirst({
          where: {
            code: '4120-01',
            entityId: receiptData.entityId,
          },
          select: { id: true },
        }),
        this.prisma.account.findFirst({
          where: {
            code: '2140-01',
            entityId: receiptData.entityId,
          },
          select: { id: true },
        }),
      ]);

      if (!depositAccount) {
        throw new Error(
          `Deposit account not found for ID: ${receiptData.depositTo}`,
        );
      }

      // Build journal lines
      const journalLines: Array<{
        accountId: string;
        debit: number;
        credit: number;
      }> = [];

      // Dr Cash/Bank Account
      journalLines.push({
        accountId: depositAccount.id,
        debit: receiptData.total,
        credit: 0,
      });

      // Cr Product Sales Revenue (if any products)
      if (productNetTotal > 0 && productRevenueAccount) {
        journalLines.push({
          accountId: productRevenueAccount.id,
          debit: 0,
          credit: productNetTotal,
        });
      }

      // Cr Service Revenue (if any services)
      if (serviceNetTotal > 0 && serviceRevenueAccount) {
        journalLines.push({
          accountId: serviceRevenueAccount.id,
          debit: 0,
          credit: serviceNetTotal,
        });
      }

      // Cr VAT Payable (if tax > 0)
      if (receiptData.tax > 0 && vatAccount) {
        journalLines.push({
          accountId: vatAccount.id,
          debit: 0,
          credit: receiptData.tax,
        });
      }

      // Validate journal balances
      const totalDebit = journalLines.reduce(
        (sum, line) => sum + line.debit,
        0,
      );
      const totalCredit = journalLines.reduce(
        (sum, line) => sum + line.credit,
        0,
      );

      if (totalDebit !== totalCredit) {
        throw new Error(
          `Journal entry does not balance. Debit: ${totalDebit}, Credit: ${totalCredit}`,
        );
      }

      const receiptEntity = await this.prisma.entity.findUnique({
        where: { id: receiptData.entityId },
        select: { groupId: true },
      });

      // Create journal entry in transaction
      await this.prisma.$transaction(async (tx) => {
        const journalRef = generateJournalReference('RCT');
        const postedAt = new Date();

        // Create journal
        await tx.journal.create({
          data: {
            description: `Receipt ${receiptData.receiptNumber} posted`,
            date: postedAt,
            reference: journalRef,
            entityId: receiptData.entityId,
            groupId: receiptEntity!.groupId,
            lines: journalLines,
          },
        });

        // Get current account balances and update them
        const accountBalances = await Promise.all(
          journalLines.map((line) =>
            tx.account.findUnique({
              where: { id: line.accountId },
              select: { balance: true },
            }),
          ),
        );

        const updatedAccounts = await Promise.all(
          journalLines.map((line) =>
            tx.account.update({
              where: { id: line.accountId },
              data: {
                balance: {
                  increment: line.debit - line.credit,
                },
              },
              select: { balance: true },
            }),
          ),
        );

        // Fetch account details to check for bank linking
        const accountsWithBanksReceipt = await Promise.all(
          journalLines.map((line) =>
            tx.account.findUnique({
              where: { id: line.accountId },
              select: {
                balance: true,
                bankAccount: { select: { id: true } },
              },
            }),
          ),
        );

        // Create account transactions for each journal line with running balance
        await Promise.all(
          journalLines.map((line, index) => {
            const accountWithBank = accountsWithBanksReceipt[index];
            const txData: any = {
              date: postedAt,
              description: `Receipt ${receiptData.receiptNumber} posted to journal`,
              reference: journalRef,
              type: accountWithBank?.bankAccount ? 'BANK' : 'RECEIPT_POSTING',
              status: 'Success',
              accountId: line.accountId,
              debitAmount: line.debit,
              creditAmount: line.credit,
              runningBalance: updatedAccounts[index].balance,
              entityId: receiptData.entityId,
              relatedEntityId: receiptId,
              relatedEntityType: 'Receipt',
              metadata: {
                receiptNumber: receiptData.receiptNumber,
                journalReference: journalRef,
              },
            };

            return tx.accountTransaction.create({ data: txData });
          }),
        );

        // Mark receipt as successfully posted with reference and timestamp
        this.logger.debug(
          `[Job ${job.id}] Updating receipt ${receiptId} with postingStatus=Success and reference=${journalRef}`,
        );

        const receiptUpdateResult = await tx.receipt.update({
          where: { id: receiptId },
          data: {
            postingStatus: 'Success',
            journalReference: journalRef,
            postedAt,
          },
        });

        this.logger.debug(
          `[Job ${job.id}] Receipt updated. postingStatus=${receiptUpdateResult.postingStatus}, journalReference=${receiptUpdateResult.journalReference}`,
        );
      });

      this.logger.log(
        `[Job ${job.id}] Successfully posted receipt ${receiptData.receiptNumber} to journal`,
      );

      return { success: true, receiptId };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Failed to post receipt journal: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Update receipt posting status to Failed for retry
      try {
        await this.prisma.receipt.update({
          where: { id: receiptId },
          data: {
            postingStatus: 'Failed',
          },
        });
      } catch (updateError) {
        this.logger.error(
          `[Job ${job.id}] Failed to update receipt status to Failed`,
        );
      }

      throw error; // Rethrow to trigger retry
    }
  }

  /**
   * Handle bill journal posting job
   * Posts vendor bill to journal following accounting rules:
   * Dr Expense accounts (per item) = item net amounts
   * Dr Input VAT (1300) = tax (if tax > 0)
   * Cr Accounts Payable (2000) = total
   */
  async handleBillJournalPosting(job: Job): Promise<any> {
    const { billId, billData } = job.data as {
      billId: string;
      billData: {
        billNumber: string;
        entityId: string;
        groupId: string;
        subtotal: number;
        tax: number;
        total: number;
        discount: number;
        accountsPayableId: string;
        items: Array<{
          name: string;
          rate: number;
          quantity: number;
          total: number;
          expenseAccountId: string;
        }>;
      };
    };

    this.logger.log(
      `[Job ${job.id}] Processing bill journal posting for bill: ${billData.billNumber}`,
    );

    try {
      // Mark as Processing
      this.logger.debug(
        `[Job ${job.id}] Setting bill ${billId} to Processing state`,
      );
      await this.prisma.bills.update({
        where: { id: billId },
        data: { postingStatus: 'Processing' },
      });

      // Find accounts
      const [
        apAccount,
        vatAccount,
        // discountAccount
      ] = await Promise.all([
        this.prisma.account.findUnique({
          where: { id: billData.accountsPayableId },
          select: { id: true },
        }),
        this.prisma.account.findFirst({
          where: {
            code: '2140-01', // Input VAT account
            entityId: billData.entityId,
          },
          select: { id: true },
        }),
        // COMMENTED OUT - Discount account not yet available
        // this.prisma.account.findFirst({
        //   where: {
        //     code: '4100-02', // Purchase Discount account (contra-expense)
        //     entityId: billData.entityId,
        //   },
        //   select: { id: true },
        // }),
      ]);

      if (!apAccount) {
        throw new Error(
          `Accounts Payable account not found for ID: ${billData.accountsPayableId}`,
        );
      }

      // Build journal lines
      const journalLines: Array<{
        accountId: string;
        debit: number;
        credit: number;
      }> = [];

      // Dr Expense accounts (one per item)
      for (const item of billData.items) {
        journalLines.push({
          accountId: item.expenseAccountId,
          debit: item.total,
          credit: 0,
        });
      }

      // Dr Input VAT (if tax > 0)
      if (billData.tax > 0 && vatAccount) {
        journalLines.push({
          accountId: vatAccount.id,
          debit: billData.tax,
          credit: 0,
        });
      }

      // COMMENTED OUT - Discount account posting deferred
      // Dr Purchase Discount (if discount > 0) - debit to reduce expense
      // if (billData.discount > 0 && discountAccount) {
      //   journalLines.push({
      //     accountId: discountAccount.id,
      //     debit: billData.discount,
      //     credit: 0,
      //   });
      // }

      // Cr Accounts Payable
      // NOTE: Discount posting deferred - credit AP for subtotal + tax only
      const apCredit = billData.subtotal + billData.tax;
      journalLines.push({
        accountId: apAccount.id,
        debit: 0,
        credit: apCredit,
      });

      // Validate journal balances
      const totalDebit = journalLines.reduce(
        (sum, line) => sum + line.debit,
        0,
      );
      const totalCredit = journalLines.reduce(
        (sum, line) => sum + line.credit,
        0,
      );

      if (totalDebit !== totalCredit) {
        const difference = totalDebit - totalCredit;
        const errorMsg = `Journal entry does not balance. Debit: ${totalDebit}, Credit: ${totalCredit}, Difference: ${difference}. 
        Subtotal: ${billData.subtotal}, Tax: ${billData.tax}, Discount: ${billData.discount} (not posted), Total: ${billData.total}`;
        throw new Error(errorMsg);
      }

      // const billEntity = await this.prisma.entity.findUnique({
      //   where: { id: billData.entityId },
      //   select: { groupId: true },
      // });

      // Create journal entry in transaction
      await this.prisma.$transaction(async (tx) => {
        const journalRef = generateJournalReference('BILL');
        const postedAt = new Date();

        // Create journal
        await tx.journal.create({
          data: {
            description: `Bill ${billData.billNumber} posted`,
            date: postedAt,
            reference: journalRef,
            entityId: billData.entityId,
            groupId: billData.groupId,
            lines: journalLines,
          },
        });

        // Get current account balances and update them
        const updatedAccounts = await Promise.all(
          journalLines.map((line) =>
            tx.account.update({
              where: { id: line.accountId },
              data: {
                balance: {
                  increment: line.debit - line.credit,
                },
              },
              select: { balance: true },
            }),
          ),
        );

        // Fetch account details to check for bank linking
        const accountsWithBanksBill = await Promise.all(
          journalLines.map((line) =>
            tx.account.findUnique({
              where: { id: line.accountId },
              select: {
                balance: true,
                bankAccount: { select: { id: true } },
              },
            }),
          ),
        );

        // Create account transactions for each journal line with running balance
        await Promise.all(
          journalLines.map((line, index) => {
            const accountWithBank = accountsWithBanksBill[index];
            const txData: any = {
              date: postedAt,
              description: `Bill ${billData.billNumber} posted to journal`,
              reference: journalRef,
              type: accountWithBank?.bankAccount ? 'BANK' : 'BILL_POSTING',
              status: 'Success',
              accountId: line.accountId,
              debitAmount: line.debit,
              creditAmount: line.credit,
              runningBalance: updatedAccounts[index].balance,
              entityId: billData.entityId,
              groupId: billData.groupId,
              relatedEntityId: billId,
              relatedEntityType: 'Bill',
              metadata: {
                billNumber: billData.billNumber,
                journalReference: journalRef,
              },
            };

            return tx.accountTransaction.create({ data: txData });
          }),
        );

        // Mark bill as successfully posted with reference and timestamp
        this.logger.debug(
          `[Job ${job.id}] Updating bill ${billId} with postingStatus=Success and reference=${journalRef}`,
        );

        const billUpdateResult = await tx.bills.update({
          where: { id: billId },
          data: {
            postingStatus: 'Success',
            journalReference: journalRef,
            postedAt,
          },
        });

        this.logger.debug(
          `[Job ${job.id}] Bill updated. postingStatus=${billUpdateResult.postingStatus}, journalReference=${billUpdateResult.journalReference}`,
        );
      });

      this.logger.log(
        `[Job ${job.id}] Successfully posted bill ${billData.billNumber} to journal`,
      );

      return { success: true, billId };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Failed to post bill journal: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Update bill posting status to Failed and store error details
      try {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await this.prisma.bills.update({
          where: { id: billId },
          data: {
            postingStatus: 'Failed',
            errorMessage: errorMessage.substring(0, 500), // Store first 500 chars
            errorCode: 'JOURNAL_POSTING_FAILED',
          },
        });
        this.logger.log(
          `[Job ${job.id}] Bill ${billId} marked as Failed with error stored`,
        );
      } catch (updateError) {
        this.logger.error(
          `[Job ${job.id}] Failed to update bill status to Failed: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
        );
      }

      throw error; // Rethrow to trigger retry
    }
  }

  async handleExpenseJournalPosting(job: Job): Promise<any> {
    const { expenseId, expenseData } = job.data as {
      expenseId: string;
      expenseData: {
        reference: string;
        entityId: string;
        groupId: string;
        amount: number;
        tax: number;
        expenseAccountId: string;
        paymentAccountId: string;
      };
    };

    this.logger.log(
      `[Job ${job.id}] Processing expense journal posting for expense: ${expenseData.reference}`,
    );

    try {
      // Mark as Processing
      this.logger.debug(
        `[Job ${job.id}] Setting expense ${expenseId} to Processing state`,
      );
      await this.prisma.expenses.update({
        where: { id: expenseId },
        data: { postingStatus: 'Processing' },
      });

      // Find accounts
      const [expenseAccount, paymentAccount, vatAccount] = await Promise.all([
        this.prisma.account.findUnique({
          where: { id: expenseData.expenseAccountId },
          select: { id: true },
        }),
        this.prisma.account.findUnique({
          where: { id: expenseData.paymentAccountId },
          select: { id: true },
        }),
        this.prisma.account.findFirst({
          where: {
            code: '2140-01', // Input VAT account
            entityId: expenseData.entityId,
          },
          select: { id: true },
        }),
      ]);

      if (!expenseAccount) {
        throw new Error(
          `Expense account not found for ID: ${expenseData.expenseAccountId}`,
        );
      }

      if (!paymentAccount) {
        throw new Error(
          `Payment account not found for ID: ${expenseData.paymentAccountId}`,
        );
      }

      // Build journal lines
      // Posting rule: Dr Expense + Dr VAT = Cr Bank/Cash
      const journalLines: Array<{
        accountId: string;
        debit: number;
        credit: number;
      }> = [];

      // Dr Expense Account
      journalLines.push({
        accountId: expenseAccount.id,
        debit: expenseData.amount,
        credit: 0,
      });

      // Dr Input VAT (if tax > 0)
      if (expenseData.tax > 0 && vatAccount) {
        journalLines.push({
          accountId: vatAccount.id,
          debit: expenseData.tax,
          credit: 0,
        });
      }

      // Cr Payment Account (Bank/Cash)
      const creditAmount = expenseData.amount + expenseData.tax;
      journalLines.push({
        accountId: paymentAccount.id,
        debit: 0,
        credit: creditAmount,
      });

      // Validate journal balances
      const totalDebit = journalLines.reduce(
        (sum, line) => sum + line.debit,
        0,
      );
      const totalCredit = journalLines.reduce(
        (sum, line) => sum + line.credit,
        0,
      );

      if (totalDebit !== totalCredit) {
        const difference = totalDebit - totalCredit;
        const errorMsg = `Journal entry does not balance. Debit: ${totalDebit}, Credit: ${totalCredit}, Difference: ${difference}. Amount: ${expenseData.amount}, Tax: ${expenseData.tax}`;
        throw new Error(errorMsg);
      }

      // const expenseEntity = await this.prisma.entity.findUnique({
      //   where: { id: expenseData.entityId },
      //   select: { groupId: true },
      // });

      // Create journal entry in transaction
      await this.prisma.$transaction(async (tx) => {
        const journalRef = generateJournalReference('EXP');
        const postedAt = new Date();
        // console.log('groupId', expenseData.groupId);
        // Create journal
        await tx.journal.create({
          data: {
            description: `Expense ${expenseData.reference} posted`,
            date: postedAt,
            reference: journalRef,
            entityId: expenseData.entityId,
            groupId: expenseData.groupId,
            lines: journalLines,
          },
        });

        // Get current account balances and update them
        const updatedAccounts = await Promise.all(
          journalLines.map((line) =>
            tx.account.update({
              where: { id: line.accountId },
              data: {
                balance: {
                  increment: line.debit - line.credit,
                },
              },
              select: { balance: true },
            }),
          ),
        );

        // Fetch account details to check for bank linking
        const accountsWithBanksExpense = await Promise.all(
          journalLines.map((line) =>
            tx.account.findUnique({
              where: { id: line.accountId },
              select: {
                balance: true,
                bankAccount: { select: { id: true } },
              },
            }),
          ),
        );

        // Create account transactions for each journal line with running balance
        await Promise.all(
          journalLines.map((line, index) => {
            const accountWithBank = accountsWithBanksExpense[index];
            const txData: any = {
              date: postedAt,
              description: `Expense ${expenseData.reference} posted to journal`,
              reference: journalRef,
              type: accountWithBank?.bankAccount ? 'BANK' : 'EXPENSE_POSTING',
              status: 'Success',
              accountId: line.accountId,
              debitAmount: line.debit,
              creditAmount: line.credit,
              runningBalance: updatedAccounts[index].balance,
              entityId: expenseData.entityId,
              groupId: expenseData.groupId,
              relatedEntityId: expenseId,
              relatedEntityType: 'Expense',
              metadata: {
                reference: expenseData.reference,
                journalReference: journalRef,
              },
            };

            return tx.accountTransaction.create({ data: txData });
          }),
        );

        // Mark expense as successfully posted with reference and timestamp
        this.logger.debug(
          `[Job ${job.id}] Updating expense ${expenseId} with postingStatus=Success and reference=${journalRef}`,
        );

        const expenseUpdateResult = await tx.expenses.update({
          where: { id: expenseId },
          data: {
            postingStatus: 'Success',
            journalReference: journalRef,
            postedAt,
          },
        });

        this.logger.debug(
          `[Job ${job.id}] Expense updated. postingStatus=${expenseUpdateResult.postingStatus}, journalReference=${expenseUpdateResult.journalReference}`,
        );
      });

      this.logger.log(
        `[Job ${job.id}] Successfully posted expense ${expenseData.reference} to journal`,
      );

      return { success: true, expenseId };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Failed to post expense journal: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Update expense posting status to Failed and store error details
      try {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await this.prisma.expenses.update({
          where: { id: expenseId },
          data: {
            postingStatus: 'Failed',
            errorMessage: errorMessage.substring(0, 500),
            errorCode: 'JOURNAL_POSTING_FAILED',
          },
        });
        this.logger.log(
          `[Job ${job.id}] Expense ${expenseId} marked as Failed with error stored`,
        );
      } catch (updateError) {
        this.logger.error(
          `[Job ${job.id}] Failed to update expense status to Failed: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
        );
      }

      throw error; // Rethrow to trigger retry
    }
  }

  async handlePaymentMadeJournalPosting(job: Job): Promise<any> {
    const { paymentMadeId, paymentData } = job.data as {
      paymentMadeId: string;
      paymentData: {
        reference: string;
        entityId: string;
        billId: string;
        amount: number;
        paymentAccountId: string;
        apAccountId: string;
      };
    };

    this.logger.log(
      `[Job ${job.id}] Processing payment made journal posting for payment: ${paymentData.reference}`,
    );

    try {
      // Mark as Processing
      this.logger.debug(
        `[Job ${job.id}] Setting payment made ${paymentMadeId} to Processing state`,
      );
      await this.prisma.paymentMade.update({
        where: { id: paymentMadeId },
        data: { postingStatus: 'Processing' },
      });

      // Find accounts
      const [apAccount, paymentAccount] = await Promise.all([
        this.prisma.account.findUnique({
          where: { id: paymentData.apAccountId },
          select: { id: true },
        }),
        this.prisma.account.findUnique({
          where: { id: paymentData.paymentAccountId },
          select: { id: true },
        }),
      ]);

      if (!apAccount) {
        throw new Error(
          `Accounts Payable account not found for ID: ${paymentData.apAccountId}`,
        );
      }

      if (!paymentAccount) {
        throw new Error(
          `Payment account not found for ID: ${paymentData.paymentAccountId}`,
        );
      }

      // Build journal lines
      // Posting rule: Dr Accounts Payable = Cr Bank/Cash
      const journalLines: Array<{
        accountId: string;
        debit: number;
        credit: number;
      }> = [];

      // Dr Accounts Payable
      journalLines.push({
        accountId: apAccount.id,
        debit: paymentData.amount,
        credit: 0,
      });

      // Cr Bank/Cash Account
      journalLines.push({
        accountId: paymentAccount.id,
        debit: 0,
        credit: paymentData.amount,
      });

      // Validate journal balances
      const totalDebit = journalLines.reduce(
        (sum, line) => sum + line.debit,
        0,
      );
      const totalCredit = journalLines.reduce(
        (sum, line) => sum + line.credit,
        0,
      );

      if (totalDebit !== totalCredit) {
        const difference = totalDebit - totalCredit;
        const errorMsg = `Journal entry does not balance. Debit: ${totalDebit}, Credit: ${totalCredit}, Difference: ${difference}. Amount: ${paymentData.amount}`;
        throw new Error(errorMsg);
      }

      const paymentMadeEntity = await this.prisma.entity.findUnique({
        where: { id: paymentData.entityId },
        select: { groupId: true },
      });

      // Create journal entry in transaction
      await this.prisma.$transaction(async (tx) => {
        const journalRef = generateJournalReference('PMT');
        const postedAt = new Date();

        // Create journal
        await tx.journal.create({
          data: {
            description: `Payment Made ${paymentData.reference} posted`,
            date: postedAt,
            reference: journalRef,
            entityId: paymentData.entityId,
            groupId: paymentMadeEntity!.groupId,
            lines: journalLines,
          },
        });

        // Get current account balances and update them
        const updatedAccounts = await Promise.all(
          journalLines.map((line) =>
            tx.account.update({
              where: { id: line.accountId },
              data: {
                balance: {
                  increment: line.debit - line.credit,
                },
              },
              select: { balance: true },
            }),
          ),
        );

        // Fetch account details to check for bank linking
        const accountsWithBanksPaymentMade = await Promise.all(
          journalLines.map((line) =>
            tx.account.findUnique({
              where: { id: line.accountId },
              select: {
                balance: true,
                bankAccount: { select: { id: true } },
              },
            }),
          ),
        );

        // Create account transactions for each journal line with running balance
        await Promise.all(
          journalLines.map((line, index) => {
            const accountWithBank = accountsWithBanksPaymentMade[index];
            const txData: any = {
              date: postedAt,
              description: `Payment Made ${paymentData.reference} posted to journal`,
              reference: journalRef,
              type: accountWithBank?.bankAccount
                ? 'BANK'
                : 'PAYMENT_MADE_POSTING',
              status: 'Success',
              accountId: line.accountId,
              debitAmount: line.debit,
              creditAmount: line.credit,
              runningBalance: updatedAccounts[index].balance,
              entityId: paymentData.entityId,
              relatedEntityId: paymentMadeId,
              relatedEntityType: 'PaymentMade',
              metadata: {
                reference: paymentData.reference,
                journalReference: journalRef,
              },
            };

            return tx.accountTransaction.create({ data: txData });
          }),
        );

        // Mark payment made as successfully posted with reference and timestamp
        this.logger.debug(
          `[Job ${job.id}] Updating payment made ${paymentMadeId} with postingStatus=Success and reference=${journalRef}`,
        );

        const paymentUpdateResult = await tx.paymentMade.update({
          where: { id: paymentMadeId },
          data: {
            postingStatus: 'Success',
            journalReference: journalRef,
            postedAt,
          },
        });

        this.logger.debug(
          `[Job ${job.id}] Payment Made updated. postingStatus=${paymentUpdateResult.postingStatus}, journalReference=${paymentUpdateResult.journalReference}`,
        );

        // UPDATE BILL STATUS based on total paid amount
        if (paymentData.billId) {
          const bill = await tx.bills.findUnique({
            where: { id: paymentData.billId },
          });

          if (bill) {
            // Calculate total paid for this bill
            const totalPaidResult = await tx.paymentMade.aggregate({
              where: { billId: paymentData.billId },
              _sum: { amount: true },
            });

            const totalPaid = totalPaidResult._sum?.amount || 0;

            // Determine new bill status
            let newBillStatus: string;
            if (totalPaid >= bill.total) {
              newBillStatus = 'paid';
            } else if (totalPaid > 0) {
              newBillStatus = 'partial';
            } else {
              newBillStatus = 'unpaid';
            }

            // Update bill status
            await tx.bills.update({
              where: { id: paymentData.billId },
              data: { status: newBillStatus as any },
            });

            this.logger.log(
              `[Job ${job.id}] Bill ${paymentData.billId} status updated to ${newBillStatus}. Total paid: ${totalPaid}/${bill.total}`,
            );
          }
        }
      });

      this.logger.log(
        `[Job ${job.id}] Successfully posted payment made ${paymentData.reference} to journal`,
      );

      return { success: true, paymentMadeId };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Failed to post payment made journal: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Update payment made posting status to Failed and store error details
      try {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await this.prisma.paymentMade.update({
          where: { id: paymentMadeId },
          data: {
            postingStatus: 'Failed',
            errorMessage: errorMessage.substring(0, 500),
            errorCode: 'JOURNAL_POSTING_FAILED',
          },
        });
        this.logger.log(
          `[Job ${job.id}] Payment Made ${paymentMadeId} marked as Failed with error stored`,
        );
      } catch (updateError) {
        this.logger.error(
          `[Job ${job.id}] Failed to update payment made status to Failed: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
        );
      }

      throw error; // Rethrow to trigger retry
    }
  }

  async handleOpeningBalanceJournalPosting(job: Job): Promise<any> {
    const { openingBalanceId, entityId, items, validItems, accountMap } =
      job.data as {
        openingBalanceId: string;
        entityId: string;
        items: any[];
        validItems: any[];
        accountMap: any[];
      };

    this.logger.log(
      `[Job ${job.id}] Processing opening balance journal posting for opening balance: ${openingBalanceId}`,
    );

    try {
      // Call the opening balance service to post to journal
      await this.openingBalanceService.postOpeningBalanceJournal(
        openingBalanceId,
        entityId,
        items,
        validItems,
        accountMap,
      );

      this.logger.log(
        `[Job ${job.id}] Opening balance ${openingBalanceId} posted to journal successfully`,
      );

      return { success: true, openingBalanceId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `[Job ${job.id}] Failed to post opening balance journal: ${errorMessage}`,
      );

      // Mark opening balance as failed if needed
      try {
        await this.prisma.openingBalance.update({
          where: { id: openingBalanceId },
          data: {
            status: 'Draft', // Keep as Draft on failure
          },
        });
        this.logger.log(
          `[Job ${job.id}] Opening balance ${openingBalanceId} status kept as Draft due to posting failure`,
        );
      } catch (updateError) {
        this.logger.error(
          `[Job ${job.id}] Failed to update opening balance status: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
        );
      }

      throw error; // Rethrow to trigger retry
    }
  }

  /**
   * Handle manual journal posting
   * Updates account balances based on debit/credit entries
   * Applies posting rules: Assets/Expenses increase with debit, Liabilities/Equity/Revenue increase with credit
   */
  async handleManualJournalPosting(job: Job): Promise<any> {
    const { journalId, entityId, lines, accountMap } = job.data as {
      journalId: string;
      entityId: string;
      lines: Array<{
        accountId: string;
        description: string;
        debit: number;
        credit: number;
      }>;
      accountMap: Array<{
        id: string;
        account: any;
      }>;
    };

    try {
      this.logger.debug(
        `[Job ${job.id}] Processing manual journal posting for journal: ${journalId}`,
      );

      // Get journal reference from existing journal
      const journal = await this.prisma.journal.findUnique({
        where: { id: journalId },
      });

      if (!journal) {
        throw new NotFoundException(`Journal ${journalId} not found`);
      }

      // Reconstruct account map
      const reconstructedAccountMap = new Map(
        accountMap.map((item) => [item.id, item.account]),
      );

      const manualJournalEntity = await this.prisma.entity.findUnique({
        where: { id: entityId },
        select: { groupId: true },
      });

      // Update account balances for each line following posting rules
      await this.prisma.$transaction(
        async (tx) => {
          for (const line of lines) {
            const account = reconstructedAccountMap.get(line.accountId);
            if (!account) {
              this.logger.warn(
                `[Job ${job.id}] Account ${line.accountId} not found in account map`,
              );
              continue;
            }

            // Determine account type (Asset, Liability, Equity, Revenue, Expense)
            const accountType = account.subCategory.category.type.name;
            const isDebitNormal =
              accountType === 'Asset' || accountType === 'Expense';

            // Calculate balance change based on posting rules
            let balanceChange = 0;

            if (isDebitNormal) {
              // Assets and Expenses: Debit increases, Credit decreases
              balanceChange = (line.debit || 0) - (line.credit || 0);
            } else {
              // Liabilities, Equity, Revenue: Credit increases, Debit decreases
              balanceChange = (line.credit || 0) - (line.debit || 0);
            }

            const newBalance = account.balance + balanceChange;

            // Update account balance
            await tx.account.update({
              where: { id: line.accountId },
              data: { balance: newBalance },
            });

            // Create account transaction record for audit trail
            await tx.accountTransaction.create({
              data: {
                date: new Date(),
                description: `Journal entry posted - ${line.description || 'Manual journal'}`,
                reference: journal.reference,
                type: 'JOURNAL_ENTRY',
                status: 'Success',
                accountId: line.accountId,
                debitAmount: line.debit || 0,
                creditAmount: line.credit || 0,
                runningBalance: newBalance,
                entityId: entityId,
                groupId: manualJournalEntity!.groupId,
                relatedEntityId: journalId,
                relatedEntityType: 'Journal',
                metadata: {
                  journalReference: journal.reference,
                  accountCode: account.code,
                  accountName: account.name,
                },
              },
            });

            this.logger.debug(
              `[Job ${job.id}] Updated account ${account.code} (${account.name}): ${account.balance} → ${newBalance} (${accountType}, change: ${balanceChange})`,
            );
          }
        },
        { timeout: 15000 },
      );

      this.logger.log(
        `[Job ${job.id}] Successfully posted manual journal: ${journalId}`,
      );
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Failed to post manual journal: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Log the error but don't fail - journal still exists, just balances not updated
      // User can retry posting manually later
      throw error; // Rethrow to trigger retry
    }
  }

  /**
   * Handle subscription tier module assignment
   * Assigns modules to a subscription tier
   * Clears existing modules if clearExisting is true
   */
  async handleAssignTierModules(job: Job): Promise<any> {
    const { tierId, moduleIds, clearExisting } = job.data as {
      tierId: string;
      moduleIds: string[];
      clearExisting: boolean;
    };

    this.logger.log(
      `[Job ${job.id}] Assigning modules to subscription tier: ${tierId}`,
    );

    try {
      // 1. Verify tier exists
      const tier = await this.prisma.subscriptionTier.findUnique({
        where: { id: tierId },
      });

      if (!tier) {
        throw new NotFoundException(
          `Subscription tier with ID "${tierId}" not found`,
        );
      }

      // 2. Clear existing modules if requested
      if (clearExisting) {
        await this.prisma.subscriptionModule.deleteMany({
          where: { subscriptionTierId: tierId },
        });
        this.logger.debug(
          `[Job ${job.id}] Cleared existing modules for tier ${tierId}`,
        );
      }

      // 3. Verify all modules exist
      const existingModules = await this.prisma.module.findMany({
        where: { id: { in: moduleIds } },
        select: { id: true, displayName: true },
      });

      if (existingModules.length !== moduleIds.length) {
        const foundIds = existingModules.map((m) => m.id);
        const missingIds = moduleIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `${missingIds.length} module(s) not found: ${missingIds.join(', ')}`,
        );
      }

      // 4. Get existing assignments to avoid duplicates
      const existingAssignments = await this.prisma.subscriptionModule.findMany(
        {
          where: { subscriptionTierId: tierId },
          select: { moduleId: true },
        },
      );
      const existingModuleIds = existingAssignments.map((a) => a.moduleId);

      // 5. Create assignments for new modules only
      const newModuleIds = moduleIds.filter(
        (id) => !existingModuleIds.includes(id),
      );

      if (newModuleIds.length > 0) {
        await this.prisma.subscriptionModule.createMany({
          data: newModuleIds.map((moduleId) => ({
            subscriptionTierId: tierId,
            moduleId,
          })),
        });

        this.logger.debug(
          `[Job ${job.id}] Created ${newModuleIds.length} module assignments for tier ${tierId}`,
        );
      }

      // 6. Fetch updated tier with modules
      const updatedTier = await this.prisma.subscriptionTier.findUnique({
        where: { id: tierId },
        include: {
          subscriptionModules: {
            include: {
              module: {
                select: {
                  id: true,
                  moduleKey: true,
                  displayName: true,
                },
              },
            },
          },
        },
      });
      // Invalidate tier cache and dashboard stats
      await this.cacheService.delete('subscription:packages:all');
      await this.cacheService.delete('subscription:superadmin:stats');

      this.logger.log(
        `[Job ${job.id}] ✓ Successfully assigned ${moduleIds.length} modules to tier "${tier.name}"`,
      );

      return {
        success: true,
        tierId,
        modulesAssigned: moduleIds.length,
        tier: updatedTier,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[Job ${job.id}] ✗ Failed to assign modules to tier ${tierId}: ${errorMsg}`,
        error instanceof Error ? error.stack : '',
      );
      throw error; // Rethrow to trigger retry
    }
  }
}
