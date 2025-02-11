import { TimeService } from './TimeService';

export interface RaidTime {
    dayOfWeek: number; // 0 = Sunday, 3 = Wednesday, 6 = Saturday
    hour: number;
    minute: number;
    durationMinutes: number;
}

export class RaidSchedule {
    private static RAID_TIMES: RaidTime[] = [
        { dayOfWeek: 2, hour: 6, minute: 35, durationMinutes: 30 },  // Tuesday 6:35 AM EST
        { dayOfWeek: 3, hour: 21, minute: 0, durationMinutes: 30 },  // Wednesday 9 PM EST
        { dayOfWeek: 6, hour: 21, minute: 0, durationMinutes: 30 }   // Saturday 9 PM EST
    ];

    static isRaidTime(date: Date = TimeService.getCurrentESTTime()): boolean {
        const estDate = TimeService.toESTTime(date);
        const day = estDate.getDay();
        const hour = estDate.getHours();
        const minute = estDate.getMinutes();

        return this.RAID_TIMES.some(raid => {
            if (raid.dayOfWeek !== day) return false;
            
            const raidStartMinutes = (raid.hour * 60) + raid.minute;
            const currentMinutes = (hour * 60) + minute;
            
            return currentMinutes >= raidStartMinutes && 
                   currentMinutes < (raidStartMinutes + raid.durationMinutes);
        });
    }

    static getRaidType(date: Date = TimeService.getCurrentESTTime()): 'TUE' | 'WED' | 'SAT' | null {
        const estDate = TimeService.toESTTime(date);
        const day = estDate.getDay();
        return day === 2 ? 'TUE' : day === 3 ? 'WED' : day === 6 ? 'SAT' : null;
    }
}