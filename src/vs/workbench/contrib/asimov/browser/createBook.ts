/*---------------------------------------------------------------------------------------------
 *  Copyright (c) East Coast Software LLC. All rights reserved.
 *  Licensed under the Apache license. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize, localize2 } from '../../../../nls.js';
import { EnterMultiRootWorkspaceSupportContext } from '../../../common/contextkeys.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { createNewProjectWithMarkdown } from '../common/asimov.js';


export class CreateBookAction extends Action2 {

	static readonly ID = 'workbench.action.createBook';

	constructor() {
		super({
			id: CreateBookAction.ID,
			title: localize2('createBook', 'Create Book...'),
			f1: true,
			precondition: EnterMultiRootWorkspaceSupportContext
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		// Implementation for creating a book will be added here
		// This is a placeholder for the actual functionality
		console.log('Create Book action triggered');
		createNewProjectWithMarkdown(accessor);
	}
}

registerAction2(CreateBookAction);

MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
	group: '1_new',
	command: {
		id: CreateBookAction.ID,
		title: localize('createBook', "New Book...")
	},
	order: 2,
	when: EnterMultiRootWorkspaceSupportContext
});
