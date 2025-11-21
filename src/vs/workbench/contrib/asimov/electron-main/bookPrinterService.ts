/*---------------------------------------------------------------------------------------------
 *  Copyright (c) East Coast Software LLC. All rights reserved.
 *  Licensed under the Apache license. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { IBookPrinterService } from '../common/bookPrinterTypes.js';


export class BookPrinterService implements IBookPrinterService {
	constructor(
		@IFileService private readonly fileService: IFileService // <-- injected by VS Code's DI
	) {
	}

	async printPdfBook(htmlPath: string, pdfPath: string): Promise<boolean> {
		return new Promise(async (resolve) => {
			try {
				const htmlUri = URI.file(htmlPath);
				const htmlFileContent = await this.fileService.readFile(htmlUri);
				const htmlContent = htmlFileContent.value.toString();

				const { chromium } = (await import('playwright'));
				if (!chromium) {
					throw new Error("chromium could not be loaded");
				}

				const browser = await chromium.launch();

				const page = await browser.newPage();

				// Set content and generate PDF
				await page.setContent(htmlContent, { waitUntil: 'networkidle' });
				const pdfBuffer = await page.pdf({
					format: 'A4',
					printBackground: true,
					margin: {
						top: '1cm',
						right: '1cm',
						bottom: '1cm',
						left: '1cm'
					}
				});

				// Close browser
				await browser.close();

				// Save PDF using file service
				const pdfUri = URI.file(pdfPath);
				await this.fileService.writeFile(pdfUri, VSBuffer.wrap(pdfBuffer));

				resolve(true);
			} catch (error) {
				console.error('Error in Puppeteer PDF generation:', error);
				resolve(false);
			}
		});
	}
}

