# Game Server Monitor

A TypeScript application that provides real-time monitoring and analytics for game server activity. Built with modern web technologies and professional software practices.

## Project Overview

This application showcases:
- TypeScript and Object-Oriented Programming
- Automated web scraping with Puppeteer
- Real-time data monitoring and processing
- Database integration
- Secure credential management
- Cloud deployment (Heroku)

### Key Features

- **Real-time Player Tracking**: Monitors player activity with precise session tracking
- **Raid Schedule Management**: Sophisticated scheduling system for managing raid events
- **Secure Data Handling**: 
  - AES encryption for sensitive data
  - Secure cookie management
  - Environment-based configuration
- **Persistent Data Storage**: MySQL database integration with proper connection pooling
- **Time Zone Management**: Robust handling of time zones using Luxon
- **Clean Code Structure**:
  - Service-based architecture
  - Dependency injection
  - Interface-driven design
  - Proper error handling and logging

## Technical Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Database**: MySQL
- **Key Libraries**:
  - Puppeteer for web automation
  - Luxon for time management
  - crypto-js for encryption
  - mysql2 for database connectivity

## Architecture

The application follows clean architecture principles with clear separation of concerns:

```
src/
  ├── config/        # Configuration management
  ├── services/      # Core business logic
  │   ├── Database services
  │   ├── Encryption
  │   ├── Player tracking
  │   └── Time management
  └── types/         # TypeScript type definitions
```

## Development

### Prerequisites
- Node.js 18.x
- npm 9.x
- MySQL database

### Local Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd NSWG1-Web-Scraper
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file with the following variables:
   ```
   HH_USERNAME=your_username
   HH_PASSWORD=your_password
   ENCRYPTION_KEY=your_encryption_key
   ENCRYPTION_IV=your_iv
   DB_HOST=your_db_host
   DB_PORT=3306
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   ```

4. Run in development mode:
   ```bash
   npm run dev
   ```

## Deployment

The application is configured for deployment on Heroku with:
- Automatic deployment from main branch
- Worker dyno configuration
- Custom buildpacks for Puppeteer support
- Environment variable management

### Features in Detail

#### Player Activity Monitoring
- Real-time session tracking
- Automatic disconnection detection
- Session duration calculation
- Activity analytics

#### Raid Management
- Configurable raid schedules
- Attendance tracking
- Participation metrics
- Automatic status updates

#### Data Security
- AES-CBC encryption
- Secure session management
- Environment-based configuration
- Protected credential handling

## Future Enhancements

- GraphQL API integration
- Real-time notifications
- Enhanced analytics dashboard
- Performance metrics
- Player statistics visualization
