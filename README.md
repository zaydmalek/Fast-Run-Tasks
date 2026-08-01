<div align="center">
  <img src="images/icon.ico" alt="Fast Run Tasks Icon" width="128">
  <h1>Fast-Run-Tasks</h1>
</div>

Instantly run Python, Java, C, and C++ with one keypress — zero config, clean output, smart Java package detection.
## ✨ Features at a Glance

  

🚀 **Zero Configuration** - Install and start running code immediately

🧹 **Clean Output** - No terminal clutter, just your program's output

🎯 **Smart Java** - Automatically detects packages and handles classpath

⚡ **Two Shortcuts** - Use (Shift+`)

🔄 **Fresh Compilation** - Always recompiles to avoid stale output

🖥️ **Cross-Platform** - Works with PowerShell and CMD seamlessly

  

## 🎯 Why Fast Run?

  

Stop wasting time typing commands. Just press **Shift + `** and watch your code run with clean output.

  

- ✅ **Zero Configuration** - Works right after installation

- ✅ **Clean Terminal** - No command clutter, just your output

- ✅ **Smart Java Handling** - Automatically detects packages

- ✅ **Cross-Shell Support** - Works with PowerShell and CMD

- ✅ **Always Fresh** - Recompiles before running (no stale output)

  

## 🚀 Quick Start

  

1.  **Install the extension**

2. Open any Python, Java, C, or C++ file

3. Press **Shift + `** (Shift + Backtick)

4. Done! Your code runs instantly

  

## 📋 Supported Languages
  | Language | Command | Auto-Compile |
|----------|---------|--------------|
| **Python** | `python file.py` | ✅ Yes|
| **Java** | `javac + java` | ✅ Yes |
| **C** | `gcc + run` | ✅ Yes |
| **C++** | `g++ + run` | ✅ Yes |
## 💡 Features

  

### Smart Java Compilation

- Automatically detects if your file has a `package` declaration

- Handles both simple files and package structures

- No more "wrong name" errors!

  

```java

// Simple file (no package) - Works!

class  MyClass { }

  

// Package structure - Also works!

package com.example;

class  MyClass { }

```

  

### Clean Output

Unlike other extensions, Fast Run gives you **only what matters**:

- ❌ No "Running [file]..." messages

- ❌ No path spam in terminal

- ✅ Just your code's output

  

### Compilation Errors?

If your code has errors, it **won't run** - you'll see the error immediately.
 
 ## ⚙️ Settings

You can easily customize how **Fast Run** behaves to suit your workflow. 
Open your VS Code Settings by pressing `Ctrl + ,` (Windows/Linux) or `Cmd + ,` (Mac), and search for **Fast Run**.

Alternatively, you can add these directly to your `settings.json` file:

```json
{
  "fastRun.clearTerminal": true,
  "fastRun.focusTerminal": true
}
```
### 🔧 Available Configurations:

*   **`fastRun.clearTerminal`** (Default: `true`)
    *   **What it does:** Automatically clears the terminal window before every new run.
    *   **Why it's useful:** It keeps your workspace clean so you only see the fresh output of your current code, without getting confused by previous runs. 
    *   **Pro Tip:** Set it to `false` if you want to keep your terminal history and compare your new output with the old one.

*   **`fastRun.focusTerminal`** (Default: `true`)
    *   **What it does:** Automatically moves your cursor and focus to the terminal as soon as you press the run shortcut.
    *   **Why it's useful:** Perfect for programs that require user input (like `input()` in Python or `scanf` in C). You can start typing immediately without having to click on the terminal first.
    *   **Pro Tip:** Set it to `false` if you just want to see the output in the background while your cursor stays in the code editor so you can keep typing.

  

## 🎮 Keyboard Shortcuts
| Shortcut | Action | Supported Extensions |
|----------|--------|----------------------|
| **Shift + \`** | Run current file | `.py`, `.java`, `.c`, `.cpp` |
*this shortcut work automatically for `.py`, `.java`, `.c`, and `.cpp` files!*

## 📦 Requirements

  

Make sure these are installed and in your PATH:

  

-  **Python**: `python` command

-  **Java**: `javac` and `java` (JDK)

-  **C/C++**: `gcc` compiler (MinGW on Windows)

  

## 🐛 Troubleshooting

  

**"Command not found"?**

- Verify the compiler is installed

- Check it's in your system PATH

- Restart VS Code after installing

  

**Java package errors?**

- The extension auto-detects packages from your code

- Make sure your package declaration matches your folder structure

  

**Terminal not clearing?**

- Change setting: `"fastRun.clearTerminal": false`

  

## 🎓 Perfect For

  

- 👨‍🎓 **Students** learning programming

- 🏃 **Competitive programmers** practicing problems

- 🧪 **Developers** testing quick code snippets

- 👩‍🏫 **Teachers** demonstrating code in class

  

## 🤝 Contributing

Found a bug? Want a feature? Open an issue on [GitHub](#)!

## 📄 License

MIT License - Free to use, modify, and distribute!
  
## 💬 Feedback

Issues? Let me know and I'll fix them ASAP!

---

*Stop configuring. Start coding.* ⚡
