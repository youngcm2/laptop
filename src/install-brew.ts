import {execa} from 'execa';
import {BrewData} from './collect-brew';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

export interface InstallOptions {
    useProfile?: boolean;
    brewPrefix?: string;
}

export class BrewInstaller {
    private brewPath: string = 'brew';
    private brewPrefix?: string;
    
    async install(brewData: BrewData, options: InstallOptions = {}): Promise<void> {
        console.log('Installing Homebrew packages...');
        
        if (options.useProfile) {
            this.brewPrefix = options.brewPrefix || path.join(os.homedir(), 'homebrew');
            this.brewPath = path.join(this.brewPrefix, 'bin', 'brew');
            console.log(`Using profile-specific Homebrew at: ${this.brewPrefix}`);
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
        
        // Update brew
        console.log('Updating Homebrew...');
        await execa(this.brewPath, ['update']);
        
        // Install taps
        if (brewData.taps && brewData.taps.length > 0) {
            console.log(`\nAdding ${brewData.taps.length} taps...`);
            for (const tap of brewData.taps) {
                try {
                    console.log(`  Adding tap: ${tap}`);
                    await execa(this.brewPath, ['tap', tap]);
                } catch (error) {
                    console.warn(`  Failed to add tap ${tap}:`, error);
                }
            }
        }
        
        // Install formulae
        if (brewData.formulae && brewData.formulae.length > 0) {
            console.log(`\nInstalling ${brewData.formulae.length} formulae...`);
            for (const formula of brewData.formulae) {
                try {
                    console.log(`  Installing: ${formula.name}`);
                    await execa(this.brewPath, ['install', formula.name]);
                } catch (error) {
                    console.warn(`  Failed to install ${formula.name}:`, error);
                }
            }
        }
        
        // Install casks (only if not in profile mode - casks typically need admin)
        if (!options.useProfile && brewData.casks && brewData.casks.length > 0) {
            console.log(`\nInstalling ${brewData.casks.length} casks...`);
            for (const cask of brewData.casks) {
                try {
                    console.log(`  Installing: ${cask.name}`);
                    await execa(this.brewPath, ['install', '--cask', cask.name]);
                } catch (error) {
                    console.warn(`  Failed to install cask ${cask.name}:`, error);
                }
            }
        } else if (options.useProfile && brewData.casks && brewData.casks.length > 0) {
            console.log('\n⚠️  Skipping casks in profile mode (they typically require admin rights)');
            console.log('   Install them manually or run without --profile flag');
        }
        
        console.log('\nBrew installation complete!');
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
            const dirs = ['bin', 'etc', 'include', 'lib', 'opt', 'sbin', 'share', 'var', 'Cellar', 'Caskroom'];
            for (const dir of dirs) {
                await fs.ensureDir(path.join(this.brewPrefix, dir));
            }
            
            console.log('\n✅ Homebrew installed to user directory!');
            console.log('\n📝 Add these lines to your shell configuration (.zshrc or .bashrc):');
            console.log(`export PATH="${this.brewPrefix}/bin:$PATH"`);
            console.log(`export HOMEBREW_PREFIX="${this.brewPrefix}"`);
            console.log(`export HOMEBREW_CELLAR="${this.brewPrefix}/Cellar"`);
            console.log(`export HOMEBREW_REPOSITORY="${this.brewPrefix}"`);
            console.log('\nThen restart your terminal or run: source ~/.zshrc');
            
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
        
        // Add brew to PATH for Apple Silicon Macs
        if (process.arch === 'arm64') {
            await execa('sh', ['-c', 'echo \'eval "$(/opt/homebrew/bin/brew shellenv)"\' >> ~/.zprofile']);
            await execa('sh', ['-c', 'eval "$(/opt/homebrew/bin/brew shellenv)"']);
        }
    }
}