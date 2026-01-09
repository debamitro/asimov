/*---------------------------------------------------------------------------------------------
 *  Copyright (c) East Coast Software LLC. All rights reserved.
 *  Licensed under the Apache license. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IBookPrinterService = createDecorator<IBookPrinterService>('BookPrinterService');

export interface IBookPrinterService {
	printPdfBook(htmlPath: string, pdfPath: string): Promise<[boolean, string]>;
}

