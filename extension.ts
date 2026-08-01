import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';

// ✅ Helper: check if compiler exists in PATH
async function checkCompilerExists(command: string): Promise<boolean> {
    return new Promise((resolve) => {
        exec(`${command} --version`, (error) => resolve(!error));
    });
}

// ✅ Helper: detect compiler for language
function detectCompiler(languageId: string): string {
    switch (languageId) {
        case 'c': return 'gcc';
        case 'cpp': return 'g++';
        case 'python': return 'python';
        case 'java': return 'javac';
        default: return '';
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Fast Run extension activated! 🚀');

    const disposable = vscode.commands.registerCommand('quick-run.execute', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('❌ No file is open!');
            return;
        }

        const document = editor.document;
        const languageId = document.languageId;
        const supportedLanguages = ['python', 'java', 'c', 'cpp'];

        if (!supportedLanguages.includes(languageId)) {
            vscode.window.showWarningMessage(`Fast Run doesn't support ${languageId} yet!`);
            return;
        }

        if (document.isDirty) {
            await document.save();
        }

        const filePath = document.fileName;
        const fileDir = path.dirname(filePath);
        const fileName = path.basename(filePath);
        const fileNameNoExt = path.basename(filePath, path.extname(filePath));
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || fileDir;

        // 🧠 Detect compiler dynamically
        const compiler = detectCompiler(languageId);
        const compilerExists = await checkCompilerExists(compiler);
        if (!compilerExists) {
            vscode.window.showErrorMessage(`❌ ${compiler} not found! Please install it or add to PATH.`);
            return;
        }

        // Detect PowerShell or CMD
        const defaultShell = vscode.workspace.getConfiguration('terminal.integrated.defaultProfile').get<string>('windows') || '';
        const isPowerShell = defaultShell.toLowerCase().includes('powershell');

        let execution: vscode.ShellExecution | undefined;

        try {
            switch (languageId) {
                case 'python':
                    execution = new vscode.ShellExecution('python', [fileName], { cwd: fileDir });
                    break;

                case 'java': {
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    const packageMatch = fileContent.match(/^\s*package\s+([\w.]+)\s*;/m);
                    let javaExecution: string;

                    if (packageMatch) {
                        const declaredPackage = packageMatch[1];
                        const javaClass = `${declaredPackage}.${fileNameNoExt}`;
                        javaExecution = isPowerShell
                            ? `javac "${filePath}"; if ($?) { java ${javaClass} }`
                            : `javac "${filePath}" && java ${javaClass}`;
                        execution = new vscode.ShellExecution(
                            isPowerShell ? javaExecution : 'cmd',
                            isPowerShell ? [] : ['/c', javaExecution],
                            { cwd: workspaceFolder }
                        );
                    } else {
                        javaExecution = isPowerShell
                            ? `javac "${fileName}"; if ($?) { java ${fileNameNoExt} }`
                            : `javac "${fileName}" && java ${fileNameNoExt}`;
                        execution = new vscode.ShellExecution(
                            isPowerShell ? javaExecution : 'cmd',
                            isPowerShell ? [] : ['/c', javaExecution],
                            { cwd: fileDir }
                        );
                    }
                    break;
                }

                case 'c': {
                    const exePath = path.join(fileDir, `${fileNameNoExt}.exe`);
                    const cmd = `gcc "${filePath}" -o "${exePath}"`;
                    const fullCmd = isPowerShell
                        ? `${cmd}; if ($?) { & "${exePath}" }`
                        : `${cmd} && "${exePath}"`;
                    execution = new vscode.ShellExecution(
                        isPowerShell ? fullCmd : 'cmd',
                        isPowerShell ? [] : ['/c', fullCmd],
                        { cwd: fileDir }
                    );
                    break;
                }

                case 'cpp': {
                    const exePath = path.join(fileDir, `${fileNameNoExt}.exe`);
                    const cmd = `g++ "${filePath}" -o "${exePath}"`;
                    const fullCmd = isPowerShell
                        ? `${cmd}; if ($?) { & "${exePath}" }`
                        : `${cmd} && "${exePath}"`;
                    execution = new vscode.ShellExecution(
                        isPowerShell ? fullCmd : 'cmd',
                        isPowerShell ? [] : ['/c', fullCmd],
                        { cwd: fileDir }
                    );
                    break;
                }
            }

            if (!execution) return;

            const task = new vscode.Task(
                { type: 'fast-run', task: `run-${languageId}` },
                vscode.TaskScope.Workspace,
                `Fast Run - ${languageId}`,
                'fast-run',
                execution,
                []
            );

            task.presentationOptions = {
                reveal: vscode.TaskRevealKind.Always,
                focus: true,
                panel: vscode.TaskPanelKind.Shared,
                clear: true,
                showReuseMessage: true,
                echo: false
            };

            task.isBackground = false;
            task.group = vscode.TaskGroup.Build;

            vscode.tasks.executeTask(task);
        } catch (error: any) {
            vscode.window.showErrorMessage(`❌ Error running ${languageId.toUpperCase()} file: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);

    const hasShownWelcome = context.globalState.get<boolean>('fastRun.hasShownWelcome', true);
    if (hasShownWelcome) {
        vscode.window.showInformationMessage(
            '🚀 Fast Run is ready! Press Shift+` to run your code instantly.',
            'Got it!'
        ).then(() => {
            context.globalState.update('fastRun.hasShownWelcome', true);
        });
    }
}

export function deactivate() {
    console.log('Fast Run extension deactivated!');
}
