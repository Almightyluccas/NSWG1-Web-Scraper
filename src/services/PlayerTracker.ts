import { PlayerTracker } from '../types';
import { DatabaseService } from './DatabaseService';
import { RaidSchedule } from './RaidSchedule';
import { TimeService } from './TimeService';

export class ConsolePlayerTracker implements PlayerTracker {
    private activeSessions = new Map<string, number>();
    private raidSessions = new Map<string, number>();
    private processedSessions = new Set<string>();

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

    private getSessionKey(player: string, dayStart: number, sessionStart: number): string {
        return `${player}-${dayStart}-${sessionStart}`;
    }

    private async recordPlayerActivity(player: string, sessionStart: number, now: Date): Promise<void> {
        const dayStart = TimeService.getDayStartEST();
        const sessionKey = this.getSessionKey(player, dayStart, sessionStart);
        
        if (this.processedSessions.has(sessionKey)) {
            console.log(`[TRACKER] Skipping already processed session: ${sessionKey}`);
            return;
        }

        console.log(`[TRACKER] Recording new session: ${sessionKey}`);
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

        this.processedSessions.add(sessionKey);
    }

    async processNewPlayers(players: string[]): Promise<void> {
        const now = TimeService.getCurrentESTTime();
        const currentPlayers = new Set(players);
        const dayStart = TimeService.getDayStartEST();

        for (const [player, sessionStart] of this.activeSessions.entries()) {
            if (!currentPlayers.has(player)) {
                const sessionKey = this.getSessionKey(player, dayStart, sessionStart);
                console.log(`[TRACKER] Player ${player} left, session key: ${sessionKey}`);
                await this.recordPlayerActivity(player, sessionStart, now);
                this.activeSessions.delete(player);
            }
        }

        for (const player of players) {
            if (!this.activeSessions.has(player)) {
                await this.dbService.putPlayer({
                    name: player,
                    is_active_raider: false
                });
                
                this.activeSessions.set(player, now.getTime());
                console.log(`[TRACKER] New session started for ${player} at ${TimeService.formatESTTime(now)}`);
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
        
        const promises = Array.from(this.activeSessions.entries()).map(async ([player, sessionStart]) => {
            await this.recordPlayerActivity(player, sessionStart, now);
        });

        await Promise.all(promises);

        this.activeSessions.clear();
        this.raidSessions.clear();
        this.processedSessions.clear();
    }
}