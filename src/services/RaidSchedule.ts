import { TimeService } from './TimeService';

export interface RaidTime {
    dayOfWeek: number; // 0 = Sunday, 4 = Thursday
    hour: number;
    minute: number;
    durationMinutes: number;
}

export class RaidSchedule {
    private static RAID_TIMES: RaidTime[] = [
        { dayOfWeek: 4, hour: 2, minute: 0, durationMinutes: 180 },  // Thursday 2 AM GMT
        { dayOfWeek: 0, hour: 2, minute: 0, durationMinutes: 180 }   // Sunday 2 AM GMT
    ];

    static isRaidTime(date: Date = TimeService.getCurrentGMTTime()): boolean {
        const gmtDate = TimeService.toGMTTime(date);
        const day = gmtDate.getDay();
        const hour = gmtDate.getHours();
        const minute = gmtDate.getMinutes();
        
        // Log raid time check details for debugging
        console.log(`Raid check - Day: ${day} (0=Sun, 4=Thu), Hour: ${hour}, Minute: ${minute}`);
        
        const isRaid = this.RAID_TIMES.some(raid => {
            if (raid.dayOfWeek !== day) return false;
            
            const raidStartMinutes = (raid.hour * 60) + raid.minute;
            const currentMinutes = (hour * 60) + minute;
            const isInRaidWindow = currentMinutes >= raidStartMinutes && 
                   currentMinutes < (raidStartMinutes + raid.durationMinutes);
                   
            if (raid.dayOfWeek === day) {
                console.log(`Raid window for day ${day}: ${isInRaidWindow ? "ACTIVE" : "not active"} - Starts at ${raid.hour}:${raid.minute.toString().padStart(2, '0')}, Duration: ${raid.durationMinutes} minutes`);
            }
            
            return isInRaidWindow;
        });
        
        if (isRaid) {
            console.log("⚠️ RAID TIME DETECTED! Raid tracking is active.");
        }
        
        return isRaid;
    }

    static getRaidType(date: Date = TimeService.getCurrentGMTTime()): 'WED' | 'SAT' | null {
        const gmtDate = TimeService.toGMTTime(date);
        const day = gmtDate.getDay();
        // Map Thursday (4) GMT raids to Wednesday (WED) and Sunday (0) GMT raids to Saturday (SAT)
        // This keeps the EST day labels while the actual time calculations use GMT
        return day === 4 ? 'WED' : day === 0 ? 'SAT' : null;
    }
}