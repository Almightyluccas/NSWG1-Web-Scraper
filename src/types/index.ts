export interface ExampleType {
    id: number;
    name: string;
    description?: string;
}

export type ExampleArray = ExampleType[];

export interface PlayerInfo {
    name: string;
    score: number;
}

export interface PlayerData {
    players: PlayerInfo[];
    isServerEmpty: boolean;
    message: string;
}

export interface PlayerTracker {
    processNewPlayers(players: string[]): Promise<void>;
    reset(): Promise<void>;
}

export interface Session {
    id?: number;
    cookies: string;
    created_at: number;
}

export interface Player {
    name: string;
    is_active_raider: boolean;
}

export interface DailyActivity {
    date: number;
    player: string;
    session_start: number;
    session_end: number;
    minutes: number;
}

export interface RaidActivity {
    date: number;
    player: string;
    minutes: number;
    raid_type: RaidType;
    status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
}

export type RaidType = 'THU' | 'SUN';