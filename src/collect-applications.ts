import {execa} from 'execa';
import fs from 'fs-extra';
import path from 'path';

export interface ApplicationInfo {
    name: string;
    version?: string;
    path: string;
    bundleId?: string;
    source?: 'Applications' | 'User Applications' | 'System' | 'Utilities' | 'Other';
}

export interface AppStoreApp {
    name: string;
    bundleId: string;
    version?: string;
    installedFrom: 'App Store';
}

export interface ApplicationsData {
    allApplications: ApplicationInfo[];
    appStoreApps: AppStoreApp[];
    summary: {
        totalApps: number;
        appStoreApps: number;
        bySource: Record<string, number>;
    };
}

export class Applications {
    async collect(): Promise<ApplicationsData> {
        console.log('Collecting applications data...');
        
        const allApps = await this.getAllApplications();
        const appStoreApps = await this.getAppStoreApps();
        
        // Calculate summary
        const bySource: Record<string, number> = {};
        allApps.forEach(app => {
            const source = app.source || 'Other';
            bySource[source] = (bySource[source] || 0) + 1;
        });
        
        return {
            allApplications: allApps,
            appStoreApps: appStoreApps,
            summary: {
                totalApps: allApps.length,
                appStoreApps: appStoreApps.length,
                bySource
            }
        };
    }
    
