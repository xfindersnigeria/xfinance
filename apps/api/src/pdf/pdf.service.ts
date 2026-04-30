import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';
import axios from 'axios';

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: Browser | null = null;
  private launching = false;

  private async getBrowser(): Promise<Browser> {
    if (this.browser) {
      try {
        // Quick liveness check — if browser is gone this throws
        await this.browser.version();
        return this.browser;
      } catch {
        this.logger.warn('Browser instance died, restarting…');
        this.browser = null;
      }
    }

    // Guard against concurrent launch calls
    if (this.launching) {
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (!this.launching) { clearInterval(interval); resolve(); }
        }, 100);
      });
      return this.getBrowser();
    }

    this.launching = true;
    try {
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      this.browser = await puppeteer.launch({
        executablePath: executablePath || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
        ],
        headless: true,
      });
      this.logger.log(`Chromium launched (${executablePath ?? 'bundled'})`);
      this.browser.on('disconnected', () => {
        this.logger.warn('Chromium disconnected — will relaunch on next request');
        this.browser = null;
      });
    } finally {
      this.launching = false;
    }

    return this.browser!;
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close().catch(() => null);
      this.browser = null;
    }
  }

  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 5000,
      });
      const base64 = Buffer.from(response.data).toString('base64');
      const contentType = response.headers['content-type'] || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch {
      return '';
    }
  }

  async generate(templateName: string, data: any): Promise<Buffer> {
    // Load and compile template
    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf8');

    // Register helpers once — idempotent in Handlebars
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('formatDate', (dateValue: any) => {
      if (!dateValue) return '';
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (isNaN(date.getTime())) return String(dateValue);
      return date.toLocaleString('en-GB', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    });
    Handlebars.registerHelper('formatCurrency', (value: any) => {
      const n = Number(value) || 0;
      return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });

    // Fetch logo as base64 so it works offline / in Docker with no external fetch
    if (data.entity?.logo?.secureUrl) {
      data.entity.logo.base64 = await this.fetchImageAsBase64(data.entity.logo.secureUrl);
    }

    const template = Handlebars.compile(templateSource);
    const html = template(data);

    // Inline CSS
    const cssPath = path.join(__dirname, 'styles', 'common.css');
    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
    const htmlWithCss = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(htmlWithCss, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '16px', bottom: '16px', left: '16px', right: '16px' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }
}
