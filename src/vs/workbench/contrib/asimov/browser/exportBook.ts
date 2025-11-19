/*---------------------------------------------------------------------------------------------
 *  Copyright (c) East Coast Software LLC. All rights reserved.
 *  Licensed under the Apache license. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import * as resources from '../../../../base/common/resources.js';
import { VSBuffer } from '../../../../base/common/buffer.js';

export class SaveCurrentBookAction extends Action2 {
	static readonly ID = 'workbench.asimov.saveCurrentBook';
	static readonly LABEL = localize('saveCurrentBook', 'Save Current Book');

	constructor() {
		super({
			id: SaveCurrentBookAction.ID,
			title: SaveCurrentBookAction.LABEL,
			icon: Codicon.save,
			menu: {
				id: MenuId.MenubarFileMenu,
				group: '4_save',
				order: 3
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const fileService = accessor.get(IFileService);
		const workspaceContextService = accessor.get(IWorkspaceContextService);
		const notificationService = accessor.get(INotificationService);
		const fileDialogService = accessor.get(IFileDialogService);

		try {
			const workspace = workspaceContextService.getWorkspace();
			if (!workspace.folders.length) {
				notificationService.warn(localize('noWorkspaceOpen', 'No workspace is open. Please open a book folder first.'));
				return;
			}

			const rootUri = workspace.folders[0].uri;

			// Show save dialog
			const result = await fileDialogService.showSaveDialog({
				title: localize('saveBookAs', 'Save Book As'),
				defaultUri: resources.joinPath(rootUri, 'book.zip'),
				filters: [
					{ name: localize('zipFiles', 'ZIP Files'), extensions: ['zip'] }
				]
			});

			if (!result) {
				return;
			}

			// For now, just create a simple text file indicating the book structure
			// In a real implementation, this would create a ZIP file with the book contents
			const bookStructure = await this.getBookStructure(fileService, rootUri);
			const content = VSBuffer.fromString(JSON.stringify(bookStructure, null, 2));

			await fileService.writeFile(result, content);

			notificationService.info(localize('bookSaved', 'Book saved successfully to {0}', result.fsPath));
		} catch (error) {
			console.error('Error saving book:', error);
			notificationService.error(localize('saveBookError', 'Failed to save book: {0}', String(error)));
		}
	}

	private async getBookStructure(fileService: IFileService, rootUri: any): Promise<any> {
		try {
			const stat = await fileService.resolve(rootUri, { resolveMetadata: true });
			const structure: any = {
				name: stat.name,
				type: 'folder',
				children: []
			};

			if (stat.children) {
				for (const child of stat.children) {
					if (child.name.endsWith('.md')) {
						structure.children.push({
							name: child.name,
							type: 'file',
							size: child.size
						});
					}
				}
			}

			return structure;
		} catch (error) {
			console.error('Error getting book structure:', error);
			return { name: 'Unknown Book', type: 'folder', children: [] };
		}
	}
}

registerAction2(SaveCurrentBookAction);

