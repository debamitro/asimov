/*---------------------------------------------------------------------------------------------
 *  Copyright (c) East Coast Software LLC. All rights reserved.
 *  Licensed under the Apache license. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from '../../../base/common/buffer.js';
import { URI } from '../../../base/common/uri.js';
import { type ServicesAccessor } from '../../../editor/browser/editorExtensions.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { IWorkspace, IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { IHostService } from '../../services/host/browser/host.js';
import * as resources from '../../../base/common/resources.js';

const getBookRootURI = async (accessor: ServicesAccessor, workspace: IWorkspace): Promise<URI | null> => {
	if (!workspace.folders.length) {
		// Open a dialog to choose the folder for the new book
		const fileDialogService = accessor.get(IFileDialogService);
		const result = await fileDialogService.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			title: 'Location for new book'
		});

		if (!result || result.length === 0) {
			return null;
		}

		return result[0];
	}
	else {
		return workspace.folders[0].uri;
	}
};

export const createNewProjectWithMarkdown = async (accessor: ServicesAccessor) => {
	const fileService = accessor.get(IFileService);
	const workspaceContextService = accessor.get(IWorkspaceContextService);
	const notificationService = accessor.get(INotificationService);
	const hostService = accessor.get(IHostService);

	try {
		// Get the workspace root folder
		const workspace = workspaceContextService.getWorkspace();
		const rootUri = await getBookRootURI(accessor, workspace);
		if (!rootUri) {
			notificationService.info('Folder selection cancelled. Book creation aborted.');
			return;
		}

		// Generate a unique book name
		const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
		const projectName = `book-${timestamp}-${Math.random().toString(36).substr(2, 8)}`;
		const projectUri = resources.joinPath(rootUri, projectName);

		// Create the project folder
		await fileService.createFolder(projectUri);

		// Define markdown files to create
		const markdownFiles = [
			{
				name: 'Cover.md',
				content: `# ${projectName}`
			},
			{
				name: 'Back cover.md',
				content: `# ${projectName}`
			},
			{
				name: 'Foreword.md',
				content: `# ${projectName}

## Foreword


`
			},
			{
				name: 'Introduction.md',
				content: `# ${projectName}

## Introduction

<Introduce your readers to your overall idea here>
`
			},
			{
				name: 'chapters/chap_01.md',
				content: `# Chapter 1

## Overview

`
			},
			{
				name: 'chapters/chap_02.md',
				content: `# Chapter 2

`
			},
			{
				name: 'Glossary.md',
				content: `# Glossary
`
			}
		];

		// Create docs folder first
		const docsUri = resources.joinPath(projectUri, 'chapters');
		await fileService.createFolder(docsUri);

		// Create all markdown files
		for (const file of markdownFiles) {
			let fileUri: URI;
			if (file.name.startsWith('chapters/')) {
				fileUri = resources.joinPath(docsUri, file.name.replace('chapters/', ''));
			} else {
				fileUri = resources.joinPath(projectUri, file.name);
			}

			const content = VSBuffer.fromString(file.content);
			await fileService.writeFile(fileUri, content);
		}

		notificationService.info(`New book "${projectName}" created successfully!`);

		if (!workspace.folders.length) {
			await hostService.openWindow([{ folderUri: rootUri }], { forceReuseWindow: true });
		}

	} catch (error) {
		console.error('Error creating project:', error);
		notificationService.error(`Failed to create project: ${error}`);
	}
};
