import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {Options} from "./options";
import {Brew} from "./collect-brew";
import {Shell} from "./collect-shell-config";
import {Applications} from "./collect-applications";
import {SensitiveCollector} from "./collect-sensitive";
import {BrewInstaller} from "./install-brew";
import {ShellInstaller} from "./install-shell";
import {ApplicationsInstaller} from "./install-applications";
import {SensitiveInstaller} from "./install-sensitive";
import fs from "fs-extra";
import archiver from 'archiver';
import path from 'path';
import os from 'os';
import {execa} from 'execa';
// import {resolveHome} from "./utils";

const parser = yargs(hideBin(process.argv))
    .command(
        'collect',
        'Collect setup data from laptop',
        (yargs) => {
            return yargs
                .option('output', {
                    alias: 'o',
                    describe: 'Output zip file path',
                    type: 'string',
                    default: `laptop-setup-${new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_')}.zip`
                })
                .option('include-sensitive', {
                    alias: 's',
                    describe: 'Include sensitive files (SSH keys, tokens, etc.)',
                    type: 'boolean',
                    default: false
                })
                .option('encrypt', {
                    alias: 'e',
                    describe: 'Encrypt sensitive files',
                    type: 'boolean',
                    default: false
                })
                .option('store-sensitive', {
                    describe: 'Actually store sensitive files in the zip (default: false - only shows what would be collected)',
                    type: 'boolean',
                    default: false
                });
        },
        async (argv) => {
            const outputZip = argv.output as string;
            const includeSensitive = argv['include-sensitive'] as boolean;
            const encrypt = argv.encrypt as boolean;
            const storeSensitive = argv['store-sensitive'] as boolean;
            
            console.log('Collecting data from laptop');
            console.log(`Output will be saved to: ${path.resolve(outputZip)}`);
            
            if (includeSensitive) {
                if (storeSensitive) {
                    console.log('⚠️  Including sensitive files (SSH keys, tokens, etc.)');
                    if (encrypt) {
                        console.log('🔐 Sensitive files will be encrypted');
                    }
                } else {
                    console.log('📋 Scanning for sensitive files (dry run - files will NOT be stored)');
                }
            }
            
            const brew = new Brew();
            const shell = new Shell();
            const applications = new Applications();
            const brewData = await brew.collect();
            const shellConfig = await shell.collect();
            const applicationsData = await applications.collect();
            
            let sensitiveData = null;
            if (includeSensitive) {
                const sensitiveCollector = new SensitiveCollector(encrypt, storeSensitive);
                sensitiveData = await sensitiveCollector.collect();
            }

            // Create temporary directory for files
            const tempDir = path.join(process.cwd(), '.laptop-setup-temp');
            await fs.ensureDir(tempDir);

            try {
                // Write JSON data to temp directory
                const jsonPath = path.join(tempDir, 'laptop-setup.json');
                const setupData: any = {
                    brew: brewData,
                    shell: shellConfig,
                    applications: applicationsData
                };
                
                if (sensitiveData) {
                    setupData.sensitive = sensitiveData;
                }
                
                await fs.writeJson(jsonPath, setupData, {spaces: 2});

                // Create a zip file
                const output = fs.createWriteStream(outputZip);
                const archive = archiver('zip', {
                    zlib: { level: 9 } // Maximum compression
                });

                // Set up event handlers
                output.on('close', () => {
                    console.log(`Created ${path.resolve(outputZip)} (${archive.pointer()} bytes)`);
                });

                archive.on('error', (err) => {
                    throw err;
                });

                // Pipe archive data to the file
                archive.pipe(output);

                // Add the JSON file to the archive
                archive.file(jsonPath, { name: 'laptop-setup.json' });

                // Add shell config files if they exist
                if (shellConfig.configs && shellConfig.configs.length > 0) {
                    for (const config of shellConfig.configs) {
                        if (config.exists && config.contents) {
                            const fileName = path.basename(config.path);
                            const filePath = path.join(tempDir, fileName);
                            await fs.writeFile(filePath, config.contents);
                            archive.file(filePath, { name: `configs/${fileName}` });
                        }
                    }
                }

                // Add applications list as separate files for easier reading
                const appsListPath = path.join(tempDir, 'applications_list.txt');
                const appsList = applicationsData.allApplications
                    .map(app => `${app.name} (${app.version || 'N/A'}) - ${app.path}`)
                    .join('\n');
                await fs.writeFile(appsListPath, appsList);
                archive.file(appsListPath, { name: 'applications_list.txt' });

                const appStoreListPath = path.join(tempDir, 'appstore_apps.txt');
                const appStoreList = applicationsData.appStoreApps
                    .map(app => `${app.name} (${app.version || 'N/A'}) - ${app.bundleId}`)
                    .join('\n');
                await fs.writeFile(appStoreListPath, appStoreList);
                archive.file(appStoreListPath, { name: 'appstore_apps.txt' });
                
                // Add sensitive files if collected
                if (sensitiveData && sensitiveData.files) {
                    // Always add the summary
                    const summaryPath = path.join(tempDir, 'sensitive_files_summary.txt');
                    const summary = `
Sensitive Files ${storeSensitive ? 'Collected' : 'Found (NOT STORED)'}
========================

Total files: ${sensitiveData.summary.totalFiles}
SSH Keys: ${sensitiveData.summary.sshKeys}
AWS Files: ${sensitiveData.summary.awsFiles}
NPM Tokens: ${sensitiveData.summary.npmTokens}
Other Secrets: ${sensitiveData.summary.otherSecrets}

Encryption: ${encrypt ? 'ENABLED 🔐' : 'DISABLED ⚠️'}
Stored in ZIP: ${storeSensitive ? 'YES ⚠️' : 'NO (dry run)'}

Files ${storeSensitive ? 'collected' : 'found'}:
${sensitiveData.files.filter(f => f.exists).map(f => `- ${f.relativePath} (${f.size} bytes)`).join('\n')}
${!storeSensitive ? '\n⚠️  To actually store these files, use --store-sensitive flag' : ''}
`;
                    await fs.writeFile(summaryPath, summary);
                    archive.file(summaryPath, { name: 'sensitive_files_summary.txt' });
                    
                    // Only store files if explicitly requested
                    if (storeSensitive) {
                        const sensitiveDir = path.join(tempDir, 'sensitive');
                        await fs.ensureDir(sensitiveDir);
                        
                        // Save encryption key if used
                        if (sensitiveData.encryptionKey) {
                            const keyPath = path.join(tempDir, 'ENCRYPTION_KEY.txt');
                            const keyContent = `
IMPORTANT: Save this encryption key securely!
This key is needed to decrypt your sensitive files.

Encryption Key: ${sensitiveData.encryptionKey}

To decrypt files, use the --decrypt-key flag during installation.
`;
                            await fs.writeFile(keyPath, keyContent);
                            archive.file(keyPath, { name: 'ENCRYPTION_KEY.txt' });
                        }
                        
                        // Add sensitive files
                        for (const file of sensitiveData.files) {
                            if (file.exists && file.content) {
                                const fileName = file.relativePath.replace(/\//g, '_');
                                const filePath = path.join(sensitiveDir, fileName);
                                await fs.writeFile(filePath, file.content);
                                archive.file(filePath, { name: `sensitive/${fileName}` });
                            }
                        }
                    }
                }

                // Finalize the archive
                await archive.finalize();

            } finally {
                // Clean up temp directory
                await fs.remove(tempDir);
            }
        })
    .command(
        'install <zipfile>',
        'Install configuration from a collected zip file',
        (yargs) => {
            return yargs
                .positional('zipfile', {
                    describe: 'Path to the laptop-setup.zip file',
                    type: 'string',
                    demandOption: true
                })
                .option('profile', {
                    describe: 'Install to user profile instead of system-wide (no admin required)',
                    type: 'boolean',
                    default: false
                })
                .option('brew-prefix', {
                    describe: 'Custom Homebrew installation prefix (e.g., ~/homebrew)',
                    type: 'string'
                })
                .option('decrypt-key', {
                    alias: 'd',
                    describe: 'Decryption key for sensitive files',
                    type: 'string'
                })
                .option('skip-sensitive', {
                    describe: 'Skip installation of sensitive files',
                    type: 'boolean',
                    default: false
                });
        },
        async (argv) => {
            const zipPath = argv.zipfile as string;
            const useProfile = argv.profile as boolean;
            const brewPrefix = argv.brewPrefix as string | undefined;
            const decryptKey = argv['decrypt-key'] as string | undefined;
            const skipSensitive = argv['skip-sensitive'] as boolean;

            if (!await fs.pathExists(zipPath)) {
                console.error(`Error: File not found: ${zipPath}`);
                process.exit(1);
            }

            console.log(`Installing from: ${zipPath}`);
            if (useProfile) {
                console.log('🏠 Profile mode: Installing to user directory (no admin required)');
            }

            // Create temporary directory for extraction
            const tempDir = path.join(process.cwd(), '.laptop-install-temp');
            await fs.ensureDir(tempDir);

            try {
                // Extract zip file
                console.log('Extracting configuration...');
                await execa('unzip', ['-q', zipPath, '-d', tempDir]);

                // Read the main configuration
                const jsonPath = path.join(tempDir, 'laptop-setup.json');
                if (!await fs.pathExists(jsonPath)) {
                    throw new Error('laptop-setup.json not found in zip file');
                }

                const config = await fs.readJson(jsonPath);

                // Ask what to install
                console.log('\nAvailable installations:');
                console.log('1. Homebrew packages (formulae and casks)');
                console.log('2. Shell configurations (.zshrc, .bashrc, etc.)');
                console.log('3. Applications (App Store apps)');
                if (config.sensitive && !skipSensitive) {
                    console.log('4. Sensitive files (SSH keys, tokens, etc.) - REQUIRES DECRYPTION KEY');
                    console.log('5. All of the above');
                } else {
                    console.log('4. All of the above');
                }
                console.log('');

                // For now, we'll install everything. In a real implementation,
                // you'd want to add interactive prompts
                console.log('Installing all components...\n');

                // Install Homebrew packages
                if (config.brew) {
                    const brewInstaller = new BrewInstaller();
                    await brewInstaller.install(config.brew, {
                        useProfile,
                        brewPrefix: brewPrefix || (useProfile ? path.join(os.homedir(), 'homebrew') : undefined)
                    });
                }

                // Install shell configurations
                if (config.shell) {
                    const shellInstaller = new ShellInstaller();
                    const configsDir = path.join(tempDir, 'configs');
                    await shellInstaller.install(config.shell, configsDir, { useProfile });
                }

                // Install applications
                if (config.applications) {
                    const appsInstaller = new ApplicationsInstaller();
                    await appsInstaller.install(config.applications, { useProfile });
                }

                // Install sensitive files
                if (config.sensitive && !skipSensitive) {
                    const sensitiveInstaller = new SensitiveInstaller();
                    const sensitiveDir = path.join(tempDir, 'sensitive');
                    
                    if (await fs.pathExists(sensitiveDir)) {
                        await sensitiveInstaller.install(config.sensitive, sensitiveDir, {
                            decryptionKey: decryptKey,
                            skipConfirmation: false
                        });
                    } else {
                        console.log('\nNo sensitive files found in archive.');
                    }
                }

                console.log('\n✅ Installation complete!');
                console.log('\nNext steps:');
                console.log('1. Restart your terminal to load new shell configurations');
                console.log('2. Check application_install_report.txt for manual installations');
                console.log('3. Sign into the App Store if you haven\'t already');

                if (useProfile) {
                    console.log('\n📝 Profile Mode Notes:');
                    console.log(`- Homebrew installed to: ${brewPrefix || path.join(os.homedir(), 'homebrew')}`);
                    console.log('- Casks (GUI apps) were skipped - install manually');
                    console.log('- Shell configs updated with Homebrew paths');
                    console.log('- No admin/sudo access was required! 🎉');
                }

            } catch (error) {
                console.error('Installation failed:', error);
                process.exit(1);
            } finally {
                // Clean up temp directory
                await fs.remove(tempDir);
            }
        })
    .strict()
    .demandCommand()
    .fail(false)


async function main(args: Options) {
    // Add logic to process the input file and output to CSV

}

parser.parseAsync()
    .catch(async err => {
    console.info(`${err.message}\n ${await parser.getHelp()}`)
});
