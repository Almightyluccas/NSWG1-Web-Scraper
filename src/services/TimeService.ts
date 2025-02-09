import { DateTime } from 'luxon';

export class TimeService {
    private static readonly TIMEZONE = 'America/New_York';

    static getCurrentESTTime(): Date {
        return DateTime.now().setZone(this.TIMEZONE).toJSDate();
    }

    static toESTTime(date: Date | number): Date {
        const inputDate = typeof date === 'number' ? DateTime.fromMillis(date) : DateTime.fromJSDate(date);
        return inputDate.setZone(this.TIMEZONE).toJSDate();
    }

    static getESTTimestamp(): number {
        return DateTime.now().setZone(this.TIMEZONE).toMillis();
    }

    static getDayStartEST(): number {
        return DateTime.now()
            .setZone(this.TIMEZONE)
            .startOf('day')
            .toMillis();
    }

    static getMidnightNextDayEST(): Date {
        return DateTime.now()
            .setZone(this.TIMEZONE)
            .plus({ days: 1 })
            .startOf('day')
            .toJSDate();
    }

    static formatESTTime(date: Date | number): string {
        const inputDate = typeof date === 'number' ? DateTime.fromMillis(date) : DateTime.fromJSDate(date);
        return inputDate
            .setZone(this.TIMEZONE)
            .toFormat('MM/dd/yyyy, hh:mm:ss a ZZZZ');
    }
}