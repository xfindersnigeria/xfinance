import {
  BadRequestException,
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CreateJournalDto, UpdateJournalDto } from './dto/journal.dto';
import { generateJournalReference } from '@/auth/utils/helper';
import { PrismaService } from '@/prisma/prisma.service';
import { BullmqService } from '@/bullmq/bullmq.service';
import { Journal } from 'prisma/generated/client';

@Injectable()
export class JournalService {
  constructor(
    private prisma: PrismaService,
    private bullmqService: BullmqService,
  ) {}

  async create(dto: any): Promise<Journal> {
    try {
      // Validate entity exists
      // const entity = await this.prisma.entity.findUnique({
      //   where: { id: dto.entityId },
      //   select: { id: true, groupId: true },
      // });

      // if (!entity) {
      //   throw new BadRequestException('Entity not found');
      // }

      // Calculate totals
      const totalDebit = dto.lines.reduce(
        (sum, line) => sum + (line.debit || 0),
        0,
      );
      const totalCredit = dto.lines.reduce(
        (sum, line) => sum + (line.credit || 0),
        0,
      );

      // Validate journal balances
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        throw new BadRequestException('Journal is not balanced: debit ≠ credit');
      }

      // Resolve and validate all accounts
      const accountIds = dto.lines.map((line) => line.accountId);
      const accounts = await this.prisma.account.findMany({
        where: {
          id: { in: accountIds },
          entityId: dto.entityId,
        },
        include: {
          subCategory: {
            include: {
              category: {
                include: {
                  type: true,
                },
              },
            },
          },
        },
      });

      // Check if all accounts were found
      if (accounts.length !== accountIds.length) {
        const foundIds = accounts.map((a) => a.id);
        const missingIds = accountIds.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(
          `Accounts not found: ${missingIds.join(', ')}`,
        );
      }

      const accountMap = new Map(accounts.map((acc) => [acc.id, acc]));

      // Generate reference
      const reference = generateJournalReference();

      // Create journal record (save with all line data)
      const journal = await this.prisma.journal.create({
        data: {
          description: dto.description || `Journal Entry - ${reference}`,
          date: new Date(dto.date),
          lines: dto.lines as any, // Store lines with per-line descriptions
          reference,
          entityId: dto.entityId,
          groupId: dto.groupId,
          status: dto.status || 'Active', // Draft or Active (default)
        },
      });

      // Only queue posting if status is Active (not Draft)
      if (journal.status === 'Active') {
        // Queue journal posting to BullMQ (async account balance updates)
        await this.bullmqService.addJob('post-manual-journal', {
          journalId: journal.id,
          entityId: dto.entityId,
          groupId: dto.groupId,
          lines: dto.lines,
          accountMap: Array.from(accountMap.entries()).map(([id, acc]) => ({
            id,
            account: acc,
          })),
        });
      }

      return journal;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        `Failed to create journal: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Activate a draft journal - transitions from Draft to Active
   * This triggers the journal posting to account balances
   */
  async activateDraftJournal(
    journalId: string,
    entityId: string,
    groupId: string,
  ): Promise<Journal> {
    try {
      // Get the journal
      const journal = await this.findOne(journalId, entityId);

      // Check if already active
      if (journal.status !== 'Draft') {
        throw new BadRequestException(
          `Only Draft journals can be activated. Current status: ${journal.status}`,
        );
      }

      // Get lines from the journal
      const lines = journal.lines as any[];

      // Resolve and validate all accounts
      const accountIds = lines.map((line) => line.accountId);
      const accounts = await this.prisma.account.findMany({
        where: {
          id: { in: accountIds },
          entityId,
        },
        include: {
          subCategory: {
            include: {
              category: {
                include: {
                  type: true,
                },
              },
            },
          },
        },
      });

      // Check if all accounts still exist
      if (accounts.length !== accountIds.length) {
        const foundIds = accounts.map((a) => a.id);
        const missingIds = accountIds.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(
          `Accounts not found: ${missingIds.join(', ')}`,
        );
      }

      const accountMap = new Map(accounts.map((acc) => [acc.id, acc]));

      // Update journal status to Active
      const updatedJournal = await this.prisma.journal.update({
        where: { id: journalId },
        data: { status: 'Active' },
      });

      // Queue journal posting to BullMQ
      await this.bullmqService.addJob('post-manual-journal', {
        journalId,
        entityId,
        groupId,
        lines: lines,
        accountMap: Array.from(accountMap.entries()).map(([id, acc]) => ({
          id,
          account: acc,
        })),
      });

      return updatedJournal;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        `Failed to activate journal: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(entityId: string): Promise<Journal[]> {
    return this.prisma.journal.findMany({
      where: { entityId },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, entityId: string): Promise<Journal> {
    const journal = await this.prisma.journal.findFirst({
      where: {
        id,
        entityId,
      },
    });

    if (!journal) {
      throw new NotFoundException(`Journal with ID ${id} not found`);
    }

    return journal;
  }

  async update(
    id: string,
    dto: UpdateJournalDto,
    entityId: string,
  ): Promise<Journal> {
    const journal = await this.findOne(id, entityId); // check existence

    return this.prisma.journal.update({
      where: { id },
      data: {
        description: dto.description,
        date: dto.date ? new Date(dto.date) : journal.date,
        lines: dto.lines ? (dto.lines as any) : journal.lines,
      },
    });
  }

  async remove(id: string, entityId: string): Promise<void> {
    await this.findOne(id, entityId);
    await this.prisma.journal.delete({ where: { id } });
  }

  // Optional: get journals by reference
  async findByReference(
    reference: string,
    entityId?: string,
  ): Promise<Journal[]> {
    return this.prisma.journal.findMany({
      where: {
        reference,
        ...(entityId && { entityId }),
      },
    });
  }
}
