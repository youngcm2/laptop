import {execa} from 'execa';
import {ApplicationsData} from './collect-applications';
import fs from 'fs-extra';
import {InstallOptions} from './install-brew';

export class ApplicationsInstaller {
    async install(applicationsData: ApplicationsData, options: InstallOptions = {}): Promise<void> {
        console.log('Installing applications...');
        
        if (options.useProfile) {
            console.log('📱 Profile mode: Will only install App Store apps that don\'t require admin');
        }
        
        // Check if mas is installed for App Store apps
        let hasMas = false;
        try {
            await execa('mas', ['version']);
            hasMas = true;
        } catch {
            console.log('Mac App Store CLI (mas) not found.');
            console.log('Install it with: brew install mas');
        }
        
        // Install App Store apps
        if (hasMas && applicationsData.appStoreApps && applicationsData.appStoreApps.length > 0) {
            console.log(`\nInstalling ${applicationsData.appStoreApps.length} App Store apps...`);
            console.log('Note: You must be signed into the App Store for this to work.');
            
            for (const app of applicationsData.appStoreApps) {
                try {
                    // Extract App Store ID from bundle ID if it's numeric
                    const appId = app.bundleId.match(/^\d+$/) ? app.bundleId : null;
                    
                    if (appId) {
                        console.log(`  Installing: ${app.name}`);
                        await execa('mas', ['install', appId]);
                    } else {
                        console.log(`  Skipping ${app.name} (no App Store ID found)`);
                    }
                } catch (error) {
                    console.warn(`  Failed to install ${app.name}:`, error);
                }
            }
        }
        
        // Create a report of non-App Store apps
        const nonAppStoreApps = applicationsData.allApplications.filter(app => {
            return !applicationsData.appStoreApps.some(asApp => 
                asApp.bundleId === app.bundleId || asApp.name === app.name
            );
        });
        
        // Categorize apps by install method
        const caskApps = nonAppStoreApps.filter(app => app.installMethod === 'cask');
        const directDownloads = nonAppStoreApps.filter(app => app.installMethod === 'direct');
        const unknownApps = nonAppStoreApps.filter(app => app.installMethod === 'unknown');
        
        console.log('\nApplication breakdown:');
        console.log(`  Cask apps: ${caskApps.length}`);
        console.log(`  Direct downloads: ${directDownloads.length}`);
        console.log(`  Unknown source: ${unknownApps.length}`);
        
        // Install cask apps if brew is available
        if (caskApps.length > 0) {
            console.log(`\nInstalling ${caskApps.length} cask applications...`);
            
            for (const app of caskApps) {
                try {
                    // Find the cask name from the data
                    const caskName = applicationsData.caskApps.find(cask => 
                        app.name.toLowerCase().includes(cask.toLowerCase()) ||
                        cask.toLowerCase().includes(app.name.toLowerCase())
                    ) || app.name.toLowerCase().replace(/\s+/g, '-');
                    
                    console.log(`  Installing cask: ${caskName} (${app.name})`);
                    await execa('brew', ['install', '--cask', caskName]);
                } catch (error) {
                    console.warn(`  Failed to install cask ${app.name}:`, error);
                }
            }
        }
        
        // Create installation report
        const reportPath = 'application_install_report.txt';
        let report = 'Application Installation Report\n';
        report += '==============================\n\n';
        
        report += `Total applications found: ${applicationsData.summary.totalApps}\n`;
        report += `App Store apps: ${applicationsData.summary.appStoreApps}\n\n`;
        
        report += '\nInstallation Summary:\n';
        report += '-------------------\n';
        report += `Cask apps installed: ${caskApps.length}\n`;
        report += `App Store apps: ${applicationsData.appStoreApps.length} (install via mas or App Store)\n`;
        report += `Direct downloads needed: ${directDownloads.length}\n`;
        report += `Unknown source: ${unknownApps.length}\n\n`;
        
        if (caskApps.length > 0) {
            report += 'Cask Applications (already attempted to install):\n';
            report += '-----------------------------------------------\n';
            caskApps.forEach(app => {
                report += `  - ${app.name} (${app.version || 'N/A'})\n`;
            });
            report += '\n';
        }
        
        if (directDownloads.length > 0) {
            report += 'Direct Download Applications (manual installation needed):\n';
            report += '--------------------------------------------------------\n';
            directDownloads.forEach(app => {
                report += `  - ${app.name} (${app.version || 'N/A'})\n`;
            });
            report += '\n';
        }
        
        if (unknownApps.length > 0) {
            report += 'Applications with Unknown Source:\n';
            report += '--------------------------------\n';
            unknownApps.forEach(app => {
                report += `  - ${app.name} (${app.version || 'N/A'}) from ${app.source}\n`;
            });
            report += '\n';
        }
        
        await fs.writeFile(reportPath, report);
        
        console.log(`\nApplication installation report saved to: ${reportPath}`);
        console.log(`  ${applicationsData.appStoreApps.length} App Store apps processed`);
        console.log(`  ${caskApps.length} cask apps installed`);
        console.log(`  ${directDownloads.length} apps require manual download`);
        console.log(`  ${unknownApps.length} apps from unknown sources`);
    }
}