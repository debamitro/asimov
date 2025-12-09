/*---------------------------------------------------------------------------------------------
 *  Copyright (c) East Coast Software LLC. All rights reserved.
 *  Licensed under the Apache license. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { IBookPrinterService } from '../common/bookPrinterTypes.js';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { AddressInfo } from 'net';


export class BookPrinterService implements IBookPrinterService {
	constructor(
		@IFileService private readonly fileService: IFileService // <-- injected by VS Code's DI
	) {
	}

	async printPdfBook(htmlPath: string, pdfPath: string): Promise<boolean> {
		return new Promise(async (resolve) => {
			let server: http.Server | null = null;

			try {
				const htmlDir = path.dirname(htmlPath);
				const htmlFile = path.basename(htmlPath);

				// Create a local server to serve the HTML and its assets
				server = http.createServer((req, res) => {
					try {
						let filePath = req.url === '/' ? htmlFile : req.url!.substring(1);
						filePath = path.join(htmlDir, filePath);

						// Security check - ensure file is within the HTML directory
						if (!filePath.startsWith(htmlDir)) {
							res.writeHead(403);
							res.end('Forbidden');
							return;
						}

						// Check if file exists
						if (!fs.existsSync(filePath)) {
							res.writeHead(404);
							res.end('File not found');
							return;
						}

						// Determine content type
						const ext = path.extname(filePath).toLowerCase();
						const contentTypes: { [key: string]: string } = {
							'.html': 'text/html',
							'.css': 'text/css',
							'.js': 'application/javascript',
							'.png': 'image/png',
							'.jpg': 'image/jpeg',
							'.jpeg': 'image/jpeg',
							'.gif': 'image/gif',
							'.svg': 'image/svg+xml'
						};
						const contentType = contentTypes[ext] || 'text/plain';

						// Read and serve file
						const content = fs.readFileSync(filePath);
						res.writeHead(200, { 'Content-Type': contentType });
						res.end(content);
					} catch (error) {
						console.error('Server error:', error);
						res.writeHead(500);
						res.end('Internal Server Error');
					}
				});

				// Start server on a random available port
				await new Promise<void>((resolveServer) => {
					server!.listen(0, 'localhost', () => {
						resolveServer();
					});
				});

				const port = (server.address() as AddressInfo).port;
				const baseUrl = `http://localhost:${port}`;

				const { chromium } = (await import('playwright'));
				if (!chromium) {
					throw new Error("chromium could not be loaded");
				}

				const browser = await chromium.launch();
				const page = await browser.newPage();

				// Load the page from the local server
				await page.goto(baseUrl, { waitUntil: 'networkidle' });

				// Wait for any dynamic content (e.g., Paged.js) to finish processing
				await page.waitForTimeout(2000);

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

				// Take a screenshot before closing the browser
				//const screenshotPath = pdfPath.replace('.pdf', '_preview.png');
				//const screenshotBuffer = await page.screenshot({
				//	fullPage: true,
				//	type: 'png'
				//});

				// Save screenshot using file service
				//const screenshotUri = URI.file(screenshotPath);
				//await this.fileService.writeFile(screenshotUri, VSBuffer.wrap(screenshotBuffer));

				// Close browser
				await browser.close();

				// Save PDF using file service
				const pdfUri = URI.file(pdfPath);
				await this.fileService.writeFile(pdfUri, VSBuffer.wrap(pdfBuffer));

				resolve(true);
			} catch (error) {
				console.error('Error in PDF generation:', error);
				resolve(false);
			} finally {
				// Always close the server
				if (server) {
					server.close();
				}
			}
		});
	}
}

