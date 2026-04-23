import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';
import axios from 'axios';

@Injectable()
export class PdfService {
  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const base64 = Buffer.from(response.data).toString('base64');
      const contentType = response.headers['content-type'] || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.error('Failed to fetch image:', error);
      return '';
    }
  }

  async generate(templateName: string, data: any): Promise<Buffer> {
    // Load template file
    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf8');

    Handlebars.registerHelper('eq', function(a, b) { return a === b; });

    // Register date formatting helper
    Handlebars.registerHelper('formatDate', function(dateValue) {
      if (!dateValue) return '';
      let date;
      // Handle both Date objects and string dates
      if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        date = new Date(dateValue);
      }
      // Check if date is valid
      if (isNaN(date.getTime())) return String(dateValue);
      return date.toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    });

    // Convert logo to base64 if it exists
    if (data.entity && data.entity.logo && data.entity.logo.secureUrl) {
      const logoBase64 = await this.fetchImageAsBase64(data.entity.logo.secureUrl);
      data.entity.logo.base64 = logoBase64;
    }

    const template = Handlebars.compile(templateSource);
    const html = template(data);

    // Load CSS
    const cssPath = path.join(__dirname, 'styles', 'common.css');
    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
    const htmlWithCss = `<style>${css}</style>${html}`;

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlWithCss, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return Buffer.from(pdf);
  }
}
