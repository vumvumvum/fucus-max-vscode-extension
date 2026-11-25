const vscode = require('vscode');
const run = id => vscode.commands.executeCommand('workbench.action.' + id);
let undo = [];
let busy = false;
let origin;
const focusCommands = {
    editor: 'focusActiveEditorGroup',
    sidebar: 'focusSideBar',
    secondary: 'focusAuxiliaryBar',
    panel: 'focusPanel'
};

function focusOrigin() {
    if (origin.view === 'chatgpt.sidebarSecondaryView') {
        return vscode.commands.executeCommand('chatgpt.sidebarSecondaryView.focus');
    }
    return run(focusCommands[origin.area]);
}

async function change(command, reverse = command) {
    await run(command);
    undo.push(reverse);
}

async function restore() {
    while (undo.length) {
        await run(undo[undo.length - 1]);
        undo.pop();
    }
    if (origin) {
        await focusOrigin();
        origin = undefined;
    }
    await vscode.commands.executeCommand('setContext', 'focusMax.active', false);
}

async function toggle(state) {
    if (busy) return;
    busy = true;
    try {
        if (undo.length || !state) return await restore();
        const { area } = state;
        origin = state;
        if (area === 'secondary') {
            await change('toggleMaximizedAuxiliaryBar');
            await focusOrigin();
        } else {
            if (state.sideBarVisible) await change('toggleSidebarVisibility');
            if (state.auxiliaryBarVisible) await change('toggleAuxiliaryBar');
            if (state.panelVisible) await change('togglePanel');
            if (area === 'panel') {
                if (state.align !== 'center') {
                    await change('alignPanelCenter', 'alignPanel' + state.align[0].toUpperCase() + state.align.slice(1));
                }
                if (!state.panelMaximized) await change('toggleMaximizedPanel');
                await run('focusPanel');
            } else if (area === 'sidebar') {
                await run('focusSideBar');
                for (let i = 0; i < 80; i++) await change('increaseViewSize', 'decreaseViewSize');
            } else {
                await run('focusActiveEditorGroup');
            }
        }
        if (!undo.length) origin = undefined;
        await vscode.commands.executeCommand('setContext', 'focusMax.active', undo.length > 0);
    } catch (error) {
        await restore();
        throw error;
    } finally {
        busy = false;
    }
}

exports.activate = context => context.subscriptions.push(vscode.commands.registerCommand('focusMax.toggle', toggle));

