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
        
        // Check which apps can be installed via brew cask
        const brewCaskApps: string[] = [];
        const manualApps: string[] = [];
        
        console.log('\nChecking which apps can be installed via Homebrew...');
        
        for (const app of nonAppStoreApps) {
            // Skip system apps
            if (app.source === 'System' || app.source === 'Utilities') {
                continue;
            }
            
            try {
                // Search for the app in brew casks
                const searchName = app.name.toLowerCase().replace(/\s+/g, '-');
                const {stdout} = await execa('brew', ['search', '--cask', searchName]);
                
                if (stdout && stdout.includes(searchName)) {
                    brewCaskApps.push(app.name);
                } else {
                    manualApps.push(app.name);
                }
            } catch {
                manualApps.push(app.name);
            }
        }
        
        // Create installation report
        const reportPath = 'application_install_report.txt';
        let report = 'Application Installation Report\n';
        report += '==============================\n\n';
        
        report += `Total applications found: ${applicationsData.summary.totalApps}\n`;
        report += `App Store apps: ${applicationsData.summary.appStoreApps}\n\n`;
        
        if (brewCaskApps.length > 0) {
            report += 'Apps available via Homebrew Cask:\n';
            report += '--------------------------------\n';
            brewCaskApps.forEach(app => {
                const caskName = app.toLowerCase().replace(/\s+/g, '-');
                report += `brew install --cask ${caskName}  # ${app}\n`;
            });
            report += '\n';
        }
        
        if (manualApps.length > 0) {
            report += 'Apps requiring manual installation:\n';
            report += '----------------------------------\n';
            manualApps.forEach(app => {
                report += `- ${app}\n`;
            });
            report += '\n';
        }
        
        await fs.writeFile(reportPath, report);
        
        console.log(`\nApplication installation report saved to: ${reportPath}`);
        console.log(`  ${applicationsData.appStoreApps.length} App Store apps processed`);
        console.log(`  ${brewCaskApps.length} apps available via Homebrew`);
        console.log(`  ${manualApps.length} apps require manual installation`);
    }
}