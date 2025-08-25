import {readFile, access} from 'fs/promises'
import {join} from "path";
import {constants} from 'fs';
import {ShellConfig, ConfigFile} from './shell-config';

export class Shell {
    private configFiles = [
        // Shell configs
        '.zshrc',
        '.zprofile',
        '.zshenv',
        '.bashrc',
        '.bash_profile',
        '.profile',
        
        // Tool configs
        '.gitconfig',
        '.gitignore_global',
        '.ssh/config',
        '.tmux.conf',
        '.vimrc',
        
        // Shell enhancements
        '.aliases',
        '.functions',
        '.exports',
        '.config/starship.toml',
        
        // Development configs
        '.tool-versions',
        '.asdfrc',
        '.cargo/config.toml',
        
        // Editor configs
        '.editorconfig',
        '.config/nvim/init.vim',
        '.config/nvim/init.lua',
    ];

    async fileExists(filePath: string): Promise<boolean> {
        try {
            await access(filePath, constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }

    async readFileIfExists(filePath: string): Promise<{ contents: string; exists: boolean }> {
        try {
            if (await this.fileExists(filePath)) {
                const contents = await readFile(filePath);
                return {
                    contents: contents.toString('base64'),
                    exists: true
                };
            }
        } catch (error) {
            console.warn(`Error reading ${filePath}:`, error);
        }
        return { contents: '', exists: false };
    }

    async collect(): Promise<ShellConfig> {
        const homeDir = process.env.HOME || '';
        const configs: ConfigFile[] = [];

        for (const configFile of this.configFiles) {
            const fullPath = join(homeDir, configFile);
            const fileData = await this.readFileIfExists(fullPath);
            
            configs.push({
                path: configFile,
                contents: fileData.contents,
                exists: fileData.exists
            });
        }

        // Detect current shell
        const shell = process.env.SHELL?.split('/').pop() || 'unknown';

        return {
            shell,
            configs: configs.filter(c => c.exists) // Only return configs that exist
        };
    }
}