    private async getAllApplications(): Promise<ApplicationInfo[]> {
        const apps: ApplicationInfo[] = [];
        
        // Common application directories
        const appDirs = [
            { path: '/Applications', source: 'Applications' as const },
            { path: `${process.env.HOME}/Applications`, source: 'User Applications' as const },
            { path: '/System/Applications', source: 'System' as const },
            { path: '/System/Applications/Utilities', source: 'Utilities' as const }
        ];
        
        for (const dir of appDirs) {
            if (await fs.pathExists(dir.path)) {
                try {
                    const items = await fs.readdir(dir.path);
                    
                    for (const item of items) {
                        if (item.endsWith('.app')) {
                            const appPath = path.join(dir.path, item);
                            const appInfo = await this.getAppInfo(appPath, dir.source);
                            if (appInfo) {
                                apps.push(appInfo);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`Error reading ${dir.path}:`, error);
                }
            }
        }
        
        // Remove duplicates based on bundle ID or name
        const seen = new Set<string>();
        const uniqueApps = apps.filter(app => {
            const key = app.bundleId || app.name;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
        
        // Sort by name
        return uniqueApps.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    private async getAppInfo(appPath: string, source: ApplicationInfo['source']): Promise<ApplicationInfo | null> {
        try {
            const plistPath = path.join(appPath, 'Contents', 'Info.plist');
            
            if (await fs.pathExists(plistPath)) {
                try {
                    // Use plutil to convert plist to JSON
                    const {stdout} = await execa('plutil', ['-convert', 'json', '-o', '-', plistPath]);
                    const plistData = JSON.parse(stdout);
                    
                    return {
                        name: plistData.CFBundleName || plistData.CFBundleDisplayName || path.basename(appPath, '.app'),
                        version: plistData.CFBundleShortVersionString || plistData.CFBundleVersion,
                        bundleId: plistData.CFBundleIdentifier,
                        path: appPath,
                        source
                    };
                } catch (plistError) {
                    // If plist is invalid, try using defaults command
                    try {
                        const name = await this.getDefaultValue(plistPath, 'CFBundleName') || 
                                    await this.getDefaultValue(plistPath, 'CFBundleDisplayName') ||
                                    path.basename(appPath, '.app');
                        const version = await this.getDefaultValue(plistPath, 'CFBundleShortVersionString') ||
                                       await this.getDefaultValue(plistPath, 'CFBundleVersion');
                        const bundleId = await this.getDefaultValue(plistPath, 'CFBundleIdentifier');
                        
                        return {
                            name,
                            version,
                            bundleId,
                            path: appPath,
                            source
                        };
                    } catch (defaultsError) {
                        // Fallback to basic info
                        return {
                            name: path.basename(appPath, '.app'),
                            path: appPath,
                            source
                        };
                    }
                }
            } else {
                // Fallback for apps without Info.plist
                return {
                    name: path.basename(appPath, '.app'),
                    path: appPath,
                    source
                };
            }
        } catch (error) {
            console.warn(`Error getting info for ${appPath}:`, error);
            return null;
        }
    }
    
    private async getAppStoreApps(): Promise<AppStoreApp[]> {
        const appStoreApps: AppStoreApp[] = [];
        
        try {
            // Method 1: Check using mas (Mac App Store command line)
            try {
                const {stdout} = await execa('mas', ['list']);
                const lines = stdout.trim().split('\n');
                
                for (const line of lines) {
                    // Format: "1234567890  App Name (1.0.0)"
                    const match = line.match(/^(\d+)\s+(.+?)\s+\(([^)]+)\)$/);
                    if (match) {
                        appStoreApps.push({
                            bundleId: match[1], // This is actually the App Store ID
                            name: match[2],
                            version: match[3],
                            installedFrom: 'App Store'
                        });
                    }
                }
            } catch (masError) {
                console.log('mas not installed, trying alternative method...');
            }
            
            // Method 2: Check receipts
            const receiptsDir = '/Library/Receipts';
            const appStoreReceiptsDir = `${process.env.HOME}/Library/Application Support/App Store/Receipts`;
            
            // Check for App Store receipts
            if (await fs.pathExists(appStoreReceiptsDir)) {
                const receipts = await fs.readdir(appStoreReceiptsDir);
                
                for (const receipt of receipts) {
                    if (receipt.endsWith('.receipt')) {
                        // Receipt files are named by bundle ID
                        const bundleId = receipt.replace('.receipt', '');
                        
                        // Try to find the corresponding app
                        const app = await this.findAppByBundleId(bundleId);
                        if (app) {
                            appStoreApps.push({
                                name: app.name,
                                bundleId: bundleId,
                                version: app.version,
                                installedFrom: 'App Store'
                            });
                        }
                    }
                }
            }
            
            // Method 3: Check _MASReceipt in app bundles
            const allApps = await this.getAllApplications();
            for (const app of allApps) {
                if (app.bundleId) {
                    const receiptPath = path.join(app.path, 'Contents', '_MASReceipt', 'receipt');
                    if (await fs.pathExists(receiptPath)) {
                        // This app has an App Store receipt
                        const existingApp = appStoreApps.find(a => a.bundleId === app.bundleId);
                        if (!existingApp) {
                            appStoreApps.push({
                                name: app.name,
                                bundleId: app.bundleId,
                                version: app.version,
                                installedFrom: 'App Store'
                            });
                        }
                    }
                }
            }
            
        } catch (error) {
            console.warn('Error getting App Store apps:', error);
        }
        
        // Remove duplicates
        const seen = new Set<string>();
        return appStoreApps.filter(app => {
            const key = app.bundleId;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }
    
    private async findAppByBundleId(bundleId: string): Promise<ApplicationInfo | null> {
        try {
            // Use mdfind to locate app by bundle ID
            const {stdout} = await execa('mdfind', [`kMDItemCFBundleIdentifier == "${bundleId}"`]);
            const paths = stdout.trim().split('\n').filter(p => p.endsWith('.app'));
            
            if (paths.length > 0) {
                return this.getAppInfo(paths[0], 'Applications');
            }
        } catch (error) {
            console.warn(`Could not find app for bundle ID ${bundleId}`);
        }
        
        return null;
    }
    
    private async getDefaultValue(plistPath: string, key: string): Promise<string | undefined> {
        try {
            const {stdout} = await execa('defaults', ['read', plistPath.replace('.plist', ''), key]);
            return stdout.trim();
        } catch {
            return undefined;
        }
    }
}