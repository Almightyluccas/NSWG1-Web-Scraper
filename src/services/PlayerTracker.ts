import { PlayerTracker } from '../types';
import { DatabaseService } from './DatabaseService';
import { RaidSchedule } from './RaidSchedule';
import { TimeService } from './TimeService';

export class ConsolePlayerTracker implements PlayerTracker {
    private activeSessions = new Map<string, number>();
    private raidSessions = new Map<string, number>();

    constructor(private dbService: DatabaseService) {
        this.setupMidnightReset();
    }

    private setupMidnightReset() {
        const nextMidnight = TimeService.getMidnightNextDayEST();
        const timeUntilMidnight = nextMidnight.getTime() - TimeService.getCurrentESTTime().getTime();

        setTimeout(() => {
            this.reset();
            this.setupMidnightReset();
        }, timeUntilMidnight);
    }

    private async updateRaidActivity(player: string, now: Date): Promise<void> {
        const raidType = RaidSchedule.getRaidType(now);
        if (!raidType) return;

        const dayStart = TimeService.getDayStartEST();
        let raidMinutes = this.raidSessions.get(player) || 0;
        const sessionLength = Math.floor((now.getTime() - (this.activeSessions.get(player) || now.getTime())) / 60000);
        raidMinutes += sessionLength;

        this.raidSessions.set(player, raidMinutes);

        await this.dbService.putRaidActivity({
            date: dayStart,
            player,
            minutes: raidMinutes,
            raid_type: raidType,
            status: raidMinutes >= 90 ? 'PRESENT' : 'ABSENT'
        });
    }

    async processNewPlayers(players: string[]): Promise<void> {
        const now = TimeService.getCurrentESTTime();
        const currentPlayers = new Set(players);
        const dayStart = TimeService.getDayStartEST();

        // Handle players who left
        for (const [player, sessionStart] of this.activeSessions.entries()) {
            if (!currentPlayers.has(player)) {
                const minutes = Math.floor((now.getTime() - sessionStart) / 60000);
                console.log(`Player ${player} left after ${minutes} minutes`);
                
                await this.dbService.putDailyActivity({
                    date: dayStart,
                    player,
                    session_start: sessionStart,
                    session_end: now.getTime(),
                    minutes: minutes
                });

                // Update raid activity if they were in a raid
                if (RaidSchedule.isRaidTime(now)) {
                    await this.updateRaidActivity(player, now);
                }

                this.activeSessions.delete(player);
            }
        }

        // Track new players joining
        for (const player of players) {
            if (!this.activeSessions.has(player)) {
                // Add new player if not exists
                await this.dbService.putPlayer({
                    name: player,
                    is_active_raider: false
                });
                
                // Start new session
                this.activeSessions.set(player, now.getTime());
                console.log(`New session started for ${player} at ${TimeService.formatESTTime(now)}`);
            }
        }

        console.log('\nCurrent players:', TimeService.formatESTTime(now));
        if (RaidSchedule.isRaidTime(now)) {
            console.log('🎮 RAID IN PROGRESS 🎮');
        }
        players.forEach(player => console.log(`- ${player}`));
    }

    async reset(): Promise<void> {
        const now = TimeService.getCurrentESTTime();
        const dayStart = TimeService.getDayStartEST();

        // End all active sessions
        const promises = Array.from(this.activeSessions.entries()).map(async ([player, sessionStart]) => {
            const minutes = Math.floor((now.getTime() - sessionStart) / 60000);
            await this.dbService.putDailyActivity({
                date: dayStart,
                player,
                session_start: sessionStart,
                session_end: now.getTime(),
                minutes: minutes
            });

            if (RaidSchedule.isRaidTime(now)) {
                await this.updateRaidActivity(player, now);
            }
        });

        await Promise.all(promises);
        this.activeSessions.clear();
        this.raidSessions.clear();
    }
}