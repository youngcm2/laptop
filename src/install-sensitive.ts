import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {SensitiveData, SensitiveCollector} from './collect-sensitive';

export interface SensitiveInstallOptions {
    decryptionKey?: string;
    skipConfirmation?: boolean;
}

export class SensitiveInstaller {
    private homeDir: string;
    
    constructor() {
        this.homeDir = os.homedir();
    }
    
    async install(sensitiveData: SensitiveData, sensitiveDir: string, options: SensitiveInstallOptions = {}): Promise<void> {
        console.log('\nInstalling sensitive files...');
        
        if (!sensitiveData || !sensitiveData.files) {
            console.log('No sensitive files to install.');
            return;
        }
        
        // Check if files are encrypted and we need a key
        const encryptedFiles = sensitiveData.files.filter(f => f.encrypted);
        if (encryptedFiles.length > 0 && !options.decryptionKey) {
            console.error('❌ Sensitive files are encrypted but no decryption key provided!');
            console.log('Use --decrypt-key option to provide the decryption key.');
            return;
        }
        
        // Confirm before installing
        if (!options.skipConfirmation) {
            console.log('\n⚠️  WARNING: About to install sensitive files including:');
            console.log(`  - SSH Keys: ${sensitiveData.summary.sshKeys}`);
            console.log(`  - AWS Credentials: ${sensitiveData.summary.awsFiles}`);
            console.log(`  - NPM Tokens: ${sensitiveData.summary.npmTokens}`);
            console.log(`  - Other Secrets: ${sensitiveData.summary.otherSecrets}`);
            console.log('\nThis will overwrite existing files!');
            
            // In a real implementation, you'd prompt for confirmation
            console.log('\n(In production, this would prompt for confirmation)');
        }
        
        let installedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        // Install each file
        for (const file of sensitiveData.files) {
            if (!file.exists || !file.content) {
                continue;
            }
            
            const targetPath = path.join(this.homeDir, file.relativePath);
            const sensitiveFilePath = path.join(sensitiveDir, file.relativePath.replace(/\//g, '_'));
            
            try {
                // Read the content from the sensitive directory
                let content = await fs.readFile(sensitiveFilePath, 'utf-8');
                
                // Decrypt if needed
                if (file.encrypted && options.decryptionKey) {
                    try {
                        content = SensitiveCollector.decrypt(content, options.decryptionKey);
                    } catch (decryptError) {
                        console.error(`  ❌ Failed to decrypt ${file.relativePath}:`, decryptError);
                        errorCount++;
                        continue;
                    }
                }
                
                // Ensure target directory exists
                await fs.ensureDir(path.dirname(targetPath));
                
                // Backup existing file
                if (await fs.pathExists(targetPath)) {
                    const backupPath = `${targetPath}.backup.${Date.now()}`;
                    await fs.copy(targetPath, backupPath);
                    console.log(`  📋 Backed up ${file.relativePath} to ${path.basename(backupPath)}`);
                }
                
                // Write the file
                await fs.writeFile(targetPath, content, { encoding: 'utf-8' });
                
                // Restore permissions
                if (file.permissions) {
                    const mode = parseInt(file.permissions, 8);
                    await fs.chmod(targetPath, mode);
                }
                
                console.log(`  ✅ Installed: ${file.relativePath}`);
                installedCount++;
                
            } catch (error) {
                console.error(`  ❌ Failed to install ${file.relativePath}:`, error);
                errorCount++;
            }
        }
        
        console.log(`\nSensitive files installation complete:`);
        console.log(`  Installed: ${installedCount}`);
        console.log(`  Errors: ${errorCount}`);
        
        if (installedCount > 0) {
            console.log('\n🔐 Security recommendations:');
            console.log('  - Verify SSH key permissions: chmod 600 ~/.ssh/id_*');
            console.log('  - Verify SSH directory permissions: chmod 700 ~/.ssh');
            console.log('  - Check that git credentials are working: git config --list');
            console.log('  - Test SSH connections: ssh -T git@github.com');
        }
    }
}