import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {ShellConfig} from './shell-config';
import {InstallOptions} from './install-brew';

export class ShellInstaller {
    async install(shellConfig: ShellConfig, configsDir: string, options: InstallOptions = {}): Promise<void> {
        console.log('Installing shell configurations...');
        
        if (options.useProfile) {
            console.log('📝 Profile mode: Will add Homebrew paths to shell configs');
        }
        
        const homeDir = os.homedir();
        let installedCount = 0;
        let skippedCount = 0;
        
        // Install config files from the configs directory
        if (await fs.pathExists(configsDir)) {
            const files = await fs.readdir(configsDir);
            
            for (const file of files) {
                const sourcePath = path.join(configsDir, file);
                let targetPath: string;
                
                // Determine target path based on file name
                if (file === 'config' && sourcePath.includes('ssh')) {
                    targetPath = path.join(homeDir, '.ssh', 'config');
                } else if (file === 'config.json') {
                    // This might be a specific app config, skip for now
                    console.log(`  Skipping: ${file} (app-specific config)`);
                    skippedCount++;
                    continue;
                } else if (file.startsWith('.')) {
                    targetPath = path.join(homeDir, file);
                } else {
                    console.log(`  Skipping: ${file} (unknown config type)`);
                    skippedCount++;
                    continue;
                }
                
                // Check if file already exists
                if (await fs.pathExists(targetPath)) {
                    // Create backup
                    const backupPath = `${targetPath}.backup.${Date.now()}`;
                    console.log(`  Backing up existing ${file} to ${path.basename(backupPath)}`);
                    await fs.copy(targetPath, backupPath);
                }
                
                // Copy the config file
                try {
                    await fs.ensureDir(path.dirname(targetPath));
                    await fs.copy(sourcePath, targetPath);
                    console.log(`  Installed: ${file} -> ${targetPath}`);
                    installedCount++;
                } catch (error) {
                    console.warn(`  Failed to install ${file}:`, error);
                }
            }
        }
        
        // If in profile mode, add Homebrew configuration to shell files
        if (options.useProfile && options.brewPrefix) {
            await this.addBrewToShellConfig(options.brewPrefix);
        }
        
        console.log(`\nShell configuration complete!`);
        console.log(`  Installed: ${installedCount} files`);
        console.log(`  Skipped: ${skippedCount} files`);
        console.log('\nNote: You may need to restart your shell or run "source ~/.zshrc" to apply changes.');
    }
    
    private async addBrewToShellConfig(brewPrefix: string): Promise<void> {
        console.log('\nAdding Homebrew paths to shell configuration...');
        
        const homeDir = os.homedir();
        const shellConfigs = ['.zshrc', '.bashrc', '.bash_profile'];
        
        const brewConfig = `
# Homebrew (user-specific installation)
export PATH="${brewPrefix}/bin:$PATH"
export HOMEBREW_PREFIX="${brewPrefix}"
export HOMEBREW_CELLAR="${brewPrefix}/Cellar"
export HOMEBREW_REPOSITORY="${brewPrefix}"
`;
        
        for (const configFile of shellConfigs) {
            const configPath = path.join(homeDir, configFile);
            
            try {
                let content = '';
                
                if (await fs.pathExists(configPath)) {
                    content = await fs.readFile(configPath, 'utf-8');
                    
                    // Check if Homebrew config already exists
                    if (content.includes('HOMEBREW_PREFIX=')) {
                        console.log(`  ${configFile}: Homebrew config already exists, skipping`);
                        continue;
                    }
                }
                
                // Append Homebrew configuration
                content += brewConfig;
                await fs.writeFile(configPath, content);
                console.log(`  ${configFile}: Added Homebrew configuration`);
                
            } catch (error) {
                console.warn(`  Failed to update ${configFile}:`, error);
            }
        }
    }
}