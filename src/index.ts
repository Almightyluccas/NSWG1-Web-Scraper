import { GamePanelScraper } from './services/scraper';
import { ConsolePlayerTracker } from './services/PlayerTracker';
import { DatabaseInitializer } from './services/Database/DatabaseInitializer';
import { DbConnectionManager } from './services/Database/DbConnectionManager';
import { DatabaseService } from './services/Database/DatabaseService';
import { EncryptionService } from './services/EncryptionService';
import { TimeService } from './services/TimeService';
import { loadConfig } from './config/config';
import { PlayerInfo } from './types';

async function cleanup() {
    console.log('Application shutdown initiated...');
    try {
        const dbManager = DbConnectionManager.getInstance();
        await dbManager.end();
        DbConnectionManager.destroyInstance();
        console.log('Cleanup completed successfully');
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
    process.exit();
}

async function startMonitoring() {
    try {
        const config = loadConfig();

        const dbInitializer = new DatabaseInitializer(config.database);
        await dbInitializer.initialize();

        const dbManager = DbConnectionManager.getInstance(config.database);
        const encryption = new EncryptionService(config.encryption);
        const dbService = new DatabaseService(dbManager, encryption);
        
        const playerTracker = new ConsolePlayerTracker(dbService);
        const scraper = new GamePanelScraper(true, dbService);

        // Register cleanup handlers
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('uncaughtException', async (error) => {
            console.error('Uncaught exception:', error);
            await cleanup();
        });
        process.on('unhandledRejection', async (error) => {
            console.error('Unhandled rejection:', error);
            await cleanup();
        });

        await scraper.initialize(config.username, config.password);

        let previousPlayers = new Set<string>();

        while (true) {
            try {
                const result = await scraper.scrapePlayerData(config.username, config.password);
                const playerNames = result.isServerEmpty ? [] : result.players.map((p: PlayerInfo) => p.name);
                
                const currentPlayers = new Set(playerNames);
                const hasChanges = playerNames.length !== previousPlayers.size || 
                    [...currentPlayers].some(player => !previousPlayers.has(player)) ||
                    [...previousPlayers].some(player => !currentPlayers.has(player));

                await playerTracker.processNewPlayers(playerNames);
                
                if (hasChanges) {
                    previousPlayers = currentPlayers;
                }

                if (result.isServerEmpty) {
                    console.log(`\n${result.message} - ${TimeService.formatESTTime(TimeService.getCurrentESTTime())}`);
                }

                await new Promise(resolve => setTimeout(resolve, config.refreshInterval));
            } catch (error) {
                console.error('An error occurred during monitoring:', error);
                // Add short delay before retry to avoid rapid connection attempts
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    } catch (error) {
        console.error('Fatal error:', error);
        await cleanup();
    }
}

console.log('Starting player monitoring...');
startMonitoring().catch(async (error) => {
    console.error('Fatal error in startMonitoring:', error);
    await cleanup();
});