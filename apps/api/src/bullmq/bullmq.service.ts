import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class BullmqService {
  constructor(@InjectQueue('default') private readonly queue: Queue) {}
  async addJob(name: string, data: any, options?: any): Promise<void> {
    await this.queue.add(name, data, options);
  }

  /**
   * Remove all jobs from the queue (active, waiting, delayed, completed, failed, etc.)
   */
  async emptyQueue(): Promise<void> {
    await this.queue.drain(true); // true = also remove delayed jobs
    await this.queue.clean(0, 1000, 'completed');
    await this.queue.clean(0, 1000, 'failed');
    await this.queue.clean(0, 1000, 'wait');
    await this.queue.clean(0, 1000, 'active');
    await this.queue.clean(0, 1000, 'delayed');
  }
}
