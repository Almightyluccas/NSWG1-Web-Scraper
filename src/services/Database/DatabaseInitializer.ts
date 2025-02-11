import mysql from 'mysql2/promise';
import { DatabaseConfig } from '../../config/config';

export class DatabaseInitializer {
    constructor(private dbConfig: DatabaseConfig) {}

    private async tableExists(conn: mysql.Connection, tableName: string): Promise<boolean> {
        const [rows] = await conn.query(
            'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
            [this.dbConfig.database, tableName]
        );
        return (rows as any)[0].count > 0;
    }

    public async initialize(): Promise<void> {
        let conn: mysql.Connection | undefined;
        
        try {
            conn = await mysql.createConnection({
                host: this.dbConfig.host,
                port: this.dbConfig.port,
                user: this.dbConfig.user,
                password: this.dbConfig.password,
                database: this.dbConfig.database
            });

            const tables = ['Players', 'Sessions', 'DailyActivity', 'RaidActivity'];
            for (const table of tables) {
                const exists = await this.tableExists(conn, table);
                console.log(`Table ${table}: ${exists ? 'Already exists' : 'Will be created'}`);
            }

            await conn.query('SET FOREIGN_KEY_CHECKS = 1');
            await conn.query('SET time_zone = "America/New_York"'); 

            await conn.query(`
                CREATE TABLE IF NOT EXISTS Players (
                    name VARCHAR(255) PRIMARY KEY,
                    is_active_raider BOOLEAN DEFAULT FALSE
                )
            `);

            await conn.query(`
                CREATE TABLE IF NOT EXISTS Sessions (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    cookies TEXT NOT NULL,
                    created_at BIGINT NOT NULL COMMENT 'Eastern Time (EST/EDT) Timestamp in milliseconds',
                    INDEX created_at_idx (created_at)
                )
            `);

            await conn.query(`
                CREATE TABLE IF NOT EXISTS DailyActivity (
                    date BIGINT NOT NULL COMMENT 'Eastern Time (EST/EDT) Date at midnight in milliseconds',
                    player VARCHAR(255) NOT NULL,
                    session_start BIGINT NOT NULL COMMENT 'Eastern Time (EST/EDT) Session start timestamp in milliseconds',
                    session_end BIGINT NOT NULL COMMENT 'Eastern Time (EST/EDT) Session end timestamp in milliseconds',
                    minutes INT NOT NULL COMMENT 'Duration in minutes',
                    PRIMARY KEY (date, player, session_start),
                    FOREIGN KEY (player) REFERENCES Players(name) ON DELETE CASCADE,
                    INDEX player_idx (player),
                    INDEX date_idx (date) COMMENT 'For date range queries'
                )
            `);

            await conn.query(`
                CREATE TABLE IF NOT EXISTS RaidActivity (
                    date BIGINT NOT NULL COMMENT 'Eastern Time (EST/EDT) Date at midnight in milliseconds',
                    player VARCHAR(255) NOT NULL,
                    minutes INT NOT NULL COMMENT 'Duration in minutes',
                    raid_type ENUM('TUE', 'WED', 'SAT') NOT NULL COMMENT 'Raid day in Eastern Time',
                    status ENUM('PRESENT', 'ABSENT', 'EXCUSED') NOT NULL,
                    PRIMARY KEY (date, player),
                    FOREIGN KEY (player) REFERENCES Players(name) ON DELETE CASCADE,
                    INDEX player_idx (player),
                    INDEX date_idx (date) COMMENT 'For date range queries'
                )
            `);

            const [timeZoneResult] = await conn.query('SELECT @@session.time_zone, @@system_time_zone');
            console.log('Database timezone configuration:', {
                session: (timeZoneResult as any)[0]['@@session.time_zone'],
                system: (timeZoneResult as any)[0]['@@system_time_zone']
            });

            console.log('Database initialization completed with Eastern Time zone configuration');
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        } finally {
            if (conn) {
                await conn.end();
            }
        }
    }
}