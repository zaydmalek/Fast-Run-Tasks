import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';

// Cache of compilers we've already confirmed exist, so we only pay the
// exec() cost once per compiler per VS Code session - not on every run.
const verifiedCompilers = new Set<string>();

async function ensureCompilerAvailable(command: string, installHint: string): Promise<boolean> {
    if (verifiedCompilers.has(command)) {
        return true;
    }
    return new Promise((resolve) => {
        exec(`${command} --version`, (error) => {
            if (!error) {
                verifiedCompilers.add(command);
                resolve(true);
            } else {
                vscode.window.showErrorMessage(`❌ '${command}' not found. ${installHint}`);
                resolve(false);
            }
        });
    });
}

// Detects a local virtual environment's python before falling back to the
// system python3/python. Only checks the file's own directory (no upward
// directory walking, to avoid false positives from unrelated venvs).
function getPythonCommand(fileDir: string, isWindows: boolean): string {
    const pythonExe = isWindows ? 'python.exe' : 'python3';
    const venvDirs = ['venv', '.venv', 'env'];

    for (const venvDir of venvDirs) {
        const venvPython = path.join(fileDir, venvDir, isWindows ? 'Scripts' : 'bin', pythonExe);
        if (fs.existsSync(venvPython)) {
            return venvPython;
        }
    }

    return isWindows ? 'python' : 'python3';
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Fast Run extension activated! 🚀');

    const disposable = vscode.commands.registerCommand('quick-run.execute', async () => {
        try {
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

            const config = vscode.workspace.getConfiguration('fastRun');
            const clearTerminal = config.get<boolean>('clearTerminal', true);
            const focusTerminal = config.get<boolean>('focusTerminal', true);

            const filePath = document.fileName;
            const fileDir = path.dirname(filePath);
            const fileName = path.basename(filePath);
            const fileNameNoExt = path.basename(filePath, path.extname(filePath));
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || fileDir;

            const isWindows = process.platform === 'win32';
            const defaultShell = vscode.workspace.getConfiguration('terminal.integrated.defaultProfile').get<string>('windows');
            // FIX: Ensure it correctly defaults to PowerShell on Windows if undefined
            const isPowerShell = isWindows && (!defaultShell || defaultShell.toLowerCase().includes('powershell'));
            const pathSep = isWindows ? ';' : ':';

            let execution: vscode.ShellExecution | undefined;

            switch (languageId) {
                case 'python': {
                    const pythonCmd = getPythonCommand(fileDir, isWindows);
                    if (!pythonCmd.includes(path.sep)) {
                        const ok = await ensureCompilerAvailable(pythonCmd, 'Install Python and add it to PATH.');
                        if (!ok) return;
                    }
                    // FIX: Formatted as a single execution string to avoid quote escaping issues
                    execution = new vscode.ShellExecution(`"${pythonCmd}" "${fileName}"`, { cwd: fileDir });
                    break;
                }

                case 'java': {
                    const ok = await ensureCompilerAvailable('javac', 'Install the JDK and add it to PATH.');
                    if (!ok) return;

                    let classpath = config.get<string>('java.classpath', '').trim();
                    if (!classpath) {
                        const libDir = path.join(fileDir, 'lib');
                        if (fs.existsSync(libDir)) {
                            const jars = fs.readdirSync(libDir)
                                .filter(f => f.endsWith('.jar'))
                                .map(f => path.join(libDir, f));
                            if (jars.length > 0) {
                                classpath = jars.join(pathSep);
                            }
                        }
                    }
                    
                    // FIX: Always include current dir ('.') in classpath so the main class can actually load
                    const cpFlag = classpath ? `-cp ".${pathSep}${classpath}"` : '';

                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    const packageMatch = fileContent.match(/^\s*package\s+([\w.]+)\s*;/m);

                    let command: string;
                    let javaCwd: string;

                    if (packageMatch) {
                        const declaredPackage = packageMatch[1];
                        const fullClassName = `${declaredPackage}.${fileNameNoExt}`;
                        javaCwd = workspaceFolder;
                        command = isPowerShell
                            ? `javac ${cpFlag} "${filePath}"; if ($?) { java ${cpFlag} ${fullClassName} }`
                            : `javac ${cpFlag} "${filePath}" && java ${cpFlag} ${fullClassName}`;
                    } else {
                        javaCwd = fileDir;
                        command = isPowerShell
                            ? `javac ${cpFlag} "${fileName}"; if ($?) { java ${cpFlag} ${fileNameNoExt} }`
                            : `javac ${cpFlag} "${fileName}" && java ${cpFlag} ${fileNameNoExt}`;
                    }

                    execution = new vscode.ShellExecution(command.replace(/\s+/g, ' ').trim(), { cwd: javaCwd });
                    break;
                }

                case 'c': {
                    const ok = await ensureCompilerAvailable('gcc', 'Install GCC (MinGW on Windows) and add it to PATH.');
                    if (!ok) return;

                    const includePaths = config.get<string[]>('c.includePaths', []);
                    const libPaths = config.get<string[]>('c.libPaths', []);
                    const libs = config.get<string[]>('c.libs', []);
                    const extraFlags = config.get<string>('c.flags', '').trim();

                    const includeFlags = includePaths.map(p => `-I"${p}"`).join(' ');
                    const libPathFlags = libPaths.map(p => `-L"${p}"`).join(' ');
                    const libFlags = libs.map(l => `-l${l}`).join(' ');
                    const mathFlag = isWindows ? '' : '-lm';

                    const exeName = isWindows ? `${fileNameNoExt}.exe` : fileNameNoExt;
                    const exePath = path.join(fileDir, exeName);

                    const compileParts = [
                        'gcc', `"${filePath}"`, includeFlags, libPathFlags, libFlags, extraFlags, mathFlag,
                        '-o', `"${exePath}"`
                    ].filter(Boolean).join(' ');

                    const command = isPowerShell
                        ? `${compileParts}; if ($?) { & "${exePath}" }`
                        : `${compileParts} && "${exePath}"`;

                    execution = new vscode.ShellExecution(command, { cwd: fileDir });
                    break;
                }

                case 'cpp': {
                    const ok = await ensureCompilerAvailable('g++', 'Install GCC/G++ (MinGW on Windows) and add it to PATH.');
                    if (!ok) return;

                    // FIX: Check cpp settings first, then fallback to c settings if they don't exist
                    const includePaths = config.get<string[]>('cpp.includePaths', config.get<string[]>('c.includePaths', []));
                    const libPaths = config.get<string[]>('cpp.libPaths', config.get<string[]>('c.libPaths', []));
                    const libs = config.get<string[]>('cpp.libs', config.get<string[]>('c.libs', []));
                    const extraFlags = config.get<string>('cpp.flags', '').trim();

                    const includeFlags = includePaths.map(p => `-I"${p}"`).join(' ');
                    const libPathFlags = libPaths.map(p => `-L"${p}"`).join(' ');
                    const libFlags = libs.map(l => `-l${l}`).join(' ');

                    const exeName = isWindows ? `${fileNameNoExt}.exe` : fileNameNoExt;
                    const exePath = path.join(fileDir, exeName);

                    const compileParts = [
                        'g++', `"${filePath}"`, '-std=c++17', includeFlags, libPathFlags, libFlags, extraFlags,
                        '-o', `"${exePath}"`
                    ].filter(Boolean).join(' ');

                    const command = isPowerShell
                        ? `${compileParts}; if ($?) { & "${exePath}" }`
                        : `${compileParts} && "${exePath}"`;

                    execution = new vscode.ShellExecution(command, { cwd: fileDir });
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
                focus: focusTerminal,
                panel: vscode.TaskPanelKind.Shared,
                clear: clearTerminal,
                showReuseMessage: true,
                echo: false
            };

            task.isBackground = false;
            task.group = vscode.TaskGroup.Build;

            await vscode.tasks.executeTask(task);

        } catch (error: any) {
            vscode.window.showErrorMessage(`❌ Fast Run error: ${error?.message || error}`);
            console.error('Fast Run Error:', error);
        }
    });

    context.subscriptions.push(disposable);

    const hasShownWelcome = context.globalState.get<boolean>('fastRun.hasShownWelcome', false);
    if (!hasShownWelcome) {
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
