import { DateTime } from 'luxon';

export class TimeService {
    private static readonly TIMEZONE = 'UTC';

    static getCurrentGMTTime(): Date {
        return DateTime.now().setZone(this.TIMEZONE).toJSDate();
    }

    static toGMTTime(date: Date | number): Date {
        const inputDate = typeof date === 'number' ? DateTime.fromMillis(date) : DateTime.fromJSDate(date);
        return inputDate.setZone(this.TIMEZONE).toJSDate();
    }

    static getGMTTimestamp(): number {
        return DateTime.now().setZone(this.TIMEZONE).toMillis();
    }

    static getDayStartGMT(): number {
        return DateTime.now()
            .setZone(this.TIMEZONE)
            .startOf('day')
            .toMillis();
    }

    static getMidnightNextDayGMT(): Date {
        return DateTime.now()
            .setZone(this.TIMEZONE)
            .plus({ days: 1 })
            .startOf('day')
            .toJSDate();
    }

    static formatGMTTime(date: Date | number): string {
        const inputDate = typeof date === 'number' ? DateTime.fromMillis(date) : DateTime.fromJSDate(date);
        return inputDate
            .setZone(this.TIMEZONE)
            .toFormat('MM/dd/yyyy, hh:mm:ss a ZZZZ');
    }

    // Keeping these methods for backward compatibility, but they now use GMT
    static getCurrentESTTime = TimeService.getCurrentGMTTime;
    static toESTTime = TimeService.toGMTTime;
    static getESTTimestamp = TimeService.getGMTTimestamp;
    static getDayStartEST = TimeService.getDayStartGMT;
    static getMidnightNextDayEST = TimeService.getMidnightNextDayGMT;
    static formatESTTime = TimeService.formatGMTTime;
}