import {execa} from 'execa';
import {BrewData} from './collect-brew';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import * as readline from 'readline';

export interface InstallOptions {
    useProfile?: boolean;
    brewPrefix?: string;
    pauseOnError?: boolean;
    logFile?: string;
    timeout?: number;  // timeout in milliseconds
    progressFile?: string;  // file to track installation progress
    resume?: boolean;  // whether to resume from previous progress
}

export interface BrewInstallResult {
    brewPath: string;
    brewPrefix: string;
}

interface InstallProgress {
    completedTaps: string[];
    completedFormulae: string[];
    completedCasks: string[];
    failedTaps: string[];
    failedFormulae: string[];
    failedCasks: string[];
    nameChanges: { [originalName: string]: string };  // Track name mappings
    lastUpdated: string;
}

export class BrewInstaller {
    private brewPath: string = 'brew';
    private brewPrefix?: string;
    private logStream?: fs.WriteStream;
    private failedFormulae: string[] = [];
    private failedCasks: string[] = [];
    private progress: InstallProgress = {
        completedTaps: [],
        completedFormulae: [],
        completedCasks: [],
        failedTaps: [],
        failedFormulae: [],
        failedCasks: [],
        nameChanges: {},
        lastUpdated: new Date().toISOString()
    };
    
    private async promptOnError(): Promise<boolean> {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('\nPress Enter to continue or type "cancel" to stop installation: ', (answer) => {
                rl.close();
                if (answer.toLowerCase() === 'cancel') {
                    console.log('❌ Installation cancelled by user.');
                    process.exit(1);
                }
                resolve(true);
            });
        });
    }
    
    private async promptForAlternative(originalName: string, suggestedName: string, type: 'formula' | 'cask'): Promise<'yes' | 'no' | 'skip'> {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            console.log(`\n🤔 ${type.charAt(0).toUpperCase() + type.slice(1)} '${originalName}' not found, but '${suggestedName}' is available.`);
            rl.question('Install the suggested alternative? (y/n/s for skip): ', (answer) => {
                rl.close();
                const response = answer.toLowerCase().trim();
                if (response === 'y' || response === 'yes') {
                    resolve('yes');
                } else if (response === 's' || response === 'skip') {
                    resolve('skip');
                } else {
                    resolve('no');
                }
            });
        });
    }
    
    private async log(message: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        
        if (this.logStream) {
            this.logStream.write(logMessage);
        }
    }
    
    private async loadProgress(progressFile: string): Promise<InstallProgress> {
        try {
            if (await fs.pathExists(progressFile)) {
                const progressData = await fs.readJson(progressFile);
                console.log(`📊 Resuming from previous progress (${progressData.lastUpdated})`);
                
                // Ensure all required properties exist (for backward compatibility)
                return {
                    completedTaps: progressData.completedTaps || [],
                    completedFormulae: progressData.completedFormulae || [],
                    completedCasks: progressData.completedCasks || [],
                    failedTaps: progressData.failedTaps || [],
                    failedFormulae: progressData.failedFormulae || [],
                    failedCasks: progressData.failedCasks || [],
                    nameChanges: progressData.nameChanges || {},
                    lastUpdated: progressData.lastUpdated || new Date().toISOString()
                };
            }
        } catch (error) {
            console.warn('⚠️  Could not load progress file, starting fresh');
        }
        
        return {
            completedTaps: [],
            completedFormulae: [],
            completedCasks: [],
            failedTaps: [],
            failedFormulae: [],
            failedCasks: [],
            nameChanges: {},
            lastUpdated: new Date().toISOString()
        };
    }
    
    private async saveProgress(progressFile: string): Promise<void> {
        try {
            this.progress.lastUpdated = new Date().toISOString();
            await fs.writeJson(progressFile, this.progress, { spaces: 2 });
        } catch (error) {
            console.warn('⚠️  Could not save progress file:', error);
        }
    }
    
    private async runBrewCommand(args: string[], name: string, timeout?: number, showOutput: boolean = true): Promise<void> {
        const startTime = Date.now();
        await this.log(`Starting: brew ${args.join(' ')} for ${name}`);
        
        try {
            // Set default timeout of 5 minutes per package
            const commandTimeout = timeout || 300000;
            
            // Show detailed progress
            console.log(`     ⏳ Downloading and installing ${name}...`);
            
            const childProcess = execa(this.brewPath, args, {
                timeout: commandTimeout,
                killSignal: 'SIGTERM'
            });
            
            // Stream output in real-time if requested
            if (showOutput && childProcess.stdout) {
                childProcess.stdout.on('data', (data) => {
                    const lines = data.toString().split('\n').filter((line: string) => line.trim());
                    lines.forEach((line: string) => {
                        // Filter and format brew output
                        if (line.includes('Downloading')) {
                            console.log(`        📥 ${line.trim()}`);
                        } else if (line.includes('Pouring') || line.includes('Installing')) {
                            console.log(`        📦 ${line.trim()}`);
                        } else if (line.includes('==>')) {
                            console.log(`        ➜ ${line.trim()}`);
                        } else if (line.includes('%')) {
                            // Show download progress
                            process.stdout.write(`\r        ${line.trim()}`);
                        }
                        
                        // Log everything
                        this.log(`Output: ${line}`);
                    });
                });
            }
            
            if (showOutput && childProcess.stderr) {
                childProcess.stderr.on('data', (data) => {
                    const lines = data.toString().split('\n').filter((line: string) => line.trim());
                    lines.forEach((line: string) => {
                        if (!line.includes('Warning:')) {  // Skip warnings in console
                            console.log(`        ⚠️  ${line.trim()}`);
                        }
                        this.log(`Stderr: ${line}`);
                    });
                });
            }
            
            const result = await childProcess;
            
            const duration = Date.now() - startTime;
            const durationSec = (duration / 1000).toFixed(1);
            console.log(`     ✅ ${name} installed successfully (${durationSec}s)`);
            await this.log(`Success: ${name} installed in ${duration}ms`);
            
        } catch (error: any) {
            const duration = Date.now() - startTime;
            
            if (error.timedOut) {
                const timeoutMin = (timeout || 300000) / 60000;
                await this.log(`Timeout: ${name} timed out after ${timeoutMin} minutes`);
                throw new Error(`Installation timed out after ${timeoutMin} minutes. The package may be stuck or taking too long to download.`);
            }
            
            await this.log(`Failed: ${name} after ${duration}ms - ${error.stderr || error.message}`);
            throw error;
        }
    }
    
    async install(brewData: BrewData, options: InstallOptions = {}): Promise<BrewInstallResult> {
        const installStartTime = Date.now();
        console.log('🍺 Starting Homebrew installation process...');
        console.log('═'.repeat(60));
        
        // Initialize progress tracking
        const progressFile = options.progressFile || path.join(process.cwd(), '.brew-install-progress.json');
        this.progress = options.resume ? await this.loadProgress(progressFile) : {
            completedTaps: [],
            completedFormulae: [],
            completedCasks: [],
            failedTaps: [],
            failedFormulae: [],
            failedCasks: [],
            nameChanges: {},
            lastUpdated: new Date().toISOString()
        };
        
        if (options.resume) {
            console.log(`🔄 Resume mode: Will skip ${this.progress.completedTaps.length + this.progress.completedFormulae.length + this.progress.completedCasks.length} already completed items`);
        }
        
        // Set up logging if requested
        if (options.logFile) {
            const logPath = path.resolve(options.logFile);
            await fs.ensureDir(path.dirname(logPath));
            this.logStream = fs.createWriteStream(logPath, { flags: 'a' });
            console.log(`📝 Logging to: ${logPath}`);
            await this.log('=== Homebrew Installation Started ===');
            if (options.resume) {
                await this.log('Resuming from previous progress');
            }
        }
        
        // Check for Xcode Command Line Tools first (macOS only)
        if (process.platform === 'darwin') {
            console.log('Checking for Xcode Command Line Tools...');
            try {
                // Check if CLT is installed by looking for git
                await execa('xcode-select', ['-p']);
                console.log('✅ Xcode Command Line Tools are installed');
            } catch {
                console.log('📦 Xcode Command Line Tools not found.');
                console.log('   Installing Xcode Command Line Tools (this may take a while)...');
                console.log('   A dialog may appear asking you to install the tools.');
                
                try {
                    // This will prompt a GUI dialog on macOS
                    await execa('xcode-select', ['--install']);
                    
                    console.log('\n⏳ Waiting for Xcode Command Line Tools installation to complete...');
                    console.log('   Please follow the prompts in the installation dialog.');
                    console.log('   Press Enter when the installation is complete...');
                    
                    // Wait for user to confirm installation is complete
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
                    
                    await new Promise((resolve) => {
                        rl.question('', () => {
                            rl.close();
                            resolve(undefined);
                        });
                    });
                    
                    console.log('✅ Xcode Command Line Tools installation confirmed');
                } catch (error: any) {
                    if (error.stderr && error.stderr.includes('already installed')) {
                        console.log('✅ Xcode Command Line Tools are already installed');
                    } else {
                        console.warn('⚠️  Could not install Xcode Command Line Tools automatically');
                        console.warn('   Please install manually with: xcode-select --install');
                        console.warn('   Some features may not work without these tools');
                        
                        if (options.pauseOnError !== false) {
                            await this.promptOnError();
                        }
                    }
                }
            }
        }
        
        if (options.useProfile) {
            this.brewPrefix = options.brewPrefix || path.join(os.homedir(), 'homebrew');
            this.brewPath = path.join(this.brewPrefix, 'bin', 'brew');
            console.log(`Using profile-specific Homebrew at: ${this.brewPrefix}`);
        } else {
            // Detect system Homebrew location
            if (process.arch === 'arm64') {
                this.brewPrefix = '/opt/homebrew';
                this.brewPath = '/opt/homebrew/bin/brew';
            } else {
                this.brewPrefix = '/usr/local';
                this.brewPath = '/usr/local/bin/brew';
            }
        }
        
        // Check if brew is installed
        try {
            await execa(this.brewPath, ['--version']);
        } catch {
            console.log('Homebrew not found. Installing Homebrew...');
            if (options.useProfile) {
                await this.installHomebrewProfile();
            } else {
                await this.installHomebrewSystem();
            }
        }
        
        // Git should now be available via Xcode Command Line Tools
        
        // Update brew (skip if it fails - might be network issues or fresh install)
        console.log('Updating Homebrew...');
        try {
            await execa(this.brewPath, ['update']);
        } catch (error: any) {
            console.warn('⚠️  Homebrew update failed (this is often normal for new installations)');
            console.warn(`   Error: ${error.message}`);
            console.log('   Continuing with installation...');
        }
        
        // Install taps (always attempt to add them, brew tap is idempotent)
        if (brewData.taps && brewData.taps.length > 0) {
            console.log(`\n🔧 Adding ${brewData.taps.length} taps (brew tap is idempotent - safe to re-add)`);
            let successfulTaps = 0;
            let failedTaps: string[] = [];
            
            for (const tap of brewData.taps) {
                try {
                    console.log(`  Adding tap: ${tap}`);
                    await execa(this.brewPath, ['tap', tap]);
                    successfulTaps++;
                } catch (error: any) {
                    const errorMessage = error.stderr || error.message || '';
                    
                    // Check if tap already exists (this is OK)
                    if (errorMessage.includes('already tapped') || errorMessage.includes('already exists')) {
                        console.log(`  ✅ ${tap} (already added)`);
                        successfulTaps++;
                    } else {
                        console.warn(`  ⚠️  Failed to add tap ${tap}`);
                        console.warn(`      Reason: ${errorMessage}`);
                        
                        // Check if Git is the issue
                        if (errorMessage.includes('Git is unavailable') || errorMessage.includes('git')) {
                            console.warn('      💡 Tip: Git is required for taps. Install Xcode Command Line Tools with: xcode-select --install');
                        }
                        
                        failedTaps.push(tap);
                        
                        if (options.pauseOnError !== false) {  // Default to true
                            await this.promptOnError();
                        }
                    }
                }
            }
            
            if (failedTaps.length > 0) {
                console.log(`\n  Summary: ${successfulTaps}/${brewData.taps.length} taps added successfully`);
                console.log(`  Failed taps: ${failedTaps.join(', ')}`);
                console.log(`  Note: Some taps may no longer exist or require different names`);
            } else {
                console.log(`\n  ✅ All ${successfulTaps} taps added successfully`);
            }
        }
        
        // Install formulae
        if (brewData.formulae && brewData.formulae.length > 0) {
            // Debug formulae structure
            await this.log(`Formulae data structure: ${JSON.stringify(brewData.formulae.slice(0, 3), null, 2)}`);
            
            // Filter out invalid formulae first
            const validFormulae = brewData.formulae.filter(formula => {
                if (!formula) {
                    console.warn(`⚠️  Null/undefined formula found, skipping`);
                    return false;
                }
                
                // Check if formula has required properties
                if (!formula.name && !formula.token) {
                    console.warn(`⚠️  Invalid formula structure: ${JSON.stringify(formula)}`);
                    return false;
                }
                
                return true;
            });
            
            // Sort formulae to prioritize git and other essential tools
            const sortedFormulae = [...validFormulae].sort((a, b) => {
                const priority: {[key: string]: number} = {
                    'git': 1,
                    'curl': 2,
                    'wget': 3,
                    'openssl': 4
                };
                const aName = a.name || a.token || '';
                const bName = b.name || b.token || '';
                const aPriority = priority[aName] || 999;
                const bPriority = priority[bName] || 999;
                return aPriority - bPriority;
            });
            
            const remainingFormulae = sortedFormulae.filter(formula => {
                const formulaName = formula.name || formula.token || '';
                return !this.progress.completedFormulae.includes(formulaName) && 
                       !this.progress.failedFormulae.includes(formulaName) &&
                       !this.progress.failedFormulae.some(f => f.startsWith(`${formulaName} (`));
            });
            
            console.log(`\n📦 Installing formulae: ${remainingFormulae.length} remaining (${this.progress.completedFormulae.length} already done)`);
            console.log('─'.repeat(60));
            
            let successfulFormulae = this.progress.completedFormulae.length;
            this.failedFormulae = [...this.progress.failedFormulae];  // Start with existing failures
            let currentIndex = this.progress.completedFormulae.length;
            
            for (const formula of remainingFormulae) {
                currentIndex++;
                const progress = `[${currentIndex}/${sortedFormulae.length}]`;
                
                // Extract formula name using robust logic
                const formulaName = formula.name || formula.token || '';
                if (!formulaName) {
                    console.warn(`⚠️  Skipping formula with no name: ${JSON.stringify(formula)}`);
                    continue;
                }
                
                // Check if we have a name mapping for this formula
                const nameChanges = this.progress.nameChanges || {};
                const actualName = nameChanges[formulaName] || formulaName;
                const displayName = actualName !== formulaName ? `${formulaName} (using ${actualName})` : formulaName;
                
                try {
                    console.log(`\n${progress} Installing: ${displayName}`);
                    await this.runBrewCommand(['install', actualName], actualName, options.timeout);
                    successfulFormulae++;
                    this.progress.completedFormulae.push(formulaName);  // Use original name for tracking
                    await this.saveProgress(progressFile);
                } catch (error: any) {
                    const errorMessage = error.message || error.stderr || '';
                    
                    // Check for timeout
                    if (errorMessage.includes('timed out')) {
                        console.warn(`  ⏱️  ${formulaName} installation timed out`);
                        console.warn(`      The package was taking too long to install (>${(options.timeout || 300000) / 60000} minutes)`);
                        console.warn(`      You may need to install it manually later`);
                        const failureMsg = `${formulaName} (timeout)`;
                        this.failedFormulae.push(failureMsg);
                        this.progress.failedFormulae.push(failureMsg);
                        await this.saveProgress(progressFile);
                        
                        if (options.pauseOnError !== false) {
                            await this.promptOnError();
                        }
                    }
                    // Check for deprecation
                    else if (errorMessage.includes('deprecated') || errorMessage.includes('has been disabled')) {
                        console.warn(`  ⚠️  ${formulaName} is deprecated or disabled`);
                        
                        // Try to extract replacement suggestion
                        const replacementMatch = errorMessage.match(/superseded by ([^\s]+)/i) || 
                                               errorMessage.match(/replaced by ([^\s]+)/i) ||
                                               errorMessage.match(/use ([^\s]+) instead/i);
                        
                        if (replacementMatch) {
                            console.warn(`      💡 Suggestion: Use ${replacementMatch[1]} instead`);
                        }
                        
                        const failureMsg = `${formulaName} (deprecated)`;
                        this.failedFormulae.push(failureMsg);
                        this.progress.failedFormulae.push(failureMsg);
                        await this.saveProgress(progressFile);
                        
                        // Don't pause for deprecation warnings by default
                        if (options.pauseOnError === true) {
                            await this.promptOnError();
                        }
                    }
                    // Check if formula doesn't exist or name has changed
                    else if (errorMessage.includes('No formula') || 
                             errorMessage.includes('No available formula') ||
                             errorMessage.includes('was not found')) {
                        console.warn(`  ⚠️  Formula '${actualName}' not found`);
                        
                        // Try to find suggestions by running a search
                        try {
                            console.log(`      🔍 Searching for similar formulae...`);
                            const searchResult = await execa(this.brewPath, ['search', formulaName]);
                            const searchOutput = searchResult.stdout;
                            
                            // Extract potential matches
                            const lines = searchOutput.split('\n');
                            const formulaeSection = lines.findIndex(line => line.includes('==> Formulae'));
                            
                            if (formulaeSection !== -1 && lines[formulaeSection + 1]?.trim()) {
                                const suggestions = lines[formulaeSection + 1].trim().split(/\s+/);
                                const bestMatch = suggestions[0];
                                
                                if (bestMatch && bestMatch !== actualName) {
                                    const choice = await this.promptForAlternative(formulaName, bestMatch, 'formula');
                                    
                                    if (choice === 'yes') {
                                        try {
                                            console.log(`      ✨ Installing alternative: ${bestMatch}`);
                                            await this.runBrewCommand(['install', bestMatch], bestMatch, options.timeout);
                                            successfulFormulae++;
                                            
                                            // Record the name change for future use
                                            if (!this.progress.nameChanges) {
                                                this.progress.nameChanges = {};
                                            }
                                            this.progress.nameChanges[formulaName] = bestMatch;
                                            this.progress.completedFormulae.push(formulaName);
                                            await this.saveProgress(progressFile);
                                            
                                            console.log(`      ✅ Successfully installed ${bestMatch} as replacement for ${formulaName}`);
                                            continue; // Skip to next formula
                                        } catch (installError: any) {
                                            console.warn(`      ❌ Failed to install alternative ${bestMatch}: ${installError.message}`);
                                        }
                                    } else if (choice === 'skip') {
                                        console.log(`      ⏭️  Skipping ${formulaName}`);
                                        const failureMsg = `${formulaName} (skipped by user)`;
                                        this.failedFormulae.push(failureMsg);
                                        this.progress.failedFormulae.push(failureMsg);
                                        await this.saveProgress(progressFile);
                                        continue;
                                    }
                                }
                            }
                        } catch (searchError) {
                            console.warn(`      Could not search for alternatives`);
                        }
                        
                        console.warn(`      Try manually: brew search ${formulaName}`);
                        const failureMsg = `${formulaName} (not found)`;
                        this.failedFormulae.push(failureMsg);
                        this.progress.failedFormulae.push(failureMsg);
                        await this.saveProgress(progressFile);
                        
                        if (options.pauseOnError !== false) {
                            await this.promptOnError();
                        }
                    } else {
                        console.warn(`  ⚠️  Failed to install ${formulaName}`);
                        console.warn(`      Reason: ${errorMessage}`);
                        this.failedFormulae.push(formulaName);
                        this.progress.failedFormulae.push(formulaName);
                        await this.saveProgress(progressFile);
                        
                        if (options.pauseOnError !== false) {  // Default to true
                            await this.promptOnError();
                        }
                    }
                }
            }
            
            console.log('\n' + '─'.repeat(60));
            console.log(`📊 Formulae Summary: ${successfulFormulae}/${brewData.formulae.length} installed successfully`);
            if (this.failedFormulae.length > 0) {
                console.log(`   ❌ Failed: ${this.failedFormulae.join(', ')}`);
            }
        }
        
        // Install casks
        if (brewData.casks && brewData.casks.length > 0) {
            // Debug casks structure
            await this.log(`Casks data structure: ${JSON.stringify(brewData.casks.slice(0, 3), null, 2)}`);
            
            const remainingCasks = brewData.casks.filter(cask => {
                if (!cask) {
                    console.warn(`⚠️  Null/undefined cask found, skipping`);
                    return false;
                }
                
                // Handle different possible cask structures
                let caskName: string;
                
                if (typeof cask === 'string') {
                    caskName = cask;
                } else if (cask.name && typeof cask.name === 'string') {
                    caskName = cask.name;
                } else if (cask.token && typeof cask.token === 'string') {
                    caskName = cask.token;
                } else if (cask.id && typeof cask.id === 'string') {
                    caskName = cask.id;
                } else {
                    console.warn(`⚠️  Invalid cask structure: ${JSON.stringify(cask)}`);
                    return false;
                }
                
                return !this.progress.completedCasks.includes(caskName) && 
                       !this.progress.failedCasks.includes(caskName) &&
                       !this.progress.failedCasks.some(f => f.includes(caskName));
            });
            
            console.log(`\n🖥️  Installing casks: ${remainingCasks.length} remaining (${this.progress.completedCasks.length} already done)`);
            if (options.useProfile) {
                console.log(`📁 Installing to user directory: ${this.brewPrefix}/Caskroom`);
                console.log('   Note: Applications will be linked to ~/Applications instead of /Applications');
            }
            console.log('─'.repeat(60));
            
            let successfulCasks = this.progress.completedCasks.length;
            this.failedCasks = [...this.progress.failedCasks];  // Start with existing failures
            let currentIndex = this.progress.completedCasks.length;
            
            for (const cask of remainingCasks) {
                currentIndex++;
                const progress = `[${currentIndex}/${brewData.casks.length}]`;
                
                // Extract cask name using same logic as filter
                let caskName: string;
                
                if (typeof cask === 'string') {
                    caskName = cask;
                } else if (cask?.name && typeof cask.name === 'string') {
                    caskName = cask.name;
                } else if (cask?.token && typeof cask.token === 'string') {
                    caskName = cask.token;
                } else if (cask?.id && typeof cask.id === 'string') {
                    caskName = cask.id;
                } else {
                    console.warn(`⚠️  Skipping invalid cask: ${JSON.stringify(cask)}`);
                    continue;
                }
                
                // Check if we have a name mapping for this cask
                const nameChanges = this.progress.nameChanges || {};
                const actualName = nameChanges[caskName] || caskName;
                const displayName = actualName !== caskName ? `${caskName} (using ${actualName})` : caskName;
                
                try {
                    console.log(`\n${progress} Installing: ${displayName}`);
                    
                    // For profile mode, set the appdir to user's Applications folder
                    const args = options.useProfile 
                        ? ['install', '--cask', '--appdir=~/Applications', actualName]
                        : ['install', '--cask', actualName];
                    
                    await this.runBrewCommand(args, actualName, options.timeout);
                    successfulCasks++;
                    this.progress.completedCasks.push(caskName);  // Use original name for tracking
                    await this.saveProgress(progressFile);
                } catch (error: any) {
                    const errorMessage = error.message || error.stderr || '';
                    
                    // Check if it's a permissions issue in profile mode
                    if (options.useProfile && errorMessage.includes('permission')) {
                        console.warn(`  ⚠️  ${caskName} requires admin privileges`);
                        console.warn(`      This app cannot be installed in profile mode`);
                        const failureMsg = `${caskName} (needs admin)`;
                        this.failedCasks.push(failureMsg);
                        this.progress.failedCasks.push(failureMsg);
                        await this.saveProgress(progressFile);
                    }
                    // Check if cask doesn't exist or name has changed
                    else if (errorMessage.includes('No Cask with this name exists') || 
                             errorMessage.includes('No casks found for') ||
                             errorMessage.includes('is unavailable')) {
                        console.warn(`  ⚠️  Cask '${actualName}' not found`);
                        
                        // Try to extract suggested alternative from brew output first
                        const suggestionMatch = errorMessage.match(/==> Casks\s+([^\s\n]+)/);
                        let suggestion = suggestionMatch?.[1];
                        
                        if (!suggestion || suggestion === actualName) {
                            // If no suggestion in error or same name, try searching
                            try {
                                console.log(`      🔍 Searching for similar casks...`);
                                const searchResult = await execa(this.brewPath, ['search', '--cask', caskName]);
                                const searchOutput = searchResult.stdout;
                                
                                const lines = searchOutput.split('\n');
                                const casksSection = lines.findIndex(line => line.includes('==> Casks'));
                                
                                if (casksSection !== -1 && lines[casksSection + 1]?.trim()) {
                                    const suggestions = lines[casksSection + 1].trim().split(/\s+/);
                                    suggestion = suggestions[0];
                                }
                            } catch (searchError) {
                                console.warn(`      Could not search for alternatives`);
                            }
                        }
                        
                        if (suggestion && suggestion !== actualName) {
                            const choice = await this.promptForAlternative(caskName, suggestion, 'cask');
                            
                            if (choice === 'yes') {
                                try {
                                    console.log(`      ✨ Installing alternative: ${suggestion}`);
                                    const altArgs = options.useProfile 
                                        ? ['install', '--cask', '--appdir=~/Applications', suggestion]
                                        : ['install', '--cask', suggestion];
                                    
                                    await this.runBrewCommand(altArgs, suggestion, options.timeout);
                                    successfulCasks++;
                                    
                                    // Record the name change for future use
                                    if (!this.progress.nameChanges) {
                                        this.progress.nameChanges = {};
                                    }
                                    this.progress.nameChanges[caskName] = suggestion;
                                    this.progress.completedCasks.push(caskName);
                                    await this.saveProgress(progressFile);
                                    
                                    console.log(`      ✅ Successfully installed ${suggestion} as replacement for ${caskName}`);
                                    continue; // Skip to next cask
                                } catch (installError: any) {
                                    console.warn(`      ❌ Failed to install alternative ${suggestion}: ${installError.message}`);
                                }
                            } else if (choice === 'skip') {
                                console.log(`      ⏭️  Skipping ${caskName}`);
                                const failureMsg = `${caskName} (skipped by user)`;
                                this.failedCasks.push(failureMsg);
                                this.progress.failedCasks.push(failureMsg);
                                await this.saveProgress(progressFile);
                                continue;
                            }
                        }
                        
                        console.warn(`      Try manually: brew search --cask ${caskName}`);
                        const failureMsg = `${caskName} (not found)`;
                        this.failedCasks.push(failureMsg);
                        this.progress.failedCasks.push(failureMsg);
                        await this.saveProgress(progressFile);
                    } else {
                        console.warn(`  ⚠️  Failed to install cask ${caskName}`);
                        console.warn(`      Reason: ${errorMessage}`);
                        this.failedCasks.push(caskName);
                        this.progress.failedCasks.push(caskName);
                        await this.saveProgress(progressFile);
                    }
                    
                    if (options.pauseOnError !== false) {  // Default to true
                        await this.promptOnError();
                    }
                }
            }
            
            console.log('\n' + '─'.repeat(60));
            console.log(`📊 Casks Summary: ${successfulCasks}/${brewData.casks.length} installed successfully`);
            if (this.failedCasks.length > 0) {
                console.log(`   ❌ Failed: ${this.failedCasks.join(', ')}`);
            }
            
            if (options.useProfile && successfulCasks > 0) {
                console.log('\n📝 Note: Applications were installed to ~/Applications');
                console.log('   You may need to manually move some apps to /Applications if they require it');
            }
        }
        
        // Final summary
        const totalTime = Date.now() - installStartTime;
        const totalMinutes = Math.floor(totalTime / 60000);
        const totalSeconds = Math.floor((totalTime % 60000) / 1000);
        
        console.log('\n' + '═'.repeat(60));
        console.log('✨ Homebrew Installation Complete!');
        console.log(`⏱️  Total time: ${totalMinutes}m ${totalSeconds}s`);
        
        // Count totals
        let totalSuccess = 0;
        let totalFailed = 0;
        
        if (brewData.formulae) {
            const formulaeSuccess = brewData.formulae.length - this.failedFormulae.length;
            totalSuccess += formulaeSuccess;
            totalFailed += this.failedFormulae.length;
        }
        
        if (brewData.casks) {
            const casksSuccess = brewData.casks.length - this.failedCasks.length;
            totalSuccess += casksSuccess;
            totalFailed += this.failedCasks.length;
        }
        
        console.log(`📦 Packages: ${totalSuccess} successful, ${totalFailed} failed`);
        
        // Show name change suggestions summary if any
        const nameChangeSuggestions = [
            ...this.failedFormulae.filter(f => f.includes('(not found')),
            ...this.failedCasks.filter(c => c.includes('(not found') || c.includes('try:'))
        ];
        
        if (nameChangeSuggestions.length > 0) {
            console.log('\n📝 Package Name Issues Found:');
            nameChangeSuggestions.forEach(item => {
                if (item.includes('try:')) {
                    const [name, suggestion] = item.split(' (not found, try: ');
                    const correctName = suggestion.replace(')', '');
                    console.log(`   • ${name} → ${correctName}`);
                } else {
                    const name = item.split(' (not found')[0];
                    console.log(`   • ${name} (search with: brew search ${name})`);
                }
            });
            console.log('\n💡 Consider updating your package list with the correct names for future installations.');
        }
        
        console.log('═'.repeat(60));
        
        // Close log stream if open
        if (this.logStream) {
            await this.log(`=== Homebrew Installation Completed in ${totalMinutes}m ${totalSeconds}s ===`);
            this.logStream.end();
        }
        
        // Return the brew path information
        return {
            brewPath: this.brewPath,
            brewPrefix: this.brewPrefix!
        };
    }
    
    private async installHomebrewProfile(): Promise<void> {
        if (!this.brewPrefix) throw new Error('Brew prefix not set');
        
        console.log(`Installing Homebrew to ${this.brewPrefix}...`);
        console.log('This will NOT require admin/sudo access.');
        
        // Create directory
        await fs.ensureDir(this.brewPrefix);
        
        // Download and extract Homebrew
        const tarballUrl = 'https://github.com/Homebrew/brew/tarball/master';
        
        try {
            console.log('Downloading Homebrew...');
            await execa('curl', ['-L', tarballUrl, '-o', '/tmp/homebrew.tar.gz']);
            
            console.log('Extracting Homebrew...');
            await execa('tar', ['xzf', '/tmp/homebrew.tar.gz', '-C', this.brewPrefix, '--strip-components=1']);
            
            // Clean up
            await fs.remove('/tmp/homebrew.tar.gz');
            
            // Create necessary directories
            const dirs = ['bin', 'etc', 'include', 'lib', 'opt', 'sbin', 'share', 'var', 'Cellar', 'Caskroom', 
                         'var/homebrew/linked', 'var/log', 'var/homebrew/locks'];
            for (const dir of dirs) {
                await fs.ensureDir(path.join(this.brewPrefix, dir));
            }
            
            // Add Homebrew to current process PATH
            process.env.PATH = `${this.brewPrefix}/bin:${process.env.PATH}`;
            process.env.HOMEBREW_PREFIX = this.brewPrefix;
            process.env.HOMEBREW_CELLAR = `${this.brewPrefix}/Cellar`;
            process.env.HOMEBREW_REPOSITORY = this.brewPrefix;
            
            // Initialize Homebrew for first use
            console.log('Initializing Homebrew...');
            try {
                // Run brew --version to initialize
                await execa(this.brewPath, ['--version']);
                console.log('✅ Homebrew initialized successfully');
            } catch (error: any) {
                console.warn('⚠️  Homebrew initialization warning:', error.message);
            }
            
            console.log('\n✅ Homebrew installed to user directory!');
            console.log(`\n📝 Homebrew has been added to the current session.`);
            console.log(`   Shell configuration will be updated to persist these changes.`);
            
        } catch (error) {
            console.error('Failed to install Homebrew:', error);
            throw error;
        }
    }
    
    private async installHomebrewSystem(): Promise<void> {
        const installScript = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
        
        console.log('Installing Homebrew...');
        console.log('This will prompt for your password.');
        
        await execa('sh', ['-c', installScript], {
            stdio: 'inherit'
        });
        
        // Add brew to PATH for current process and shell config
        if (process.arch === 'arm64') {
            // Apple Silicon path
            process.env.PATH = `/opt/homebrew/bin:${process.env.PATH}`;
            process.env.HOMEBREW_PREFIX = '/opt/homebrew';
            process.env.HOMEBREW_CELLAR = '/opt/homebrew/Cellar';
            process.env.HOMEBREW_REPOSITORY = '/opt/homebrew';
            
            await execa('sh', ['-c', 'echo \'eval "$(/opt/homebrew/bin/brew shellenv)"\' >> ~/.zprofile']);
        } else {
            // Intel Mac path
            process.env.PATH = `/usr/local/bin:${process.env.PATH}`;
            process.env.HOMEBREW_PREFIX = '/usr/local';
            process.env.HOMEBREW_CELLAR = '/usr/local/Cellar';
            process.env.HOMEBREW_REPOSITORY = '/usr/local/Homebrew';
        }
        
        console.log('\n✅ Homebrew installed and added to current session');
    }
}