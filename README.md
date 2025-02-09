# my-typescript-project/README.md

# My TypeScript Project

This project is a TypeScript application that demonstrates the use of TypeScript for building robust and type-safe applications.

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd my-typescript-project
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile the TypeScript files:**
   ```bash
   npx tsc
   ```

4. **Run the application:**
   ```bash
   node dist/index.js
   ```

## Usage

- The entry point of the application is located in `src/index.ts`.
- Type definitions and interfaces can be found in `src/types/index.ts`.
- Unit tests are located in the `tests` directory and can be run using your preferred testing framework.

## Deployment to Heroku

### Prerequisites
- A Heroku account
- The repository connected to GitHub

### Steps to Deploy

1. Create a new Heroku app
2. Connect your GitHub repository to Heroku
3. Enable automatic deploys from your main/master branch
4. Add the following buildpacks in this exact order:
   - `https://github.com/jontewks/puppeteer-heroku-buildpack`
   - `heroku/nodejs`

### Environment Variables

Set these environment variables in your Heroku app settings:

- `HH_USERNAME`: Game panel username
- `HH_PASSWORD`: Game panel password
- `ENCRYPTION_KEY`: Key for encrypting cookies
- `ENCRYPTION_IV`: IV for encryption
- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name

### Post-Deployment

After deploying:
1. Make sure to use a "worker" dyno instead of a "web" dyno
2. Scale down the web dyno: `heroku ps:scale web=0`
3. Scale up the worker dyno: `heroku ps:scale worker=1`

## Development

### Local Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the required environment variables
4. Run in development mode:
   ```bash
   npm run dev
   ```

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes.