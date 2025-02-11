import { PlayerTracker } from '../types';
import { DatabaseService } from './Database/DatabaseService';
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
            status: raidMinutes > 15 ? 'PRESENT' : 'ABSENT'  // Changed to log any attendance
        });
    }

    private async recordPlayerActivity(player: string, sessionStart: number, now: Date): Promise<void> {
        const sessionKey = `${player}-${sessionStart}`;
        if (this.processedSessions.has(sessionKey)) {
            return;
        }

        const dayStart = TimeService.getDayStartEST();
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
        const isRaidTime = RaidSchedule.isRaidTime(now);
        const raidType = RaidSchedule.getRaidType(now);

        if (isRaidTime && raidType) {
            console.log('\n========================================');
            console.log(`🎮 RAID TIME: ${raidType} RAID IN PROGRESS 🎮`);
            console.log(`Time: ${TimeService.formatESTTime(now)}`);
            console.log('========================================\n');
        }

        for (const [player, sessionStart] of this.activeSessions.entries()) {
            if (!currentPlayers.has(player)) {
                const sessionMinutes = Math.floor((now.getTime() - sessionStart) / 60000);
                console.log(`Player ${player} left after ${sessionMinutes} minutes`);
                if (isRaidTime) {
                    console.log(`📝 Recording raid attendance for ${player}`);
                }
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
                console.log(`New session started for ${player} at ${TimeService.formatESTTime(now)}`);
                if (isRaidTime) {
                    console.log(`📝 Starting raid attendance tracking for ${player}`);
                }
            }
        }

        console.log(`\nStatus check at ${TimeService.formatESTTime(now)}`);
        if (players.length === 0) {
            console.log('Server is empty');
        } else {
            console.log(`Server has ${players.length} player${players.length > 1 ? 's' : ''} online:`);
            if (isRaidTime) {
                console.log(`🎮 ${raidType} RAID IN PROGRESS 🎮`);
            }
            players.forEach(player => console.log(`- ${player}`));
        }
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