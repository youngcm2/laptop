import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface SensitiveFile {
    path: string;
    relativePath: string;
    exists: boolean;
    encrypted: boolean;
    permissions?: string;
    size?: number;
    content?: string;
}

export interface SensitiveData {
    files: SensitiveFile[];
    encryptionKey?: string;
    summary: {
        totalFiles: number;
        sshKeys: number;
        awsFiles: number;
        npmTokens: number;
        otherSecrets: number;
    };
}

export class SensitiveCollector {
    private homeDir: string;
    private useEncryption: boolean;
    private encryptionKey?: string;
    private storeContent: boolean;
    
    constructor(useEncryption: boolean = false, storeContent: boolean = true) {
        this.homeDir = os.homedir();
        this.useEncryption = useEncryption;
        this.storeContent = storeContent;
        
        if (useEncryption && storeContent) {
            // Generate a random encryption key
            this.encryptionKey = crypto.randomBytes(32).toString('hex');
        }
    }
    
    async collect(): Promise<SensitiveData> {
        console.log('Collecting sensitive files...');
        if (this.useEncryption) {
            console.log('🔐 Encryption enabled for sensitive data');
        }
        
        const files: SensitiveFile[] = [];
        
        // Define sensitive file patterns
        const sensitivePatterns = [
            // SSH Keys and config
            { pattern: '.ssh/id_*', category: 'ssh' },
            { pattern: '.ssh/config', category: 'ssh' },
            { pattern: '.ssh/known_hosts', category: 'ssh' },
            { pattern: '.ssh/authorized_keys', category: 'ssh' },
            
            // AWS credentials
            { pattern: '.aws/credentials', category: 'aws' },
            { pattern: '.aws/config', category: 'aws' },
            
            // NPM tokens
            { pattern: '.npmrc', category: 'npm' },
            
            // Git credentials
            { pattern: '.git-credentials', category: 'git' },
            { pattern: '.netrc', category: 'git' },
            
            // GPG keys
            { pattern: '.gnupg/pubring.kbx', category: 'gpg' },
            { pattern: '.gnupg/trustdb.gpg', category: 'gpg' },
            { pattern: '.gnupg/private-keys-v1.d/*', category: 'gpg' },
            
            // Other authentication files
            { pattern: '.kube/config', category: 'kubernetes' },
            { pattern: '.docker/config.json', category: 'docker' },
            { pattern: '.gcloud/*', category: 'gcloud' },
            { pattern: '.azure/*', category: 'azure' },
            
            // Development tokens
            { pattern: '.bundle/config', category: 'ruby' },
            { pattern: '.cargo/credentials', category: 'rust' },
            { pattern: '.gradle/gradle.properties', category: 'gradle' },
            { pattern: '.m2/settings.xml', category: 'maven' },
            
            // Other potentially sensitive files
            { pattern: '.env', category: 'env' },
            { pattern: '.env.local', category: 'env' },
            { pattern: '.envrc', category: 'env' },
        ];
        
        // Collect files based on patterns
        for (const { pattern, category } of sensitivePatterns) {
            await this.collectPattern(pattern, category, files);
        }
        
        // Calculate summary
        const summary = {
            totalFiles: files.filter(f => f.exists).length,
            sshKeys: files.filter(f => f.relativePath.startsWith('.ssh/') && f.exists).length,
            awsFiles: files.filter(f => f.relativePath.startsWith('.aws/') && f.exists).length,
            npmTokens: files.filter(f => f.relativePath.includes('.npmrc') && f.exists).length,
            otherSecrets: files.filter(f => 
                f.exists && 
                !f.relativePath.startsWith('.ssh/') && 
                !f.relativePath.startsWith('.aws/') && 
                !f.relativePath.includes('.npmrc')
            ).length
        };
        
        return {
            files,
            encryptionKey: this.encryptionKey,
            summary
        };
    }
    
    private async collectPattern(pattern: string, category: string, files: SensitiveFile[]): Promise<void> {
        const fullPath = path.join(this.homeDir, pattern);
        
        // Handle wildcards
        if (pattern.includes('*')) {
            const dir = path.dirname(fullPath);
            const filePattern = path.basename(pattern);
            
            if (await fs.pathExists(dir)) {
                try {
                    const items = await fs.readdir(dir);
                    for (const item of items) {
                        if (this.matchesPattern(item, filePattern)) {
                            const itemPath = path.join(dir, item);
                            const stat = await fs.stat(itemPath);
                            
                            if (stat.isFile()) {
                                await this.collectFile(itemPath, files);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`Error reading directory ${dir}:`, error);
                }
            }
        } else {
            // Direct file path
            await this.collectFile(fullPath, files);
        }
    }
    
    private matchesPattern(filename: string, pattern: string): boolean {
        if (pattern === '*') return true;
        
        // Simple wildcard matching
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        return regex.test(filename);
    }
    
    private async collectFile(filePath: string, files: SensitiveFile[]): Promise<void> {
        const relativePath = path.relative(this.homeDir, filePath);
        
        if (await fs.pathExists(filePath)) {
            try {
                const stat = await fs.stat(filePath);
                const permissions = (stat.mode & parseInt('777', 8)).toString(8);
                
                let content: string | undefined;
                let encrypted = false;
                
                // Only read content if we're storing it
                if (this.storeContent) {
                    content = await fs.readFile(filePath, 'utf-8');
                    
                    // Encrypt if enabled
                    if (this.useEncryption && this.encryptionKey) {
                        content = this.encrypt(content);
                        encrypted = true;
                    }
                }
                
                files.push({
                    path: filePath,
                    relativePath,
                    exists: true,
                    encrypted,
                    permissions,
                    size: stat.size,
                    content
                });
                
                const status = this.storeContent ? 'Collected' : 'Found';
                console.log(`  ${status}: ${relativePath} (${stat.size} bytes)${encrypted ? ' 🔐' : ''}`);
            } catch (error) {
                console.warn(`  Error reading ${relativePath}:`, error);
                files.push({
                    path: filePath,
                    relativePath,
                    exists: true,
                    encrypted: false
                });
            }
        } else {
            files.push({
                path: filePath,
                relativePath,
                exists: false,
                encrypted: false
            });
        }
    }
    
    private encrypt(text: string): string {
        if (!this.encryptionKey) throw new Error('No encryption key');
        
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(
            'aes-256-cbc',
            Buffer.from(this.encryptionKey, 'hex'),
            iv
        );
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Prepend IV to encrypted data
        return iv.toString('hex') + ':' + encrypted;
    }
    
    static decrypt(encryptedText: string, key: string): string {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        
        const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(key, 'hex'),
            iv
        );
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
}