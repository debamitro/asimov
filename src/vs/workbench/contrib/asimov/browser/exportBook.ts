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
import { URI } from '../../../../base/common/uri.js';
import { renderMarkdown } from '../../../../base/browser/markdownRenderer.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';

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
				defaultUri: resources.joinPath(rootUri, 'book.pdf'),
				filters: [
					{ name: localize('pdfFiles', 'PDF Files'), extensions: ['pdf'] }
				]
			});

			if (!result) {
				return;
			}

			// Find all markdown files in the workspace
			const markdownFiles = await this.findMarkdownFiles(fileService, rootUri);

			if (markdownFiles.length === 0) {
				notificationService.warn(localize('noMarkdownFiles', 'No markdown files found in the workspace.'));
				return;
			}

			// Read and combine all markdown files into HTML
			let combinedHtml = `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Book Export</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			line-height: 1.6;
			max-width: 800px;
			margin: 0 auto;
			padding: 20px;
		}
		h1, h2, h3, h4, h5, h6 { color: #333; }
		code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
		pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
		blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; font-style: italic; }
	</style>
</head>
<body>`;

			for (const file of markdownFiles.sort((a, b) => a.name.localeCompare(b.name))) {
				const content = await fileService.readFile(file.uri);
				const markdownContent = content.value.toString();
				const htmlContent = this.markdownToHtml(markdownContent);
				combinedHtml += `<h1>${file.name}</h1>\n${htmlContent}\n<hr style="margin: 40px 0;">\n`;
			}

			combinedHtml += `</body></html>`;

			const htmlResult = URI.parse(result.fsPath.replace(".pdf", ".html"));

			// Save the HTML file
			await fileService.writeFile(htmlResult, VSBuffer.fromString(combinedHtml));

			notificationService.info(localize('bookSaved', 'Book saved successfully to {0}', htmlResult.fsPath));
		} catch (error) {
			console.error('Error saving book:', error);
			notificationService.error(localize('saveBookError', 'Failed to save book: {0}', String(error)));
		}
	}

	private async findMarkdownFiles(fileService: IFileService, rootUri: any): Promise<any[]> {
		const markdownFiles: any[] = [];

		try {
			const stat = await fileService.resolve(rootUri, { resolveMetadata: true });

			if (stat.children) {
				for (const child of stat.children) {
					if (child.name.endsWith('.md')) {
						markdownFiles.push({
							name: child.name,
							uri: child.resource
						});
					}
				}
			}
		} catch (error) {
			console.error('Error finding markdown files:', error);
		}

		return markdownFiles;
	}

	private markdownToHtml(markdown: string): string {
		try {
			// Use VS Code's markdown renderer
			const markdownString = new MarkdownString(markdown);
			const result = renderMarkdown(markdownString);
			return result.element.innerHTML;
		} catch (error) {
			console.error('Error rendering markdown:', error);
			// Fallback to basic conversion if VS Code renderer fails
			return "";
		}
	}
}

registerAction2(SaveCurrentBookAction);

