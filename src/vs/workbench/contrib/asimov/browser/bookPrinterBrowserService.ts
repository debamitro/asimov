/*---------------------------------------------------------------------------------------------
 *  Copyright (c) East Coast Software LLC. All rights reserved.
 *  Licensed under the Apache license. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IBookPrinterService } from '../common/bookPrinterTypes.js';
import { ISandboxGlobals } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';

export class BookPrinterBrowserService implements IBookPrinterService {
	
	constructor() {}

	async printPdfBook(htmlPath: string, pdfPath: string): Promise<boolean> {
		const globals = (globalThis as any).vscode as ISandboxGlobals | undefined;
		if (globals?.ipcRenderer) {
			return globals.ipcRenderer.invoke('vscode:asimov-printPdf', htmlPath, pdfPath);
		}
		throw new Error('IPC not available in browser context');
	}
}

registerSingleton(IBookPrinterService, BookPrinterBrowserService, InstantiationType.Delayed);