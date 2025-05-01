const { spawn } = require('child_process');
const { execSync } = require('child_process');
const path = require('path');

let appStartResolve;
const appStartPromise = new Promise((resolve, reject) => {
  appStartResolve = resolve;
});

// Function to start the Flask app
function startApp() {
  console.log('Starting Flask application...');
  
  // Run the app in a separate process
  // Adjust the command based on how your app is normally started
  const appProcess = spawn('flask run', {
    env: {
      FLASK_ENV: 'development',
      FLASK_APP: 'app.py',
      FLASK_DEBUG: '1',
      PREVENT_LLM_CALLS: 'true'
    },
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
    shell: true
  });

  // Log output from the app
  appProcess.stdout.on('data', (data) => {
    console.log("App stdout: ", data.toString());
    if (data.includes('Running on')) {
      console.log("App started");
      appStartResolve();
    }
  });

  appProcess.stderr.on('data', (data) => {
    console.log("App stderr: ", data.toString());
    if (data.includes('Running on')) {
      console.log("App started");
      appStartResolve();
    }
  });

  // Return the process so we can kill it later
  return appProcess;
}

// Function to start the UI development server
function startUiServer() {
  console.log('Starting UI development server...');
  
  // Run npm start in the UI directory
  const uiProcess = spawn('npm start', {
    cwd: path.join(__dirname, '../ui'),
    stdio: 'pipe',
    shell: true
  });

  // Return the process so we can kill it later
  return uiProcess;
}

// Main function
async function main() {
  // Start the Flask app
  const appProcess = startApp();
  
  // Start the UI server
  const uiProcess = startUiServer();
  
  // Give the processes some time to start
  console.log('Waiting for services to start...');
  await appStartPromise;
  
  try {
    // Run the tests
    console.log('Running Playwright tests...');
    execSync('npm test', { 
      cwd: __dirname,
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error('Tests failed:', error);
  } finally {
    // Terminate the processes
    console.log('Terminating processes...');
    appProcess.kill();
    uiProcess.kill();
  }
}

// Run the main function
main().catch(console.error); 