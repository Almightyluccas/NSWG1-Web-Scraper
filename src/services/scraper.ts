import puppeteer, { Browser, Page } from 'puppeteer-core';
import { PlayerInfo, PlayerData } from '../types';
import { DatabaseService } from './DatabaseService';

export class GamePanelScraper {
    private browser: Browser | null = null;
    private page: Page | null = null;

    constructor(
        private readonly headlessState: boolean,
        private readonly dbService: DatabaseService
    ) {}

    private async saveCookies(): Promise<void> {
        if (!this.page) return;
        const cookies = await this.page.cookies();
        await this.dbService.saveSession(JSON.stringify(cookies));
    }

    private async loadCookies(): Promise<boolean> {
        if (!this.page) return false;
        
        const session = await this.dbService.getLatestSession();
        if (!session) return false;

        try {
            const cookies = JSON.parse(session.cookies);
            await this.page.setCookie(...cookies);
            return true;
        } catch (error) {
            console.error('Error parsing cookies:', error);
            return false;
        }
    }

    private async isLoginPage(): Promise<boolean> {
        if (!this.page) return false;
        const url = this.page.url();
        return url.includes('/Login') || url.includes('Login?ReturnUrl=');
    }

    private async login(username: string, password: string): Promise<void> {
        if (!this.page) throw new Error('Browser not initialized');

        if (!(await this.isLoginPage())) {
            await this.page.goto('https://gamepanel.hosthavoc.com/Login');
        }

        await this.page.waitForSelector('#UserName');
        await this.page.waitForSelector('#Password');
        await this.page.waitForSelector('#RememberMe');
        await this.page.waitForSelector('#loginButton');

        await this.page.$eval('#UserName', (el: any) => el.value = '');
        await this.page.$eval('#Password', (el: any) => el.value = '');

        await this.page.type('#UserName', username);
        await this.page.type('#Password', password);
        
        await this.page.evaluate(() => {
            const checkbox = document.querySelector('#RememberMe') as HTMLInputElement;
            const hiddenInput = document.querySelector('input[name="RememberMe"][type="hidden"]') as HTMLInputElement;
            if (checkbox) checkbox.checked = true;
            if (hiddenInput) hiddenInput.value = 'true';
        });

        await Promise.all([
            this.page.waitForNavigation(),
            this.page.click('button#loginButton')
        ]);

        if (await this.isLoginPage()) {
            throw new Error('Login failed - still on login page after attempt');
        }

        await this.saveCookies();
    }

    async initialize(username: string, password: string): Promise<void> {
        if (!this.browser) {
            const options = {
                headless: this.headlessState,
                defaultViewport: null,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--single-process'
                ],
                executablePath: process.env.NODE_ENV === 'production' 
                    ? '/app/.apt/usr/bin/google-chrome'  // Heroku Chrome path
                    : process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome'
            };

            console.log('Launching browser with options:', {
                headless: options.headless,
                executablePath: options.executablePath,
                env: process.env.NODE_ENV
            });

            try {
                this.browser = await puppeteer.launch(options);
            } catch (error) {
                console.error('Failed to launch browser:', error);
                throw error;
            }

            try {
                this.page = await this.browser.newPage();
                const hasSession = await this.loadCookies();
                await this.page.goto('https://gamepanel.hosthavoc.com/Service/Status/154520');
                
                if (await this.isLoginPage()) {
                    await this.login(username, password);
                    await this.page.goto('https://gamepanel.hosthavoc.com/Service/Status/154520');
                }
            } catch (error) {
                console.error('Failed to initialize page:', error);
                if (this.browser) {
                    await this.browser.close();
                    this.browser = null;
                }
                throw error;
            }
        }
    }

    async scrapePlayerData(username: string, password: string): Promise<PlayerData> {
        if (!this.page) {
            await this.initialize(username, password);
        }

        if (!this.page) throw new Error('Failed to initialize browser');

        try {
            await this.page.reload({ waitUntil: 'networkidle0' });

            if (await this.isLoginPage()) {
                await this.login(username, password);
                await this.page.goto('https://gamepanel.hosthavoc.com/Service/Status/154520');
            }

            const currentUrl = this.page.url();
            if (currentUrl.includes('/Login') || !currentUrl.includes('/Service/Status/154520')) {
                await this.login(username, password);
                await this.page.goto('https://gamepanel.hosthavoc.com/Service/Status/154520');
            }

            const playersTabExists = await this.page.evaluate(() => {
                return !!document.querySelector('li[aria-controls="tabStrip-1"]');
            });

            if (!playersTabExists) {
                await this.login(username, password);
                await this.page.goto('https://gamepanel.hosthavoc.com/Service/Status/154520');
                
                const tabExists = await this.page.evaluate(() => {
                    return !!document.querySelector('li[aria-controls="tabStrip-1"]');
                });
                
                if (!tabExists) {
                    return {
                        players: [],
                        isServerEmpty: true,
                        message: 'Players tab not found, server may be offline'
                    };
                }
            }

            await this.page.click('li[aria-controls="tabStrip-1"]');
            
            try {
                await this.page.waitForFunction(() => {
                    const table = document.querySelector('#Players tbody[role="rowgroup"]');
                    const noRecords = document.querySelector('.k-grid-norecords');
                    return table !== null || noRecords !== null;
                }, { timeout: 15000 }); 

                const hasNoRecords = await this.page.evaluate(() => {
                    return !!document.querySelector('.k-grid-norecords');
                });

                if (hasNoRecords) {
                    return {
                        players: [],
                        isServerEmpty: true,
                        message: 'Server is empty'
                    };
                }

                const players = await this.page.evaluate(() => {
                    const rows = document.querySelectorAll('#Players tbody[role="rowgroup"] tr.k-master-row');
                    return Array.from(rows, row => {
                        const cells = row.querySelectorAll('td[role="gridcell"]');
                        return {
                            name: cells[0]?.textContent?.trim() || '',
                            score: parseInt(cells[1]?.textContent?.trim() || '0', 10)
                        };
                    }).filter(p => p.name !== '');
                });

                return {
                    players,
                    isServerEmpty: players.length === 0,
                    message: players.length > 0 ? 'Players found online' : 'Server is empty'
                };

            } catch (error) {
                return {
                    players: [],
                    isServerEmpty: true,
                    message: 'Server appears to be empty'
                };
            }
        } catch (error) {
            try {
                await this.login(username, password);
                await this.page.goto('https://gamepanel.hosthavoc.com/Service/Status/154520');
                return await this.scrapePlayerData(username, password);
            } catch (retryError) {
                throw error;
            }
        }
    }

    async cleanup(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
}