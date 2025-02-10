import { GamePanelScraper } from './services/scraper';
import { ConsolePlayerTracker } from './services/PlayerTracker';
import { DatabaseInitializer } from './services/DatabaseInitializer';
import { DbConnectionManager } from './services/DbConnectionManager';
import { DatabaseService } from './services/DatabaseService';
import { EncryptionService } from './services/EncryptionService';
import { TimeService } from './services/TimeService';
import { loadConfig } from './config/config';
import { PlayerInfo } from './types';

async function startMonitoring() {
    try {
        const config = loadConfig();

        const dbInitializer = new DatabaseInitializer(config.database);
        await dbInitializer.initialize();

        const dbManager = new DbConnectionManager(config.database);
        const encryption = new EncryptionService(config.encryption);
        const dbService = new DatabaseService(dbManager, encryption);
        
        const playerTracker = new ConsolePlayerTracker(dbService);
        const scraper = new GamePanelScraper(true, dbService);
        
        const cleanup = async () => {
            console.log('Cleaning up...');
            await playerTracker.processNewPlayers([]); 
            await scraper.cleanup();
            await dbService.close();
            process.exit();
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);

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

                // Always call processNewPlayers, regardless of changes
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
                await new Promise(resolve => setTimeout(resolve, config.refreshInterval));
            }
        }
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

console.log('Starting player monitoring...');
startMonitoring();